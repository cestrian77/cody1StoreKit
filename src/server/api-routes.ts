import type { Express } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import {
  listApps,
  loadAppConfig,
  saveAppConfig,
} from "../config/load-app.js";
import { localesDir, screenshotsRawDir } from "../config/paths.js";
import { BACKGROUND_PRESETS } from "../backgrounds/presets.js";
import {
  hasLocaleContent,
  listLocales,
  loadLocale,
  type LocaleBundle,
} from "../localisation/resolve.js";
import { syncAppAssetsFromSeed } from "../config/sync-seed-assets.js";
import { OUTPUT_PRESETS } from "../presets/output-presets.js";
import { TEMPLATES } from "../templates/index.js";
import { renderSet } from "../renderer/render-set.js";
import { renderScreen } from "../renderer/render-screen.js";
import { validateApp, formatReport } from "../validation/validate-app.js";
import { createApp } from "../scripts/create-app.js";
import { getPreset } from "../presets/output-presets.js";
import { ensureDevScreenshots } from "../utils/placeholders.js";
import {
  deleteUnreferencedScreenshotFiles,
  restorePlaceholderScreenshotsForConfig,
} from "../utils/screenshot-cleanup.js";
import { forceRestorePlaceholderScreenshot } from "../utils/placeholders.js";
import { storeAppScreenshot } from "../utils/screenshot-storage.js";
import { parseScreenshotUpload } from "./parse-multipart.js";
import type { AppConfig } from "../schemas/app-config.js";
import {
  buildStarterLocaleBundle,
  resetLocaleCopyForScreen,
  resetScreenToStarter,
} from "../config/starter-defaults.js";

