import fs from "node:fs/promises";
import path from "node:path";
import type { AppConfig } from "../schemas/app-config.js";
import type { GeneratedFile } from "./render-set.js";

export async function buildHtmlPreview(opts: {
  app: AppConfig;
  locale: string;
  presetId: string;
  files: GeneratedFile[];
  outputPath: string;
}): Promise<void> {
  const relPaths = opts.files.map((f) => {
    const rel = path.relative(path.dirname(opts.outputPath), f.path);
    return rel.split(path.sep).join("/");
  });

  const html = `<!DOCTYPE html>
<html lang="${opts.locale}">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${opts.app.app.name} — App Store Preview</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; }
    header { padding: 24px 32px; display: flex; align-items: center; gap: 16px; border-bottom: 1px solid #1e293b; }
    .icon { width: 56px; height: 56px; border-radius: 14px; background: linear-gradient(135deg,#3b82f6,#8b5cf6); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 22px; }
    h1 { margin: 0; font-size: 1.5rem; }
    .meta { opacity: 0.7; font-size: 0.9rem; }
    .viewport { max-width: 420px; margin: 32px auto; border: 1px solid #334155; border-radius: 24px; overflow: hidden; background: #000; }
    .scroll { display: flex; overflow-x: auto; scroll-snap-type: x mandatory; gap: 0; }
    .scroll img { flex: 0 0 100%; width: 100%; scroll-snap-align: start; display: block; }
    .desktop { padding: 32px; }
    .desktop .scroll img { flex: 0 0 280px; width: 280px; border-radius: 12px; margin-right: 12px; }
  </style>
</head>
<body>
  <header>
    <div class="icon">${opts.app.app.name.charAt(0)}</div>
    <div>
      <h1>${opts.app.app.name}</h1>
      <div class="meta">${opts.locale} · ${opts.presetId}</div>
    </div>
  </header>
  <section class="viewport">
    <div class="scroll">
      ${relPaths.map((p) => `<img src="${p}" alt="screenshot"/>`).join("\n")}
    </div>
  </section>
  <section class="desktop">
    <h2>All screenshots</h2>
    <div class="scroll">
      ${relPaths.map((p) => `<img src="${p}" alt="screenshot"/>`).join("\n")}
    </div>
  </section>
</body>
</html>`;

  await fs.writeFile(opts.outputPath, html, "utf-8");
}
