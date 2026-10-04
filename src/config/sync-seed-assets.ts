import fs from "node:fs/promises";
import path from "node:path";
import { appRoot, getProjectRoot } from "./paths.js";

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/** Copy files and directories from seed that are missing in the workspace app folder. */
export async function mergeMissingFromSeed(
  seedAppDir: string,
  destAppDir: string,
): Promise<void> {
  if (!(await pathExists(seedAppDir))) return;

  const entries = await fs.readdir(seedAppDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === ".cody1storekit-placeholders.json") continue;
    const from = path.join(seedAppDir, entry.name);
    const to = path.join(destAppDir, entry.name);
    if (entry.isDirectory()) {
      await fs.mkdir(to, { recursive: true });
      await mergeMissingFromSeed(from, to);
    } else if (!(await pathExists(to))) {
      await fs.copyFile(from, to);
    }
  }
}

export function resolveSeedAppsRoot(): string | undefined {
  const fromEnv = process.env.STOREKIT_SEED_APPS_ROOT;
  if (fromEnv && fromEnv.length > 0) return fromEnv;
  if (process.env.STOREKIT_PACKAGED) return undefined;
  return path.join(getProjectRoot(), "apps");
}

export async function syncAppAssetsFromSeed(appId: string): Promise<void> {
  const seedRoot = resolveSeedAppsRoot();
  if (!seedRoot) return;
  const seedApp = path.join(seedRoot, appId);
  if (!(await pathExists(seedApp))) return;
  await mergeMissingFromSeed(seedApp, appRoot(appId));
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

export async function syncAllWorkspaceAppsFromSeed(
  workspace: string,
  seedAppsRoot?: string,
): Promise<void> {
  const seedRoot = seedAppsRoot ?? resolveSeedAppsRoot();
  if (!seedRoot || !(await pathExists(seedRoot))) return;

  const appsDir = path.join(workspace, "apps");
  await fs.mkdir(appsDir, { recursive: true });

  const prevRoot = process.env.CODY1_STOREKIT_ROOT;
  process.env.CODY1_STOREKIT_ROOT = workspace;
  try {
    const seedEntries = await fs.readdir(seedRoot, { withFileTypes: true });
    for (const entry of seedEntries) {
      if (!entry.isDirectory()) continue;
      const seedApp = path.join(seedRoot, entry.name);
      const destApp = path.join(appsDir, entry.name);
      if (!(await pathExists(destApp))) {
        await copyDir(seedApp, destApp);
      } else {
        await mergeMissingFromSeed(seedApp, destApp);
      }
    }
  } finally {
    if (prevRoot === undefined) delete process.env.CODY1_STOREKIT_ROOT;
    else process.env.CODY1_STOREKIT_ROOT = prevRoot;
  }
}
