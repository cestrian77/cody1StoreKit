import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { loadAppConfig } from "../config/load-app.js";
import { outputDir, screenshotsRawDir } from "../config/paths.js";
import { loadLocale } from "../localisation/resolve.js";
import { getPreset } from "../presets/output-presets.js";
import {
  ensureDevScreenshots,
  formatPlaceholderError,
  isPlaceholderFile,
  readPlaceholderManifest,
} from "../utils/placeholders.js";
import { renderScreen, verifyPngDimensions } from "./render-screen.js";
import type { RenderSetOptions } from "./types.js";
import { buildContactSheet } from "./contact-sheet.js";
import { buildHtmlPreview } from "./html-preview.js";

export interface GeneratedFile {
  screenId: string;
  filename: string;
  path: string;
  width: number;
  height: number;
}

export interface RenderSetResult {
  files: GeneratedFile[];
  warnings: string[];
  outputDir: string;
}

function screenFilename(screenId: string): string {
  return `${screenId}.png`;
}

export async function renderSet(
  options: RenderSetOptions,
): Promise<RenderSetResult> {
  const app = await loadAppConfig(options.appId);
  const locale = await loadLocale(options.appId, options.locale);
  const preset = getPreset(options.presetId);
  const warnings: string[] = [];

  const requiredScreenshots = app.screens
    .filter((s) => s.screenshot)
    .map((s) => s.screenshot!);

  if (options.allowPlaceholders) {
    await ensureDevScreenshots(options.appId, requiredScreenshots);
  }

  const manifest = await readPlaceholderManifest(options.appId);
  const rawDir = screenshotsRawDir(options.appId);

  const screens = options.screenIds
    ? app.screens.filter((s) => options.screenIds!.includes(s.id))
    : app.screens;

  const outBase = path.join(
    outputDir(options.appId),
    options.locale,
    options.presetId,
  );
  await fs.mkdir(outBase, { recursive: true });

  const files: GeneratedFile[] = [];

  for (const screen of screens) {
    if (screen.screenshot) {
      const shotPath = path.join(rawDir, screen.screenshot);
      try {
        await fs.access(shotPath);
      } catch {
        throw new Error(
          formatPlaceholderError(
            options.appId,
            screen.screenshot,
            screen.id,
          ),
        );
      }
      if (
        !options.allowPlaceholders &&
        isPlaceholderFile(manifest, screen.screenshot)
      ) {
        throw new Error(
          formatPlaceholderError(
            options.appId,
            screen.screenshot,
            screen.id,
          ),
        );
      }
      try {
        await sharp(shotPath).metadata();
      } catch {
        throw new Error(
          `Screenshot could not be decoded: apps/${options.appId}/screenshots/raw/${screen.screenshot}`,
        );
      }
    }

    const result = await renderScreen({
      app,
      screen,
      locale,
      preset,
      screenshotPath: screen.screenshot
        ? path.join(rawDir, screen.screenshot)
        : "",
      previewScale: options.previewScale,
      allowPlaceholders: options.allowPlaceholders,
    });

    warnings.push(...result.warnings);

    let outBuffer = result.buffer;
    if (preset.flattenAlpha) {
      outBuffer = await sharp(outBuffer)
        .flatten({ background: "#ffffff" })
        .png()
        .toBuffer();
    }

    const filename = screenFilename(screen.id);
    const outPath = path.join(outBase, filename);
    await fs.writeFile(outPath, outBuffer);

    const expectedW = Math.round(
      preset.width * (options.previewScale ?? 1),
    );
    const expectedH = Math.round(
      preset.height * (options.previewScale ?? 1),
    );
    await verifyPngDimensions(outBuffer, expectedW, expectedH);

    if (outBuffer.length < 5000 && !options.allowPlaceholders) {
      throw new Error(
        `Output file suspiciously small for ${screen.id}: ${outPath}`,
      );
    }

    files.push({
      screenId: screen.id,
      filename,
      path: outPath,
      width: result.width,
      height: result.height,
    });
  }

  if (!options.previewScale || options.previewScale >= 1) {
    const previewDir = path.join(outputDir(options.appId), "previews");
    await fs.mkdir(previewDir, { recursive: true });
    const contactName = `${options.appId}-${options.locale}-${options.presetId}-contact-sheet.png`;
    await buildContactSheet(files, path.join(previewDir, contactName));
    await buildHtmlPreview({
      app,
      locale: options.locale,
      presetId: options.presetId,
      files,
      outputPath: path.join(previewDir, "index.html"),
    });
  }

  return { files, warnings, outputDir: outBase };
}
