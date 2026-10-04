/**
 * Build Cody1StoreKit icons from the master logo.
 * Removes the outer black JPEG matte so macOS Dock gets proper alpha.
 */
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const masterJpg = path.join(root, "src/ui/assets/cody1-logo.jpg");
const masterPng = path.join(root, "src/ui/assets/cody1-logo.png");
const buildDir = path.join(root, "build");
const iconset = path.join(buildDir, "icon.iconset");

/** Pixels connected to the image edge through near-pure-black matte. */
function matteMask(rgba, width, height) {
  const bg = new Uint8Array(width * height);
  const queue = [];

  const isMatte = (i) => {
    const r = rgba[i];
    const g = rgba[i + 1];
    const b = rgba[i + 2];
    return Math.max(r, g, b) <= 12;
  };

  const tryPush = (x, y) => {
    const idx = y * width + x;
    if (bg[idx]) return;
    const i = idx * 4;
    if (!isMatte(i)) return;
    bg[idx] = 1;
    queue.push(idx);
  };

  for (let x = 0; x < width; x++) {
    tryPush(x, 0);
    tryPush(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    tryPush(0, y);
    tryPush(width - 1, y);
  }

  while (queue.length > 0) {
    const idx = queue.pop();
    if (idx === undefined) break;
    const x = idx % width;
    const y = (idx - x) / width;
    if (x > 0) tryPush(x - 1, y);
    if (x < width - 1) tryPush(x + 1, y);
    if (y > 0) tryPush(x, y - 1);
    if (y < height - 1) tryPush(x, y + 1);
  }

  return bg;
}

async function logoWithTransparency() {
  const { data, info } = await sharp(masterJpg)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const mask = matteMask(data, info.width, info.height);
  const out = Buffer.from(data);
  for (let idx = 0; idx < mask.length; idx++) {
    if (mask[idx]) out[idx * 4 + 3] = 0;
  }

  return sharp(out, {
    raw: { width: info.width, height: info.height, channels: 4 },
  }).png();
}

async function writePng(pipeline, dest) {
  await pipeline.png().toFile(dest);
}

async function main() {
  const logo = await logoWithTransparency();
  await writePng(logo, masterPng);

  fs.mkdirSync(iconset, { recursive: true });

  const entries = [
    ["icon_16x16.png", 16],
    ["icon_16x16@2x.png", 32],
    ["icon_32x32.png", 32],
    ["icon_32x32@2x.png", 64],
    ["icon_128x128.png", 128],
    ["icon_128x128@2x.png", 256],
    ["icon_256x256.png", 256],
    ["icon_256x256@2x.png", 512],
    ["icon_512x512.png", 512],
    ["icon_512x512@2x.png", 1024],
  ];

  for (const [name, size] of entries) {
    await logo.clone().resize(size, size).png().toFile(path.join(iconset, name));
  }

  await logo.clone().resize(1024, 1024).png().toFile(path.join(buildDir, "icon.png"));
  await logo.clone().resize(32, 32).png().toFile(path.join(root, "src/ui/favicon.png"));

  execSync(`iconutil -c icns ${iconset} -o ${path.join(buildDir, "icon.icns")}`);
  console.log("Generated transparent logo + macOS icons");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
