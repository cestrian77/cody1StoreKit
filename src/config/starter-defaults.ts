import type { AppConfig, ScreenConfig } from "../schemas/app-config.js";
import { getTemplateStarterDefaults } from "../templates/index.js";

export const STARTER_SCREEN_IDS = [
  "01-hero",
  "02-feature",
  "03-feature",
  "04-feature",
  "05-feature",
] as const;

/** Numeric prefix from screen id (e.g. 01-hero → slot 0). Falls back to array index. */
export function screenSlotIndex(screenId: string, fallbackIndex: number): number {
  const m = /^(\d+)/.exec(screenId);
  if (m) {
    const n = parseInt(m[1]!, 10);
    if (Number.isFinite(n) && n >= 1) return n - 1;
  }
  return fallbackIndex;
}

export function defaultScreenshotFilename(screenIndex: number): string {
  return `screen-${screenIndex + 1}.png`;
}

export function buildStarterScreen(
  id: string,
  index: number,
  templateId: AppConfig["template"],
): ScreenConfig {
  const starter = getTemplateStarterDefaults(templateId);
  return {
    id,
    copy: {
      headline: `screens.screen${index + 1}.headline`,
      subhead: `screens.screen${index + 1}.subhead`,
    },
    screenshot: defaultScreenshotFilename(index),
    background: { preset: starter.backgroundPreset },
    device: {
      type: "iphone",
      scale: starter.device.scale,
      x: starter.device.x,
      y: starter.device.y,
      rotation: 0,
      shadow: true,
      appearance: starter.device.appearance,
    },
    layout: {
      type: starter.layout.type,
      textAlign: starter.layout.textAlign,
    },
  };
}

export function buildStarterLocaleBundle(): Record<string, unknown> {
  return {
    screens: Object.fromEntries(
      STARTER_SCREEN_IDS.map((_, i) => [
        `screen${i + 1}`,
        {
          headline: `HEADLINE ${i + 1}`,
          subhead: "Supporting copy for this screen.",
        },
      ]),
    ),
  };
}

export function buildStarterScreens(
  templateId: AppConfig["template"],
): ScreenConfig[] {
  return STARTER_SCREEN_IDS.map((id, i) => buildStarterScreen(id, i, templateId));
}

/** Restore layout/device/background/screenshot for one screen; keep copy key paths. */
export function resetScreenToStarter(
  existing: ScreenConfig,
  index: number,
  appTemplate: AppConfig["template"],
): ScreenConfig {
  const slot = screenSlotIndex(existing.id, index);
  const templateId = (existing.template ?? appTemplate) as AppConfig["template"];
  const base = buildStarterScreen(existing.id, slot, templateId);
  return {
    ...base,
    copy: existing.copy,
    ...(existing.template ? { template: existing.template } : {}),
  };
}

function setLocaleKey(
  bundle: Record<string, unknown>,
  key: string,
  value: string,
): Record<string, unknown> {
  const parts = key.split(".");
  const clone = JSON.parse(JSON.stringify(bundle)) as Record<string, unknown>;
  let cur: Record<string, unknown> = clone;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (!cur[p] || typeof cur[p] !== "object") cur[p] = {};
    cur = cur[p] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]!] = value;
  return clone;
}

export function resetLocaleCopyForScreen(
  bundle: Record<string, unknown>,
  screen: ScreenConfig,
  index: number,
): Record<string, unknown> {
  const slot = screenSlotIndex(screen.id, index);
  const headline = `HEADLINE ${slot + 1}`;
  const subhead = "Supporting copy for this screen.";
  let next = setLocaleKey(bundle, screen.copy.headline, headline);
  if (screen.copy.subhead) {
    next = setLocaleKey(next, screen.copy.subhead, subhead);
  }
  return next;
}
