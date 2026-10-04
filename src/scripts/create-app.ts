import fs from "node:fs/promises";
import path from "node:path";
import type { AppConfig } from "../schemas/app-config.js";
import { appRoot } from "../config/paths.js";
import { importAppConfigModule } from "../config/load-app-config-file.js";
import {
  buildStarterLocaleBundle,
  buildStarterScreens,
} from "../config/starter-defaults.js";

export async function createApp(options: {
  id: string;
  name: string;
  defaultLocale: string;
  template: AppConfig["template"];
  targets?: AppConfig["targets"];
  duplicateFrom?: string;
}): Promise<void> {
  const root = appRoot(options.id);
  if (await exists(root)) {
    throw new Error(`App already exists: apps/${options.id}`);
  }

  let config: AppConfig;
  let localeJson: Record<string, unknown>;

  if (options.duplicateFrom) {
    const src = appRoot(options.duplicateFrom);
    const mod = importAppConfigModule(path.join(src, "app.config.ts")) as {
      default?: AppConfig;
      config?: AppConfig;
    };
    const srcConfig = (mod.default ?? mod.config)!;
    config = {
      ...srcConfig,
      app: { ...srcConfig.app, id: options.id, name: options.name },
      defaultLocale: options.defaultLocale,
      template: options.template,
      targets: options.targets ?? srcConfig.targets ?? ["ios"],
    };
    const locPath = path.join(src, "locales", `${options.defaultLocale}.json`);
    localeJson = JSON.parse(await fs.readFile(locPath, "utf-8"));
  } else {
    const targets = options.targets ?? ["ios"];
    config = {
      app: { id: options.id, name: options.name },
      targets,
      template: options.template,
      defaultLocale: options.defaultLocale,
      defaultPreset: "iphone69",
      defaultMacPreset: "mac2880",
      screens: buildStarterScreens(options.template),
    };
    localeJson = buildStarterLocaleBundle();
  }

  await fs.mkdir(path.join(root, "screenshots", "raw"), { recursive: true });
  await fs.mkdir(path.join(root, "assets"), { recursive: true });
  await fs.mkdir(path.join(root, "locales"), { recursive: true });
  await fs.mkdir(path.join(root, "output"), { recursive: true });

  await fs.writeFile(
    path.join(root, "app.config.json"),
    JSON.stringify(config, null, 2),
  );
  const configBody = `export default ${JSON.stringify(config, null, 2)};\n`;
  await fs.writeFile(path.join(root, "app.config.ts"), configBody);
  await fs.writeFile(
    path.join(root, "locales", `${options.defaultLocale}.json`),
    JSON.stringify(localeJson, null, 2),
  );
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}
