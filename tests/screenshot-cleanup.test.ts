import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  deleteUnreferencedScreenshotFiles,
  referencedScreenshotFilenames,
} from "../src/utils/screenshot-cleanup";
import type { AppConfig } from "../src/schemas/app-config";

describe("screenshot cleanup", () => {
  const prevRoot = process.env.CODY1_STOREKIT_ROOT;

  afterEach(async () => {
    if (prevRoot === undefined) delete process.env.CODY1_STOREKIT_ROOT;
    else process.env.CODY1_STOREKIT_ROOT = prevRoot;
  });

  it("deletes png files not referenced by config", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "storekit-"));
    process.env.CODY1_STOREKIT_ROOT = root;
    const appId = "demo";
    const raw = path.join(root, "apps", appId, "screenshots", "raw");
    await fs.mkdir(raw, { recursive: true });
    await fs.writeFile(path.join(raw, "screen-1.png"), "keep");
    await fs.writeFile(path.join(raw, "orphan.png"), "drop");

    const config = {
      app: { id: appId, name: "Demo" },
      template: "utility-clean",
      defaultLocale: "en-GB",
      defaultPreset: "iphone69",
      defaultMacPreset: "mac2880",
      screens: [
        {
          id: "01-hero",
          copy: { headline: "h", subhead: "s" },
          screenshot: "screen-1.png",
        },
      ],
    } as AppConfig;

    expect(referencedScreenshotFilenames(config)).toEqual(
      new Set(["screen-1.png"]),
    );
    const removed = await deleteUnreferencedScreenshotFiles(appId, config);
    expect(removed).toEqual(["orphan.png"]);
    await expect(fs.access(path.join(raw, "orphan.png"))).rejects.toThrow();
    await expect(fs.access(path.join(raw, "screen-1.png"))).resolves.toBeUndefined();
  });
});