export function registerApiRoutes(app: Express): void {
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, packaged: Boolean(process.env.STOREKIT_PACKAGED) });
  });

  app.get("/api/workspace", (_req, res) => {
    res.json({ root: process.env.CODY1_STOREKIT_ROOT ?? null });
  });

  app.get("/api/apps", async (_req, res) => {
    res.json(await listApps());
  });

  app.get("/api/presets", (_req, res) => {
    res.json(Object.values(OUTPUT_PRESETS));
  });

  app.get("/api/backgrounds", (_req, res) => {
    res.json(Object.values(BACKGROUND_PRESETS));
  });

  app.get("/api/templates", (_req, res) => {
    res.json(Object.values(TEMPLATES));
  });

  app.get("/api/apps/:appId", async (req, res) => {
    try {
      const appId = req.params.appId;
      await syncAppAssetsFromSeed(appId);
      const config = await loadAppConfig(appId);
      const locales = await listLocales(appId);
      let localeBundle: LocaleBundle = {};
      let localeWarning: string | undefined;
      try {
        localeBundle = await loadLocale(appId, config.defaultLocale);
      } catch (e) {
        localeWarning =
          e instanceof Error ? e.message : String(e);
      }
      res.json({ config, locales, locale: localeBundle, localeWarning });
    } catch (e) {
      res.status(400).json({
        error: e instanceof Error ? e.message : String(e),
      });
    }
  });

  app.put("/api/apps/:appId/locales/:locale", async (req, res) => {
    try {
      const file = path.join(
        localesDir(req.params.appId),
        `${req.params.locale}.json`,
      );
      await fs.writeFile(file, JSON.stringify(req.body, null, 2), "utf-8");
      res.json({ ok: true });
    } catch (e) {
      res.status(400).json({
        error: e instanceof Error ? e.message : String(e),
      });
    }
  });

  app.put("/api/apps/:appId/config", async (req, res) => {
    try {
      await saveAppConfig(req.params.appId, req.body as AppConfig);
      res.json({ ok: true });
    } catch (e) {
      res.status(400).json({
        error: e instanceof Error ? e.message : String(e),
      });
    }
  });

  app.get("/api/apps/:appId/locales/:locale", async (req, res) => {
    try {
      res.json(await loadLocale(req.params.appId, req.params.locale));
    } catch (e) {
      res.status(400).json({
        error: e instanceof Error ? e.message : String(e),
      });
    }
  });

  app.get("/api/apps/:appId/screenshots", async (req, res) => {
    try {
      const config = await loadAppConfig(req.params.appId);
      const required = config.screens
        .filter((s) => s.screenshot)
        .map((s) => s.screenshot!);
      await ensureDevScreenshots(req.params.appId, required);
      const dir = screenshotsRawDir(req.params.appId);
      const files = await fs.readdir(dir);
      const pngs = files.filter((f) => f.toLowerCase().endsWith(".png"));
      res.json(pngs);
    } catch (e) {
      res.status(400).json({
        error: e instanceof Error ? e.message : String(e),
      });
    }
  });

  app.post("/api/apps/:appId/reset-screen", async (req, res) => {
    try {
      const appId = req.params.appId;
      const { screenId } = req.body as { screenId?: string };
      if (!screenId) {
        res.status(400).json({ error: "screenId is required" });
        return;
      }
      const config = await loadAppConfig(appId);
      const index = config.screens.findIndex((s) => s.id === screenId);
      if (index < 0) {
        res.status(404).json({ error: `Screen not found: ${screenId}` });
        return;
      }
      const existing = config.screens[index]!;
      const screens = config.screens.map((s, i) =>
        i === index ? resetScreenToStarter(s, index, config.template) : s,
      );
      const nextConfig = { ...config, screens };
      await saveAppConfig(appId, nextConfig);

      let localeBundle: Record<string, unknown> = {};
      try {
        localeBundle = await loadLocale(appId, config.defaultLocale);
      } catch {
        localeBundle = buildStarterLocaleBundle();
      }
      localeBundle = resetLocaleCopyForScreen(
        localeBundle,
        existing,
        index,
      );
      await fs.writeFile(
        path.join(localesDir(appId), `${config.defaultLocale}.json`),
        JSON.stringify(localeBundle, null, 2),
        "utf-8",
      );

      const resetScreen = nextConfig.screens[index]!;
      if (resetScreen.screenshot) {
        await forceRestorePlaceholderScreenshot(appId, resetScreen.screenshot);
      }
      await deleteUnreferencedScreenshotFiles(appId, nextConfig);

      res.json({ ok: true, config: nextConfig, locale: localeBundle });
    } catch (e) {
      res.status(400).json({
        error: e instanceof Error ? e.message : String(e),
      });
    }
  });

  app.post("/api/apps/:appId/reset-app", async (req, res) => {
    try {
      const appId = req.params.appId;
      const config = await loadAppConfig(appId);
      const screens = config.screens.map((s, i) =>
        resetScreenToStarter(s, i, config.template),
      );
      const nextConfig = { ...config, screens };
      await saveAppConfig(appId, nextConfig);

      const localeBundle = buildStarterLocaleBundle();
      await fs.writeFile(
        path.join(localesDir(appId), `${config.defaultLocale}.json`),
        JSON.stringify(localeBundle, null, 2),
        "utf-8",
      );

      await restorePlaceholderScreenshotsForConfig(appId, nextConfig);
      await deleteUnreferencedScreenshotFiles(appId, nextConfig);

      res.json({ ok: true, config: nextConfig, locale: localeBundle });
    } catch (e) {
      res.status(400).json({
        error: e instanceof Error ? e.message : String(e),
      });
    }
  });

  app.delete("/api/apps/:appId/screens/:screenId", async (req, res) => {
    try {
      const appId = req.params.appId;
      const screenId = req.params.screenId;
      const config = await loadAppConfig(appId);
      if (config.screens.length <= 1) {
        res.status(400).json({ error: "Cannot delete the last screen." });
        return;
      }
      const index = config.screens.findIndex((s) => s.id === screenId);
      if (index < 0) {
        res.status(404).json({ error: `Screen not found: ${screenId}` });
        return;
      }
      const removed = config.screens[index]!;
      const screens = config.screens.filter((s) => s.id !== screenId);
      const nextConfig = { ...config, screens };
      await saveAppConfig(appId, nextConfig);
      await deleteUnreferencedScreenshotFiles(appId, nextConfig);

      let localeBundle: Record<string, unknown> = {};
      try {
        localeBundle = await loadLocale(appId, config.defaultLocale);
      } catch {
        localeBundle = {};
      }

      const nextScreenId =
        screens[Math.min(index, screens.length - 1)]?.id ?? screens[0]!.id;

      res.json({
        ok: true,
        config: nextConfig,
        locale: localeBundle,
        nextScreenId,
        removedScreenId: removed.id,
      });
    } catch (e) {
      res.status(400).json({
        error: e instanceof Error ? e.message : String(e),
      });
    }
  });

  app.post("/api/apps/:appId/screenshots", async (req, res) => {
    try {
      const appId = req.params.appId;
      await loadAppConfig(appId);
      const { buffer, originalName, screenId } = await parseScreenshotUpload(req);
      const result = await storeAppScreenshot(appId, buffer, {
        screenId,
        originalName,
      });
      const config = await loadAppConfig(appId);
      res.json({ ok: true, ...result, config });
    } catch (e) {
      res.status(400).json({
        error: e instanceof Error ? e.message : String(e),
      });
    }
  });

  app.get("/api/apps/:appId/screenshot/:filename", async (req, res) => {
    const filename = path.basename(req.params.filename);
    if (!filename || filename !== req.params.filename) {
      res.status(400).json({ error: "Invalid screenshot filename" });
      return;
    }
    const file = path.join(screenshotsRawDir(req.params.appId), filename);
    try {
      await fs.access(file);
      res.sendFile(file);
    } catch {
      res.status(404).json({ error: "Screenshot not found" });
    }
  });

  app.post("/api/preview", async (req, res) => {
    try {
      const {
        appId,
        screenId,
        locale,
        presetId,
        configOverride,
        localeOverride,
      } = req.body as {
        appId: string;
        screenId: string;
        locale?: string;
        presetId?: string;
        configOverride?: AppConfig;
        localeOverride?: Record<string, unknown>;
      };
      const config =
        configOverride ?? (await loadAppConfig(appId));
      const loc = hasLocaleContent(localeOverride)
        ? localeOverride!
        : await loadLocale(appId, locale ?? config.defaultLocale);
      const screen = config.screens.find((s) => s.id === screenId);
      if (!screen) {
        res.status(404).json({ error: "Screen not found" });
        return;
      }
      const preset = getPreset(presetId ?? config.defaultPreset);
      const required = config.screens
        .filter((s) => s.screenshot)
        .map((s) => s.screenshot!);
      await ensureDevScreenshots(appId, required);
      const shot = screen.screenshot
        ? path.join(screenshotsRawDir(appId), screen.screenshot)
        : "";
      const result = await renderScreen({
        app: config,
        screen,
        locale: loc,
        preset,
        screenshotPath: shot,
        previewScale: 0.35,
        allowPlaceholders: true,
      });
      res.setHeader("Content-Type", "image/png");
      res.send(result.buffer);
    } catch (e) {
      res.status(400).json({
        error: e instanceof Error ? e.message : String(e),
      });
    }
  });

  app.post("/api/validate", async (req, res) => {
    try {
      const { appId, locale, presetId, dev } = req.body;
      const config = await loadAppConfig(appId);
      const report = await validateApp(
        appId,
        locale ?? config.defaultLocale,
        presetId ?? config.defaultPreset,
        { allowPlaceholders: Boolean(dev) },
      );
      res.json({ report, text: formatReport(report) });
    } catch (e) {
      res.status(400).json({
        error: e instanceof Error ? e.message : String(e),
      });
    }
  });

  app.post("/api/generate", async (req, res) => {
    try {
      const { appId, locale, presetId, dev } = req.body;
      const config = await loadAppConfig(appId);
      if (!dev) {
        const report = await validateApp(
          appId,
          locale ?? config.defaultLocale,
          presetId ?? config.defaultPreset,
          { allowPlaceholders: false },
        );
        if (!report.valid) {
          res.status(400).json({ error: formatReport(report) });
          return;
        }
      }
      const result = await renderSet({
        appId,
        locale: locale ?? config.defaultLocale,
        presetId: presetId ?? config.defaultPreset,
        allowPlaceholders: Boolean(dev),
      });
      res.json(result);
    } catch (e) {
      res.status(400).json({
        error: e instanceof Error ? e.message : String(e),
      });
    }
  });

  app.post("/api/apps", async (req, res) => {
    try {
      const { id, name, defaultLocale, template, duplicateFrom, targets } =
        req.body;
      await createApp({
        id,
        name,
        defaultLocale: defaultLocale ?? "en-GB",
        template: template ?? "utility-clean",
        duplicateFrom,
        targets,
      });
      res.json({ ok: true, id });
    } catch (e) {
      res.status(400).json({
        error: e instanceof Error ? e.message : String(e),
      });
    }
  });
}
