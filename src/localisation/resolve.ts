import fs from "node:fs/promises";
import path from "node:path";
import { syncAppAssetsFromSeed } from "../config/sync-seed-assets.js";
import { localesDir } from "../config/paths.js";

export type LocaleBundle = Record<string, unknown>;

export async function loadLocale(
  appId: string,
  locale: string,
): Promise<LocaleBundle> {
  const file = path.join(localesDir(appId), `${locale}.json`);
  try {
    const raw = await fs.readFile(file, "utf-8");
    return JSON.parse(raw) as LocaleBundle;
  } catch {
    await syncAppAssetsFromSeed(appId);
    try {
      const raw = await fs.readFile(file, "utf-8");
      return JSON.parse(raw) as LocaleBundle;
    } catch {
      throw new Error(
        `Locale file not found: apps/${appId}/locales/${locale}.json`,
      );
    }
  }
}

export function hasLocaleContent(bundle: LocaleBundle | undefined): boolean {
  return Boolean(bundle && Object.keys(bundle).length > 0);
}

export function resolveLocaleKey(bundle: LocaleBundle, keyPath: string): string {
  const parts = keyPath.split(".");
  let cur: unknown = bundle;
  for (const p of parts) {
    if (cur === null || typeof cur !== "object" || !(p in cur)) {
      throw new Error(`Missing translation key: ${keyPath}`);
    }
    cur = (cur as Record<string, unknown>)[p];
  }
  if (typeof cur !== "string") {
    throw new Error(`Translation key ${keyPath} must resolve to a string`);
  }
  return cur;
}

export async function listLocales(appId: string): Promise<string[]> {
  const dir = localesDir(appId);
  try {
    const entries = await fs.readdir(dir);
    return entries
      .filter((e) => e.endsWith(".json"))
      .map((e) => e.replace(/\.json$/, ""));
  } catch {
    return [];
  }
}
