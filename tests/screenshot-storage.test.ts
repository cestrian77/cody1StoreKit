import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import sharp from "sharp";
import {
  buildStoredScreenshotName,
  storeAppScreenshot,
} from "../src/utils/screenshot-storage";

describe("screenshot storage", () => {
  const prevRoot = process.env.CODY1_STOREKIT_ROOT;

  afterEach(async () => {
    if (prevRoot === undefined) delete process.env.CODY1_STOREKIT_ROOT;
    else process.env.CODY1_STOREKIT_ROOT = prevRoot;
  });

  it("buildStoredScreenshotName includes screen id and png extension", () => {
    const name = buildStoredScreenshotName("01-hero", "Simulator Shot.png");
    expect(name).toMatch(/^01-hero-Simulator-Shot-[a-f0-9]+\.png$/);
  });

  it("storeAppScreenshot writes png under app screenshots/raw", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "storekit-"));
    process.env.CODY1_STOREKIT_ROOT = root;
    const appId = "demo";
    await fs.mkdir(path.join(root, "apps", appId, "locales"), {
      recursive: true,
    });
    await fs.writeFile(
      path.join(root, "apps", appId, "app.config.json"),
      JSON.stringify(
        {
          app: { id: appId, name: "Demo", bundleId: "com.demo.app" },
          defaultLocale: "en-GB",
          defaultPreset: "iphone69",
          template: "utility-clean",
          screens: [
            {
              id: "01-hero",
              copy: { headline: "h", subhead: "s" },
              screenshot: "screen-1.png",
            },
          ],
        },
        null,
        2,
      ),
    );

    const jpeg = await sharp({
      create: {
        width: 100,
        height: 200,
        channels: 3,
        background: "#336699",
      },
    })
      .jpeg()
      .toBuffer();

    const { filename, assignedScreenId } = await storeAppScreenshot(
      appId,
      jpeg,
      { screenId: "01-hero", originalName: "capture.jpg" },
    );

    expect(assignedScreenId).toBe("01-hero");
    expect(filename.endsWith(".png")).toBe(true);
    const stored = path.join(
      root,
      "apps",
      appId,
      "screenshots",
      "raw",
      filename,
    );
    const meta = await sharp(stored).metadata();
    expect(meta.format).toBe("png");

    const config = JSON.parse(
      await fs.readFile(
        path.join(root, "apps", appId, "app.config.json"),
        "utf-8",
      ),
    );
    expect(config.screens[0].screenshot).toBe(filename);
  });
});
