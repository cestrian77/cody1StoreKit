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

/** Place an image on a transparent canvas, centered at (centerX, centerY), clipping overflow. */
export async function compositeCentered(
  canvasW: number,
  canvasH: number,
  image: Buffer,
  centerX: number,
  centerY: number,
): Promise<Buffer> {
  const meta = await sharp(image).metadata();
  let dw = meta.width ?? 0;
  let dh = meta.height ?? 0;
  if (!dw || !dh) {
    throw new Error("compositeCentered: image has no dimensions");
  }

  let img = image;
  let left = Math.round(centerX - dw / 2);
  let top = Math.round(centerY - dh / 2);

  const cropLeft = Math.max(0, -left);
  const cropTop = Math.max(0, -top);
  const cropRight = Math.max(0, left + dw - canvasW);
  const cropBottom = Math.max(0, top + dh - canvasH);

  if (cropLeft || cropTop || cropRight || cropBottom) {
    const extractW = Math.max(1, dw - cropLeft - cropRight);
    const extractH = Math.max(1, dh - cropTop - cropBottom);
    img = await sharp(image)
      .extract({ left: cropLeft, top: cropTop, width: extractW, height: extractH })
      .png()
      .toBuffer();
    dw = extractW;
    dh = extractH;
    left = Math.max(0, left);
    top = Math.max(0, top);
  }

  if (dw > canvasW || dh > canvasH) {
    const scale = Math.min(canvasW / dw, canvasH / dh);
    dw = Math.max(1, Math.round(dw * scale));
    dh = Math.max(1, Math.round(dh * scale));
    img = await sharp(img).resize(dw, dh).png().toBuffer();
    left = Math.round(centerX - dw / 2);
    top = Math.round(centerY - dh / 2);
    left = Math.max(0, Math.min(left, canvasW - dw));
    top = Math.max(0, Math.min(top, canvasH - dh));
  }

  return compositeLayers(canvasW, canvasH, [{ input: img, left, top }]);
}
