/**
 * App Store Connect screenshot dimensions.
 * Source: https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/
 * Re-verify when Apple updates requirements.
 */
export type OutputPlatform = "iphone" | "ipad" | "mac";

export type OutputOrientation = "portrait" | "landscape";

export interface OutputPreset {
  id: string;
  label: string;
  platform: OutputPlatform;
  orientation: OutputOrientation;
  width: number;
  height: number;
  /** Apple display class description */
  displayClass: string;
  /** Mac screenshots should not include transparency (flatten on export). */
  flattenAlpha?: boolean;
  notes?: string;
}

export const OUTPUT_PRESETS: Record<string, OutputPreset> = {
  iphone69: {
    id: "iphone69",
    label: 'iPhone 6.9"',
    platform: "iphone",
    orientation: "portrait",
    width: 1320,
    height: 2868,
    displayClass: "6.9-inch",
    notes: "Primary iPhone size (e.g. Pro Max). Also accepts 1290×2796 and 1260×2736.",
  },
  iphone67: {
    id: "iphone67",
    label: 'iPhone 6.7"',
    platform: "iphone",
    orientation: "portrait",
    width: 1290,
    height: 2796,
    displayClass: "6.7-inch",
  },
  iphone65: {
    id: "iphone65",
    label: 'iPhone 6.5"',
    platform: "iphone",
    orientation: "portrait",
    width: 1284,
    height: 2778,
    displayClass: "6.5-inch",
    notes: "Required fallback if 6.9-inch set not provided.",
  },
  ipad13: {
    id: "ipad13",
    label: 'iPad 13"',
    platform: "ipad",
    orientation: "portrait",
    width: 2064,
    height: 2752,
    displayClass: "13-inch",
    notes: "Also accepts 2048×2732.",
  },
  ipad13_alt: {
    id: "ipad13_alt",
    label: 'iPad 13" (2048×2732)',
    platform: "ipad",
    orientation: "portrait",
    width: 2048,
    height: 2732,
    displayClass: "13-inch",
  },
  mac2880: {
    id: "mac2880",
    label: "Mac (2880×1800)",
    platform: "mac",
    orientation: "landscape",
    width: 2880,
    height: 1800,
    displayClass: "Mac 16:10",
    flattenAlpha: true,
    notes: "Preferred Mac size (2× 1440×900).",
  },
  mac2560: {
    id: "mac2560",
    label: "Mac (2560×1600)",
    platform: "mac",
    orientation: "landscape",
    width: 2560,
    height: 1600,
    displayClass: "Mac 16:10",
    flattenAlpha: true,
    notes: "2× 1280×800.",
  },
  mac1440: {
    id: "mac1440",
    label: "Mac (1440×900)",
    platform: "mac",
    orientation: "landscape",
    width: 1440,
    height: 900,
    displayClass: "Mac 16:10",
    flattenAlpha: true,
  },
  mac1280: {
    id: "mac1280",
    label: "Mac (1280×800)",
    platform: "mac",
    orientation: "landscape",
    width: 1280,
    height: 800,
    displayClass: "Mac 16:10",
    flattenAlpha: true,
  },
};

export function getPreset(id: string): OutputPreset {
  const preset = OUTPUT_PRESETS[id];
  if (!preset) {
    throw new Error(
      `Unknown output preset "${id}". Available: ${Object.keys(OUTPUT_PRESETS).join(", ")}`,
    );
  }
  return preset;
}

export function listPresets(platform?: OutputPlatform): OutputPreset[] {
  return Object.values(OUTPUT_PRESETS).filter(
    (p) => !platform || p.platform === platform,
  );
}
