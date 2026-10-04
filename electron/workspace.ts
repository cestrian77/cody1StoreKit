import fs from "node:fs/promises";
import path from "node:path";
import type { app as ElectronApp } from "electron";
import { syncAllWorkspaceAppsFromSeed } from "../src/config/sync-seed-assets.js";

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function copyDir(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(from, to);
    } else {
      await fs.copyFile(from, to);
    }
  }
}

async function readConfigObjectFromTsFile(
  tsPath: string,
): Promise<unknown | null> {
  try {
    const raw = await fs.readFile(tsPath, "utf-8");
    const match = raw.match(/export default (\{[\s\S]*\});?\s*$/);
    if (!match) return null;
    return JSON.parse(match[1]) as unknown;
  } catch {
    return null;
  }
}

async function ensureAppConfigJson(
  appDir: string,
  appId: string,
  seedAppsRoot?: string,
): Promise<void> {
  const jsonPath = path.join(appDir, "app.config.json");
  if (await pathExists(jsonPath)) {
    try {
      const stat = await fs.stat(jsonPath);
      if (stat.isFile() && stat.size > 0) return;
    } catch {
      /* recreate below */
    }
  }

  const tsPath = path.join(appDir, "app.config.ts");
  const seedJson = seedAppsRoot
    ? path.join(seedAppsRoot, appId, "app.config.json")
    : null;
  if (seedJson && (await pathExists(seedJson))) {
    await fs.copyFile(seedJson, jsonPath);
    return;
  }

  if (await pathExists(tsPath)) {
    const fromTs = await readConfigObjectFromTsFile(tsPath);
    if (fromTs && typeof fromTs === "object") {
      await fs.writeFile(jsonPath, JSON.stringify(fromTs, null, 2), "utf-8");
    }
  }
}

/**
 * Packaged app: writable workspace under Application Support.
 * Dev (unpackaged): use the git repo so apps/ stays in the project.
 */
export async function resolveWorkspaceRoot(
  electronApp: ElectronApp,
  repoRoot: string,
): Promise<string> {
  if (!electronApp.isPackaged) {
    return repoRoot;
  }

  const workspace = electronApp.getPath("userData");
  const appsDir = path.join(workspace, "apps");
  if (!(await pathExists(appsDir))) {
    const seedRoot = path.join(process.resourcesPath, "seed-apps");
    if (await pathExists(seedRoot)) {
      await fs.mkdir(appsDir, { recursive: true });
      const seeds = await fs.readdir(seedRoot, { withFileTypes: true });
      for (const entry of seeds) {
        if (!entry.isDirectory()) continue;
        await copyDir(
          path.join(seedRoot, entry.name),
          path.join(appsDir, entry.name),
        );
      }
    } else {
      await fs.mkdir(appsDir, { recursive: true });
    }
  }

  return workspace;
}

/** Ensure packaged workspaces have JSON configs (no TypeScript / jiti in production). */
export async function migrateWorkspaceConfigs(workspace: string): Promise<void> {
  const appsDir = path.join(workspace, "apps");
  if (!(await pathExists(appsDir))) return;

  const seedRoot = path.join(process.resourcesPath, "seed-apps");
  const seedAppsRoot = (await pathExists(seedRoot)) ? seedRoot : undefined;

  await syncAllWorkspaceAppsFromSeed(workspace, seedAppsRoot);

  const entries = await fs.readdir(appsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    await ensureAppConfigJson(
      path.join(appsDir, entry.name),
      entry.name,
      seedAppsRoot,
    );
  }
}
