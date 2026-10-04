#!/usr/bin/env node
import { Command } from "commander";
import path from "node:path";
import { loadAppConfig } from "../config/load-app.js";
import { outputDir } from "../config/paths.js";
import { renderSet } from "../renderer/render-set.js";
import { handleCliError, parseVerbose } from "./shared.js";

const program = new Command();
program
  .requiredOption("--app <id>", "App id")
  .option("--locale <locale>", "Locale")
  .option("--preset <id>", "Preset")
  .option("--scale <n>", "Preview scale", "0.35");
program.parse();
const opts = program.opts();
const verbose = parseVerbose();

async function main() {
  const app = await loadAppConfig(opts.app);
  const result = await renderSet({
    appId: opts.app,
    locale: opts.locale ?? app.defaultLocale,
    presetId: opts.preset ?? app.defaultPreset,
    allowPlaceholders: true,
    previewScale: parseFloat(opts.scale),
  });
  const html = path.join(outputDir(opts.app), "previews", "index.html");
  console.log(`Preview written: ${html}`);
}

main().catch((e) => handleCliError(e, verbose));
