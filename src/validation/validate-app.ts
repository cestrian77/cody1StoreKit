import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { loadAppConfig } from "../config/load-app.js";
import { screenshotsRawDir } from "../config/paths.js";
import {
  listLocales,
  loadLocale,
  resolveLocaleKey,
} from "../localisation/resolve.js";
import { getPreset, OUTPUT_PRESETS } from "../presets/output-presets.js";
import { BACKGROUND_PRESETS } from "../backgrounds/presets.js";
import {
  readPlaceholderManifest,
  isPlaceholderFile,
} from "../utils/placeholders.js";

export interface ValidationLine {
  ok: boolean;
  message: string;
}

export interface ValidationReport {
  appId: string;
  locale: string;
  presetId: string;
  lines: ValidationLine[];
  valid: boolean;
}

export async function validateApp(
  appId: string,
  locale: string,
  presetId: string,
  options?: { allowPlaceholders?: boolean },
): Promise<ValidationReport> {
  const lines: ValidationLine[] = [];
  const allowPh = options?.allowPlaceholders ?? false;

  let app;
  try {
    app = await loadAppConfig(appId);
    lines.push({ ok: true, message: "Configuration valid" });
  } catch (e) {
    lines.push({
      ok: false,
      message: e instanceof Error ? e.message : String(e),
    });
    return { appId, locale, presetId, lines, valid: false };
  }

  const locales = await listLocales(appId);
  if (!locales.includes(locale)) {
    lines.push({ ok: false, message: `Locale missing: ${locale}` });
  } else {
    lines.push({ ok: true, message: "Locale complete" });
  }

  let bundle;
  try {
    bundle = await loadLocale(appId, locale);
  } catch (e) {
    lines.push({
      ok: false,
      message: e instanceof Error ? e.message : String(e),
    });
    return { appId, locale, presetId, lines, valid: false };
  }

  let localeOk = true;
  for (const screen of app.screens) {
    try {
      resolveLocaleKey(bundle, screen.copy.headline);
      if (screen.copy.subhead) {
        resolveLocaleKey(bundle, screen.copy.subhead);
      }
      for (const f of screen.features ?? []) {
        resolveLocaleKey(bundle, f.titleKey);
        if (f.bodyKey) resolveLocaleKey(bundle, f.bodyKey);
      }
      for (const c of screen.featureCards ?? []) {
        resolveLocaleKey(bundle, c.titleKey);
        if (c.subtitleKey) resolveLocaleKey(bundle, c.subtitleKey);
      }
    } catch (e) {
      localeOk = false;
      lines.push({
        ok: false,
        message: `Screen ${screen.id}: ${e instanceof Error ? e.message : e}`,
      });
    }
  }
  if (localeOk) {
    lines.push({ ok: true, message: "Translation keys resolved" });
  }

  if (!OUTPUT_PRESETS[presetId]) {
    lines.push({ ok: false, message: `Unknown preset: ${presetId}` });
  } else {
    lines.push({ ok: true, message: `Preset: ${getPreset(presetId).label}` });
  }

  const rawDir = screenshotsRawDir(appId);
  const manifest = await readPlaceholderManifest(appId);
  let shotCount = 0;
  for (const screen of app.screens) {
    if (!screen.screenshot) continue;
    const p = path.join(rawDir, screen.screenshot);
    try {
      await fs.access(p);
      const meta = await sharp(p).metadata();
      if (!meta.width) {
        lines.push({
          ok: false,
          message: `Screen ${screen.id}: screenshot invalid`,
        });
      } else {
        shotCount++;
      }
      if (!allowPh && isPlaceholderFile(manifest, screen.screenshot)) {
        lines.push({
          ok: false,
          message: `Placeholder screenshot: ${screen.screenshot} (${screen.id})`,
        });
      }
    } catch {
      lines.push({
        ok: false,
        message: `Screen ${screen.id} references missing ${screen.screenshot}`,
      });
    }
  }
  lines.push({
    ok: true,
    message: `${shotCount} source screenshots found`,
  });

  for (const screen of app.screens) {
    const bg = screen.background?.preset;
    if (bg && !BACKGROUND_PRESETS[bg]) {
      lines.push({ ok: false, message: `Unknown background: ${bg}` });
    }
    const d = screen.device;
    if (d) {
      if (d.scale < 0.1 || d.scale > 1.5) {
        lines.push({ ok: false, message: `${screen.id}: invalid device scale` });
      }
      if (d.x < 0 || d.x > 1 || d.y < 0 || d.y > 1) {
        lines.push({ ok: false, message: `${screen.id}: invalid device position` });
      }
    }
  }
  lines.push({
    ok: true,
    message: `${app.screens.length} compositions checked`,
  });

  if (!allowPh && manifest.files.length > 0) {
    lines.push({
      ok: false,
      message: `${manifest.files.length} placeholder(s) in manifest`,
    });
  } else if (!allowPh) {
    lines.push({ ok: true, message: "No placeholders detected" });
  }

  const valid = lines.every((l) => l.ok);

  return {
    appId,
    locale,
    presetId,
    lines,
    valid,
  };
}

export function formatReport(report: ValidationReport): string {
  const header = `Cody1StoreKit\n\n${report.appId}\nLocale: ${report.locale}\nPreset: ${report.presetId}\n`;
  const body = report.lines
    .map((l) => `${l.ok ? "✓" : "✗"} ${l.message}`)
    .join("\n");
  const footer = report.valid
    ? `\n\nReady for App Store Connect.`
    : `\n\nValidation failed. Fix issues above.`;
  return header + "\n" + body + footer;
}
