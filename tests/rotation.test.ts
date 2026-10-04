import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadAppConfig } from "../src/config/load-app";
import { loadLocale } from "../src/localisation/resolve";
import { getPreset } from "../src/presets/output-presets";
import { rotateBuffer } from "../src/renderer/compositor";
import { renderScreen } from "../src/renderer/render-screen";
import { ensureDevScreenshots } from "../src/utils/placeholders";
import { screenshotsRawDir } from "../src/config/paths";
import sharp from "sharp";

describe("device rotation", () => {
  it("rotateBuffer changes pixel dimensions for non-zero angles", async () => {
    const base = await sharp({
      create: {
        width: 200,
        height: 400,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 },
      },
    })
      .png()
      .toBuffer();
    const rotated = await rotateBuffer(base, 12);
    const meta = await sharp(rotated).metadata();
    expect(meta.width).toBeGreaterThan(200);
    expect(meta.height).toBeGreaterThan(400);
  });

  it("renderScreen output differs when rotation changes", async () => {
    const app = await loadAppConfig("example");
    const locale = await loadLocale("example", "en-GB");
    const baseScreen = app.screens[0];
    await ensureDevScreenshots(
      "example",
      app.screens.filter((s) => s.screenshot).map((s) => s.screenshot!),
    );
    const preset = getPreset("iphone69");
    const shot = path.join(screenshotsRawDir("example"), baseScreen.screenshot!);
    const screen0 = {
      ...baseScreen,
      device: { ...baseScreen.device!, rotation: 0 },
    };
    const screenTilt = {
      ...baseScreen,
      device: { ...baseScreen.device!, rotation: 12 },
    };
    const r0 = await renderScreen({
      app,
      screen: screen0,
      locale,
      preset,
      screenshotPath: shot,
      previewScale: 0.2,
      allowPlaceholders: true,
    });
    const rTilt = await renderScreen({
      app,
      screen: screenTilt,
      locale,
      preset,
      screenshotPath: shot,
      previewScale: 0.2,
      allowPlaceholders: true,
    });
    expect(r0.buffer.equals(rTilt.buffer)).toBe(false);
  });
});
