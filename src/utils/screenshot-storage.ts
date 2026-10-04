import { randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { loadAppConfig, saveAppConfig } from "../config/load-app.js";
import { screenshotsRawDir } from "../config/paths.js";
import { markScreenshotAsGenuine } from "./placeholders.js";

const MAX_BYTES = 25 * 1024 * 1024;

function sanitizeStem(name: string): string {
  const base = path.basename(name, path.extname(name));
  const cleaned = base
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return cleaned || "capture";
}

export function buildStoredScreenshotName(
  screenId: string | undefined,
  originalName?: string,
): string {
  const prefix = screenId ? sanitizeStem(screenId) : "asset";
  const stem = originalName ? sanitizeStem(originalName) : "capture";
  const nonce = randomBytes(4).toString("hex");
  return `${prefix}-${stem}-${nonce}.png`;
}

export async function storeAppScreenshot(
  appId: string,
  imageBuffer: Buffer,
  options: { screenId?: string; originalName?: string },
): Promise<{ filename: string; assignedScreenId?: string }> {
  if (imageBuffer.length > MAX_BYTES) {
    throw new Error("Screenshot exceeds 25 MB limit");
  }

  let png: Buffer;
  try {
    const meta = await sharp(imageBuffer).metadata();
    if (!meta.width || !meta.height) {
      throw new Error("Invalid image");
    }
    png = await sharp(imageBuffer).png().toBuffer();
  } catch {
    throw new Error("Upload must be a valid PNG or JPEG screenshot");
  }

  const filename = buildStoredScreenshotName(options.screenId, options.originalName);
  const dir = screenshotsRawDir(appId);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, filename), png);
  await markScreenshotAsGenuine(appId, filename);

  if (options.screenId) {
    const config = await loadAppConfig(appId);
    const screen = config.screens.find((s) => s.id === options.screenId);
    if (!screen) {
      throw new Error(`Screen not found: ${options.screenId}`);
    }
    const screens = config.screens.map((s) =>
      s.id === options.screenId ? { ...s, screenshot: filename } : s,
    );
    await saveAppConfig(appId, { ...config, screens });
    return { filename, assignedScreenId: options.screenId };
  }

  return { filename };
}
