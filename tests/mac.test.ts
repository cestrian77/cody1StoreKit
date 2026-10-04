import { describe, expect, it } from "vitest";
import { getPreset } from "../src/presets/output-presets";
import { resolveDeviceForPreset } from "../src/renderer/resolve-device";

describe("mac presets", () => {
  it("mac2880 is landscape 16:10", () => {
    const p = getPreset("mac2880");
    expect(p.width / p.height).toBeCloseTo(1.6, 2);
    expect(p.flattenAlpha).toBe(true);
  });

  it("maps iphone device to mac for mac exports", () => {
    const preset = getPreset("mac2880");
    const resolved = resolveDeviceForPreset(
      {
        type: "iphone",
        scale: 0.82,
        x: 0.5,
        y: 0.73,
        rotation: -4,
        shadow: true,
        appearance: "dark",
      },
      preset,
    );
    expect(resolved?.type).toBe("mac");
    expect(resolved?.rotation).toBe(0);
  });
});
