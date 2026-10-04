import fs from "node:fs/promises";
import path from "node:path";
import type { AppConfig } from "../schemas/app-config.js";
import { screenshotsRawDir } from "../config/paths.js";
import {
  forceRestorePlaceholderScreenshot,
  readPlaceholderManifest,
  writePlaceholderManifest,
} from "./placeholders.js";

export function referencedScreenshotFilenames(config: AppConfig): Set<string> {
  return new Set(
    config.screens
      .map((s) => s.screenshot)
      .filter((f): f is string => Boolean(f)),
  );
}

export async function deleteScreenshotFile(
  appId: string,
  filename: string,
): Promise<void> {
  const safe = path.basename(filename);
  if (!safe || safe !== filename) return;
  try {
    await fs.unlink(path.join(screenshotsRawDir(appId), safe));
  } catch {
    /* already gone */
  }
  const manifest = await readPlaceholderManifest(appId);
  const files = manifest.files.filter((f) => f !== safe);
  const hashes = { ...(manifest.hashes ?? {}) };
  delete hashes[safe];
  await writePlaceholderManifest(appId, {
    files,
    hashes,
    updatedAt: new Date().toISOString(),
  });
}

/** Remove PNGs in screenshots/raw that no screen references. */
export async function deleteUnreferencedScreenshotFiles(
  appId: string,
  config: AppConfig,
): Promise<string[]> {
  const referenced = referencedScreenshotFilenames(config);
  const dir = screenshotsRawDir(appId);
  let files: string[] = [];
  try {
    files = await fs.readdir(dir);
  } catch {
    return [];
  }
  const removed: string[] = [];
  for (const file of files) {
    if (!file.toLowerCase().endsWith(".png")) continue;
    if (referenced.has(file)) continue;
    await deleteScreenshotFile(appId, file);
    removed.push(file);
  }
  return removed;
}

export async function restorePlaceholderScreenshotsForConfig(
  appId: string,
  config: AppConfig,
): Promise<void> {
  for (const screen of config.screens) {
    if (!screen.screenshot) continue;
    await forceRestorePlaceholderScreenshot(appId, screen.screenshot);
  }
}
