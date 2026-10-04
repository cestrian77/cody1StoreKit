import sharp from "sharp";

export async function compositeLayers(
  width: number,
  height: number,
  layers: { input: Buffer; top?: number; left?: number; blend?: sharp.Blend }[],
): Promise<Buffer> {
  const base = sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });

  const composites = layers.map((l) => ({
    input: l.input,
    top: l.top ?? 0,
    left: l.left ?? 0,
    blend: l.blend ?? "over",
  }));

  return base.composite(composites).png().toBuffer();
}

export async function svgToPng(
  svg: string,
  width: number,
  height: number,
): Promise<Buffer> {
  return sharp(Buffer.from(svg))
    .resize(width, height, { fit: "fill" })
    .png()
    .toBuffer();
}

export async function rotateBuffer(
  input: Buffer,
  angleDeg: number,
): Promise<Buffer> {
  if (Math.abs(angleDeg) < 0.01) return input;
  return sharp(input)
    .rotate(angleDeg, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}
