import type { BackgroundConfig } from "../schemas/app-config.js";

export interface BackgroundPreset {
  id: string;
  label: string;
  config: BackgroundConfig;
}

export const BACKGROUND_PRESETS: Record<string, BackgroundPreset> = {
  "soft-blue": {
    id: "soft-blue",
    label: "Soft Blue",
    config: {
      gradient: {
        type: "linear",
        angle: 165,
        stops: [
          { offset: 0, color: "#E8F2FF" },
          { offset: 0.55, color: "#D4E8FF" },
          { offset: 1, color: "#C5DBF5" },
        ],
      },
    },
  },
  "warm-cream": {
    id: "warm-cream",
    label: "Warm Cream",
    config: {
      gradient: {
        type: "linear",
        angle: 180,
        stops: [
          { offset: 0, color: "#FBF7F0" },
          { offset: 1, color: "#F3EBE0" },
        ],
      },
    },
  },
  "soft-lavender": {
    id: "soft-lavender",
    label: "Soft Lavender",
    config: {
      gradient: {
        type: "linear",
        angle: 150,
        stops: [
          { offset: 0, color: "#F3EEF9" },
          { offset: 1, color: "#E6DCF5" },
        ],
      },
    },
  },
  "soft-green": {
    id: "soft-green",
    label: "Soft Green",
    config: {
      gradient: {
        type: "linear",
        angle: 160,
        stops: [
          { offset: 0, color: "#EEF6F0" },
          { offset: 1, color: "#DCE9E0" },
        ],
      },
    },
  },
  "soft-coral": {
    id: "soft-coral",
    label: "Soft Coral",
    config: {
      gradient: {
        type: "linear",
        angle: 170,
        stops: [
          { offset: 0, color: "#FFF0EE" },
          { offset: 1, color: "#F9DED8" },
        ],
      },
    },
  },
  "clean-white": {
    id: "clean-white",
    label: "Clean White",
    config: { solid: "#FAFAFA" },
  },
  "dark-game": {
    id: "dark-game",
    label: "Dark Game",
    config: {
      gradient: {
        type: "radial",
        cx: 0.5,
        cy: 0.35,
        r: 0.85,
        stops: [
          { offset: 0, color: "#2A1F4E" },
          { offset: 0.6, color: "#151028" },
          { offset: 1, color: "#0A0812" },
        ],
      },
    },
  },
  "bright-game": {
    id: "bright-game",
    label: "Bright Game",
    config: {
      gradient: {
        type: "linear",
        angle: 135,
        stops: [
          { offset: 0, color: "#FF6B4A" },
          { offset: 0.5, color: "#FF3D8E" },
          { offset: 1, color: "#7B4DFF" },
        ],
      },
    },
  },
};

export function resolveBackground(config?: BackgroundConfig): BackgroundConfig {
  if (!config) {
    return BACKGROUND_PRESETS["soft-blue"].config;
  }
  if (config.preset) {
    const preset = BACKGROUND_PRESETS[config.preset];
    if (!preset) {
      throw new Error(`Unknown background preset: ${config.preset}`);
    }
    return { ...preset.config, ...config, preset: config.preset };
  }
  return config;
}
