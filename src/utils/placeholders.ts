import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { placeholderManifestPath, screenshotsRawDir } from "../config/paths.js";

const PLACEHOLDER_MARKER = "DEMO PLACEHOLDER — NOT FOR APP STORE USE";

export interface PlaceholderManifest {
  /** Filenames that are still demo placeholders */
  files: string[];
  /** SHA-256 of generated placeholder PNGs (filename → hash) */
  hashes?: Record<string, string>;
  updatedAt: string;
}

async function fileSha256(filePath: string): Promise<string> {
  const buf = await fs.readFile(filePath);
  return createHash("sha256").update(buf).digest("hex");
}

export async function readPlaceholderManifest(
  appId: string,
): Promise<PlaceholderManifest> {
  const p = placeholderManifestPath(appId);
  try {
    const raw = await fs.readFile(p, "utf-8");
    const parsed = JSON.parse(raw) as PlaceholderManifest;
    return {
      files: parsed.files ?? [],
      hashes: parsed.hashes ?? {},
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return { files: [], hashes: {}, updatedAt: new Date().toISOString() };
  }
}

export async function writePlaceholderManifest(
  appId: string,
  manifest: PlaceholderManifest,
): Promise<void> {
  await fs.writeFile(
    placeholderManifestPath(appId),
    JSON.stringify(manifest, null, 2),
    "utf-8",
  );
}

async function renderPlaceholderBuffer(label: string): Promise<Buffer> {
  const w = 1170;
  const h = 2532;
  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#1e293b"/>
        <stop offset="100%" stop-color="#0f172a"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <rect x="40" y="40" width="${w - 80}" height="${h - 80}" rx="24" fill="none" stroke="#f97316" stroke-width="8" stroke-dasharray="16 12"/>
    <text x="50%" y="42%" text-anchor="middle" fill="#f97316" font-family="system-ui,sans-serif" font-size="42" font-weight="800">DEMO PLACEHOLDER</text>
    <text x="50%" y="48%" text-anchor="middle" fill="#fb923c" font-family="system-ui,sans-serif" font-size="28" font-weight="700">NOT FOR APP STORE USE</text>
    <text x="50%" y="56%" text-anchor="middle" fill="#94a3b8" font-family="system-ui,sans-serif" font-size="22">${escapeSvg(label)}</text>
    <text x="50%" y="62%" text-anchor="middle" fill="#64748b" font-family="system-ui,sans-serif" font-size="16">Replace with a genuine simulator screenshot</text>
  </svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

export async function placeholderFileHash(label: string): Promise<string> {
  const buf = await renderPlaceholderBuffer(label);
  return createHash("sha256").update(buf).digest("hex");
}

export async function createPlaceholderScreenshot(
  filePath: string,
  label: string,
): Promise<string> {
  const buf = await renderPlaceholderBuffer(label);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, buf);
  return createHash("sha256").update(buf).digest("hex");
}

function escapeSvg(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function ensureDevScreenshots(
  appId: string,
  requiredFiles: string[],
): Promise<PlaceholderManifest> {
  const rawDir = screenshotsRawDir(appId);
  await fs.mkdir(rawDir, { recursive: true });
  const manifest = await readPlaceholderManifest(appId);
  const placeholderSet = new Set(manifest.files);
  const hashes = { ...(manifest.hashes ?? {}) };

  for (const file of requiredFiles) {
    const full = path.join(rawDir, file);
    try {
      await fs.access(full);
      const hash = await fileSha256(full);
      const known = hashes[file];
      const expected = await placeholderFileHash(file);
      if (hash === known || hash === expected) {
        hashes[file] = expected;
        placeholderSet.add(file);
      } else {
        placeholderSet.delete(file);
        delete hashes[file];
      }
    } catch {
      const hash = await createPlaceholderScreenshot(full, file);
      hashes[file] = hash;
      placeholderSet.add(file);
    }
  }

  const updated: PlaceholderManifest = {
    files: [...placeholderSet].sort(),
    hashes,
    updatedAt: new Date().toISOString(),
  };
  await writePlaceholderManifest(appId, updated);
  return updated;
}

export function isPlaceholderFile(
  manifest: PlaceholderManifest,
  filename: string,
): boolean {
  return manifest.files.includes(filename);
}

/** Record that a file in screenshots/raw is a genuine upload, not a dev placeholder. */
export async function markScreenshotAsGenuine(
  appId: string,
  filename: string,
): Promise<void> {
  const manifest = await readPlaceholderManifest(appId);
  if (!manifest.files.includes(filename) && !manifest.hashes?.[filename]) {
    return;
  }
  const files = manifest.files.filter((f) => f !== filename);
  const hashes = { ...(manifest.hashes ?? {}) };
  delete hashes[filename];
  await writePlaceholderManifest(appId, {
    files,
    hashes,
    updatedAt: new Date().toISOString(),
  });
}

export function formatPlaceholderError(
  appId: string,
  filename: string,
  screenId: string,
): string {
  return `Generation failed

Missing or placeholder source screenshot:

apps/${appId}/screenshots/raw/${filename}

Required by:
${screenId}

Add a genuine screenshot and try again.

${PLACEHOLDER_MARKER}`;
}
