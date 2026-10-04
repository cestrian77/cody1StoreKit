import sharp from "sharp";
import type { GeneratedFile } from "./render-set.js";

export async function buildContactSheet(
  files: GeneratedFile[],
  outputPath: string,
): Promise<void> {
  if (files.length === 0) return;

  const thumbH = 640;
  const thumbs: { input: Buffer; width: number }[] = [];
  for (const f of files) {
    const img = sharp(f.path);
    const resized = await img
      .resize({ height: thumbH, fit: "contain", background: "#111827" })
      .png()
      .toBuffer();
    const meta = await sharp(resized).metadata();
    thumbs.push({ input: resized, width: meta.width ?? thumbH });
  }

  const gap = 24;
  const pad = 32;
  const labelH = 36;
  const totalW =
    pad * 2 +
    thumbs.reduce((s, t) => s + t.width, 0) +
    gap * (thumbs.length - 1);
  const totalH = pad * 2 + thumbH + labelH;

  const composites: sharp.OverlayOptions[] = [];
  let x = pad;
  for (let i = 0; i < thumbs.length; i++) {
    composites.push({ input: thumbs[i].input, top: pad, left: x });
    const labelSvg = Buffer.from(
      `<svg width="${thumbs[i].width}" height="${labelH}"><text x="4" y="24" fill="#e2e8f0" font-family="system-ui" font-size="14">${files[i].screenId}</text></svg>`,
    );
    composites.push({
      input: labelSvg,
      top: pad + thumbH + 4,
      left: x,
    });
    x += thumbs[i].width + gap;
  }

  const bg = sharp({
    create: {
      width: totalW,
      height: totalH,
      channels: 3,
      background: "#0f172a",
    },
  });

  await bg.composite(composites).png().toFile(outputPath);
}
