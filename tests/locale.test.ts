import { describe, expect, it } from "vitest";
import { resolveLocaleKey } from "../src/localisation/resolve";

describe("resolveLocaleKey", () => {
  const bundle = {
    screens: {
      hero: { headline: "HELLO", subhead: "World" },
    },
  };

  it("resolves nested keys", () => {
    expect(resolveLocaleKey(bundle, "screens.hero.headline")).toBe("HELLO");
  });

  it("throws on missing key", () => {
    expect(() => resolveLocaleKey(bundle, "screens.missing")).toThrow(
      /Missing translation key/,
    );
  });
});
