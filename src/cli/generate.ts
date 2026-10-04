#!/usr/bin/env node
import { Command } from "commander";
import { listLocales } from "../localisation/resolve.js";
import { OUTPUT_PRESETS } from "../presets/output-presets.js";
import { renderSet } from "../renderer/render-set.js";
import { validateApp, formatReport } from "../validation/validate-app.js";
import { loadAppConfig } from "../config/load-app.js";
import { handleCliError, parseVerbose } from "./shared.js";

const program = new Command();
program
  .name("generate")
  .description("Generate App Store screenshot assets")
  .requiredOption("--app <id>", "App id")
  .option("--locale <locale>", "Locale code")
  .option("--all-locales", "Generate all locales")
  .option("--preset <id>", "Output preset id")
  .option("--all-presets", "All output presets for platform")
  .option("--all", "All locales and presets")
  .option("--dev", "Allow demo placeholders (not for App Store)")
  .option("--preview-scale <n>", "Preview scale 0.1-1", parseFloat);

program.parse();
const opts = program.opts();
const verbose = parseVerbose();

async function main() {
  const app = await loadAppConfig(opts.app);
  const locales: string[] = opts.all || opts.allLocales
    ? await listLocales(opts.app)
    : [opts.locale ?? app.defaultLocale];

  const presetIds: string[] = opts.all || opts.allPresets
    ? Object.keys(OUTPUT_PRESETS)
    : [opts.preset ?? app.defaultPreset];

  const allowPlaceholders = Boolean(opts.dev);
  if (!allowPlaceholders) {
    for (const locale of locales) {
      for (const presetId of presetIds) {
        const report = await validateApp(opts.app, locale, presetId, {
          allowPlaceholders: false,
        });
        if (!report.valid) {
          console.error(formatReport(report));
          process.exit(1);
        }
      }
    }
  }

  for (const locale of locales) {
    for (const presetId of presetIds) {
      const result = await renderSet({
        appId: opts.app,
        locale,
        presetId,
        allowPlaceholders,
        previewScale: opts.previewScale,
      });
      console.log(
        `Generated ${result.files.length} files → ${result.outputDir}`,
      );
      if (result.warnings.length) {
        console.warn(result.warnings.join("\n"));
      }
    }
  }
  console.log("\nReady for App Store Connect.");
}

main().catch((e) => handleCliError(e, verbose));
