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
import { listLocales, loadLocale } from "../localisation/resolve.js";
import { OUTPUT_PRESETS } from "../presets/output-presets.js";
import { TEMPLATES } from "../templates/index.js";
import { renderSet } from "../renderer/render-set.js";
import { renderScreen } from "../renderer/render-screen.js";
import { validateApp, formatReport } from "../validation/validate-app.js";
import { createApp } from "../scripts/create-app.js";
import { getPreset } from "../presets/output-presets.js";
import { ensureDevScreenshots } from "../utils/placeholders.js";
import type { AppConfig } from "../schemas/app-config.js";

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
      const config = await loadAppConfig(req.params.appId);
      const locales = await listLocales(req.params.appId);
      let localeBundle = {};
      try {
        localeBundle = await loadLocale(
          req.params.appId,
          config.defaultLocale,
        );
      } catch {
        /* empty */
      }
      res.json({ config, locales, locale: localeBundle });
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

  app.get("/api/apps/:appId/screenshot/:filename", async (req, res) => {
    const file = path.join(
      screenshotsRawDir(req.params.appId),
      req.params.filename,
    );
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
      const loc =
        localeOverride ??
        (await loadLocale(appId, locale ?? config.defaultLocale));
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
