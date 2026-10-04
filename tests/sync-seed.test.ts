import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  hasLocaleContent,
  loadLocale,
} from "../src/localisation/resolve";
import { mergeMissingFromSeed } from "../src/config/sync-seed-assets";

describe("hasLocaleContent", () => {
  it("treats empty objects as missing", () => {
    expect(hasLocaleContent({})).toBe(false);
    expect(hasLocaleContent({ screens: {} })).toBe(true);
  });
});

describe("mergeMissingFromSeed", () => {
  const roots: string[] = [];

  afterEach(async () => {
    for (const root of roots.splice(0)) {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("restores missing locale files without overwriting user data", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "storekit-seed-"));
    roots.push(tmp);
    const seed = path.join(tmp, "seed", "demo");
    const dest = path.join(tmp, "dest", "demo");
    await fs.mkdir(path.join(seed, "locales"), { recursive: true });
    await fs.mkdir(path.join(dest, "locales"), { recursive: true });
    await fs.writeFile(
      path.join(seed, "locales", "en-GB.json"),
      JSON.stringify({ screens: { a: { headline: "From seed" } } }),
      "utf-8",
    );
    await fs.writeFile(
      path.join(dest, "locales", "en-GB.json"),
      JSON.stringify({ screens: { a: { headline: "User copy" } } }),
      "utf-8",
    );
    await fs.writeFile(
      path.join(seed, "locales", "de-DE.json"),
      JSON.stringify({ screens: {} }),
      "utf-8",
    );

    await mergeMissingFromSeed(seed, dest);

    const en = JSON.parse(
      await fs.readFile(path.join(dest, "locales", "en-GB.json"), "utf-8"),
    );
    expect(en.screens.a.headline).toBe("User copy");
    await fs.access(path.join(dest, "locales", "de-DE.json"));
  });
});

describe("loadLocale with seed sync", () => {
  it("loads example locale from repo apps", async () => {
    const bundle = await loadLocale("example", "en-GB");
    expect(bundle).toHaveProperty("screens");
  });
});
