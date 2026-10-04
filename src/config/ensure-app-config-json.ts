import fs from "node:fs/promises";
import path from "node:path";
import { AppConfigSchema } from "../schemas/app-config.js";
import { appRoot } from "./paths.js";

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/** Read `export default { ... }` from app.config.ts without executing TypeScript. */
export async function readConfigObjectFromTsFile(
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

export interface EnsureAppConfigJsonOptions {
  /** Packaged app seed-apps directory (Resources/seed-apps). */
  seedAppsRoot?: string;
}

/**
 * Ensure apps/{id}/app.config.json exists (copy from seed or parse app.config.ts).
 * Returns true when JSON is present and readable after this call.
 */
export async function ensureAppConfigJson(
  appId: string,
  options?: EnsureAppConfigJsonOptions,
): Promise<boolean> {
  const jsonPath = path.join(appRoot(appId), "app.config.json");
  if (await pathExists(jsonPath)) {
    try {
      const stat = await fs.stat(jsonPath);
      if (stat.isFile() && stat.size > 0) return true;
    } catch {
      /* fall through and recreate */
    }
  }

  const tsPath = path.join(appRoot(appId), "app.config.ts");
  await fs.mkdir(appRoot(appId), { recursive: true });

  const seedJson = options?.seedAppsRoot
    ? path.join(options.seedAppsRoot, appId, "app.config.json")
    : null;
  if (seedJson && (await pathExists(seedJson))) {
    await fs.copyFile(seedJson, jsonPath);
    return true;
  }

  if (await pathExists(tsPath)) {
    const fromTs = await readConfigObjectFromTsFile(tsPath);
    const parsed = AppConfigSchema.safeParse(fromTs);
    if (parsed.success) {
      await fs.writeFile(jsonPath, JSON.stringify(parsed.data, null, 2), "utf-8");
      return true;
    }
  }

  return await pathExists(jsonPath);
}

export async function ensureAllWorkspaceAppConfigs(
  workspace: string,
  seedAppsRoot?: string,
): Promise<void> {
  const appsDir = path.join(workspace, "apps");
  if (!(await pathExists(appsDir))) return;

  const prevRoot = process.env.CODY1_STOREKIT_ROOT;
  process.env.CODY1_STOREKIT_ROOT = workspace;
  try {
    const entries = await fs.readdir(appsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      await ensureAppConfigJson(entry.name, { seedAppsRoot });
    }
  } finally {
    if (prevRoot === undefined) delete process.env.CODY1_STOREKIT_ROOT;
    else process.env.CODY1_STOREKIT_ROOT = prevRoot;
  }
}
