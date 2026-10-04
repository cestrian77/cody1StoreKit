#!/usr/bin/env node
import { Command } from "commander";
import { loadAppConfig } from "../config/load-app.js";
import { validateApp, formatReport } from "../validation/validate-app.js";
import { handleCliError, parseVerbose } from "./shared.js";

const program = new Command();
program
  .requiredOption("--app <id>", "App id")
  .option("--locale <locale>", "Locale")
  .option("--preset <id>", "Preset")
  .option("--dev", "Allow placeholders");
program.parse();
const opts = program.opts();
const verbose = parseVerbose();

async function main() {
  const app = await loadAppConfig(opts.app);
  const report = await validateApp(
    opts.app,
    opts.locale ?? app.defaultLocale,
    opts.preset ?? app.defaultPreset,
    { allowPlaceholders: Boolean(opts.dev) },
  );
  console.log(formatReport(report));
  process.exit(report.valid ? 0 : 1);
}

main().catch((e) => handleCliError(e, verbose));
