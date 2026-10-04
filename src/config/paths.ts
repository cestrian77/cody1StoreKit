import path from "node:path";
import { fileURLToPath } from "node:url";

function moduleDirectory(): string {
  const metaUrl =
    typeof import.meta !== "undefined" ? import.meta.url : undefined;
  if (metaUrl) {
    return path.dirname(fileURLToPath(metaUrl));
  }
  // Electron main is bundled as CJS — import.meta.url is empty there.
  return path.dirname(__filename);
}

const __dirname = moduleDirectory();

/** Repo root in dev; user workspace when running the packaged desktop app. */
export function getProjectRoot(): string {
  return process.env.CODY1_STOREKIT_ROOT ?? path.resolve(__dirname, "../..");
}

export function appRoot(appId: string): string {
  return path.join(getProjectRoot(), "apps", appId);
}

export function appConfigPath(appId: string): string {
  return path.join(appRoot(appId), "app.config.ts");
}

export function screenshotsRawDir(appId: string): string {
  return path.join(appRoot(appId), "screenshots", "raw");
}

export function localesDir(appId: string): string {
  return path.join(appRoot(appId), "locales");
}

export function outputDir(appId: string): string {
  return path.join(appRoot(appId), "output");
}

export function placeholderManifestPath(appId: string): string {
  return path.join(appRoot(appId), ".cody1storekit-placeholders.json");
}

/** @deprecated use getProjectRoot() */
export const PROJECT_ROOT = getProjectRoot();

export const STOREKIT_VERSION = "1.0.0";
