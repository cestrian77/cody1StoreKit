import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadAppConfig } from "../src/config/load-app";
import { loadLocale } from "../src/localisation/resolve";
import { getPreset } from "../src/presets/output-presets";
import { renderScreen, verifyPngDimensions } from "../src/renderer/render-screen";
import { ensureDevScreenshots } from "../src/utils/placeholders";
import { screenshotsRawDir } from "../src/config/paths";

describe("renderer smoke", () => {
  it("renders example hero at preview scale", async () => {
    const app = await loadAppConfig("example");
    const locale = await loadLocale("example", "en-GB");
    const screen = app.screens[0];
    await ensureDevScreenshots(
      "example",
      app.screens.filter((s) => s.screenshot).map((s) => s.screenshot!),
    );
    const preset = getPreset("iphone69");
    const result = await renderScreen({
      app,
      screen,
      locale,
      preset,
      screenshotPath: path.join(
        screenshotsRawDir("example"),
        screen.screenshot!,
      ),
      previewScale: 0.2,
      allowPlaceholders: true,
    });
    expect(result.buffer.length).toBeGreaterThan(1000);
    await verifyPngDimensions(
      result.buffer,
      Math.round(preset.width * 0.2),
      Math.round(preset.height * 0.2),
    );
  });
});
