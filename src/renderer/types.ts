import type { AppConfig, ScreenConfig } from "../schemas/app-config.js";
import type { OutputPreset } from "../presets/output-presets.js";
import type { LocaleBundle } from "../localisation/resolve.js";

export interface ResolvedScreenCopy {
  headline: string;
  subhead?: string;
}

export interface RenderScreenInput {
  app: AppConfig;
  screen: ScreenConfig;
  locale: LocaleBundle;
  preset: OutputPreset;
  screenshotPath: string;
  previewScale?: number;
  allowPlaceholders?: boolean;
}

export interface RenderResult {
  buffer: Buffer;
  width: number;
  height: number;
  warnings: string[];
}

export interface RenderSetOptions {
  appId: string;
  locale: string;
  presetId: string;
  allowPlaceholders?: boolean;
  previewScale?: number;
  screenIds?: string[];
}
