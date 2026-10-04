import { describe, expect, it } from "vitest";
import { getPreset, OUTPUT_PRESETS } from "../src/presets/output-presets";

describe("output presets", () => {
  it("resolves iphone69", () => {
    const p = getPreset("iphone69");
    expect(p.width).toBe(1320);
    expect(p.height).toBe(2868);
  });

  it("throws on unknown preset", () => {
    expect(() => getPreset("nope")).toThrow(/Unknown output preset/);
  });

  it("includes ipad preset", () => {
    expect(OUTPUT_PRESETS.ipad13.width).toBe(2064);
  });
});
