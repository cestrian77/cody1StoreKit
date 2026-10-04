import { app, BrowserWindow, Menu, dialog, nativeImage, shell } from "electron";
import path from "node:path";
import { resolveWorkspaceRoot, migrateWorkspaceConfigs } from "./workspace.js";

let mainWindow: BrowserWindow | null = null;
let serverClose: (() => Promise<void>) | null = null;
let bootPromise: Promise<void> | null = null;

/** Window icon only (Linux/Windows). macOS Dock uses the app bundle .icns — never override at runtime. */
function windowIcon(): Electron.NativeImage | undefined {
  if (process.platform === "darwin") return undefined;
  const icon = nativeImage.createFromPath(
    path.join(__dirname, "../build/icon.png"),
  );
  return icon.isEmpty() ? undefined : icon;
}

async function startApp(): Promise<void> {
  if (bootPromise) return bootPromise;

  bootPromise = (async () => {
    const repoRoot = path.join(__dirname, "..");
    const workspace = await resolveWorkspaceRoot(app, repoRoot);
    process.env.CODY1_STOREKIT_ROOT = workspace;
    if (app.isPackaged) {
      process.env.STOREKIT_PACKAGED = "1";
      process.env.STOREKIT_SEED_APPS_ROOT = path.join(
        process.resourcesPath,
        "seed-apps",
      );
    }

    await migrateWorkspaceConfigs(workspace);

    if (serverClose) {
      await serverClose().catch(() => undefined);
      serverClose = null;
    }

    const { startStandaloneServer } = await import(
      "../dist-server/standalone.js"
    );
    const staticDir = path.join(__dirname, "../dist-ui");
    const { port, close } = await startStandaloneServer({
      staticDir,
      host: "127.0.0.1",
    });
    serverClose = close;

    await waitForHealth(port);

    if (mainWindow && !mainWindow.isDestroyed()) {
      await mainWindow.loadURL(`http://127.0.0.1:${port}`);
      return;
    }

    mainWindow = new BrowserWindow({
      width: 1440,
      height: 920,
      minWidth: 1024,
      minHeight: 700,
      title: "Cody1StoreKit",
      icon: windowIcon(),
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    mainWindow.webContents.on(
      "did-fail-load",
      (_event, code, description, url) => {
        dialog.showErrorBox(
          "Cody1StoreKit failed to load",
          `${description} (${code})\n${url}`,
        );
      },
    );

    await mainWindow.loadURL(`http://127.0.0.1:${port}`);

    const menu = Menu.buildFromTemplate([
      {
        label: "Cody1StoreKit",
        submenu: [
          { role: "about" },
          { type: "separator" },
          {
            label: "Open Apps Folder",
            click: () => shell.openPath(path.join(workspace, "apps")),
          },
          {
            label: "Open Workspace",
            click: () => shell.openPath(workspace),
          },
          { type: "separator" },
          { role: "hide" },
          { role: "hideOthers" },
          { role: "quit" },
        ],
      },
      { role: "editMenu" },
      { role: "viewMenu" },
      { role: "windowMenu" },
    ]);
    Menu.setApplicationMenu(menu);

    mainWindow.on("closed", () => {
      mainWindow = null;
      bootPromise = null;
    });
  })();

  try {
    await bootPromise;
  } catch (e) {
    bootPromise = null;
    const message = e instanceof Error ? e.message : String(e);
    dialog.showErrorBox("Cody1StoreKit could not start", message);
    throw e;
  }
}

async function waitForHealth(port: number): Promise<void> {
  for (let i = 0; i < 80; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/health`);
      if (res.ok) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error(`Local server did not start on port ${port}`);
}

app.whenReady().then(() => startApp());

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    startApp().catch((e) => console.error(e));
  }
});

app.on("before-quit", () => {
  serverClose?.().catch(() => undefined);
});
