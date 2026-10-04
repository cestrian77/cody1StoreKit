#!/usr/bin/env node
import { Command } from "commander";
import fs from "node:fs/promises";
import path from "node:path";
import { loadAppConfig } from "../config/load-app.js";
import { outputDir, getProjectRoot, STOREKIT_VERSION } from "../config/paths.js";
import { loadLocale } from "../localisation/resolve.js";
import { getPreset } from "../presets/output-presets.js";
import { handleCliError, parseVerbose } from "./shared.js";

const program = new Command();
program
  .requiredOption("--app <id>", "App id")
  .option("--locale <locale>", "Locale")
  .option("--preset <id>", "Preset")
  .option("--zip", "Create zip archive");
program.parse();
const opts = program.opts();
const verbose = parseVerbose();

async function main() {
  const app = await loadAppConfig(opts.app);
  const locale = opts.locale ?? app.defaultLocale;
  const presetId = opts.preset ?? app.defaultPreset;
  const preset = getPreset(presetId);
  const srcDir = path.join(outputDir(opts.app), locale, presetId);
  const pkgDir = path.join(
    getProjectRoot(),
    "dist",
    `${opts.app}-${locale}`,
  );
  const shotsDir = path.join(pkgDir, "screenshots");
  const metaDir = path.join(pkgDir, "metadata");

  await fs.mkdir(shotsDir, { recursive: true });
  await fs.mkdir(metaDir, { recursive: true });

  const entries = await fs.readdir(srcDir);
  const pngs = entries.filter((e) => e.endsWith(".png"));
  if (pngs.length === 0) {
    throw new Error(
      `No generated screenshots in ${srcDir}. Run npm run generate first.`,
    );
  }

  const generatedFiles: { file: string; width: number; height: number }[] =
    [];
  for (const f of pngs) {
    await fs.copyFile(path.join(srcDir, f), path.join(shotsDir, f));
    generatedFiles.push({
      file: f,
      width: preset.width,
      height: preset.height,
    });
  }

  const meta = app.metadata?.[locale];
  const metadataJson = meta ?? {};
  await fs.writeFile(
    path.join(metaDir, "metadata.json"),
    JSON.stringify(metadataJson, null, 2),
  );
  if (metadataJson.description) {
    await fs.writeFile(
      path.join(metaDir, "description.txt"),
      metadataJson.description,
    );
  }
  if (metadataJson.keywords) {
    await fs.writeFile(
      path.join(metaDir, "keywords.txt"),
      metadataJson.keywords.join(", "),
    );
  }

  const manifest = {
    app: opts.app,
    locale,
    preset: presetId,
    dimensions: { width: preset.width, height: preset.height },
    generatedAt: new Date().toISOString(),
    storekitVersion: STOREKIT_VERSION,
    files: generatedFiles,
  };
  await fs.writeFile(
    path.join(pkgDir, "manifest.json"),
    JSON.stringify(manifest, null, 2),
  );

  console.log(`Package created: ${pkgDir}`);

  if (opts.zip) {
    const { execSync } = await import("node:child_process");
    const zipPath = `${pkgDir}.zip`;
    execSync(`cd "${path.dirname(pkgDir)}" && zip -r "${zipPath}" "${path.basename(pkgDir)}"`, {
      stdio: "inherit",
    });
    console.log(`ZIP: ${zipPath}`);
  }
}

main().catch((e) => handleCliError(e, verbose));
