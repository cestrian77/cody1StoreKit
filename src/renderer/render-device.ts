import sharp from "sharp";
import {
  DEVICE_FRAMES,
  buildDeviceFrameSvg,
} from "../devices/frame.js";
import type { DeviceConfig } from "../schemas/app-config.js";
import { compositeLayers, rotateBuffer, svgToPng } from "./compositor.js";

export async function renderDeviceWithScreenshot(
  screenshotPath: string,
  device: DeviceConfig,
  targetDeviceWidth: number,
): Promise<Buffer> {
  const spec = DEVICE_FRAMES[device.type];
  const scale = targetDeviceWidth / spec.frameWidth;
  const frameW = Math.round(spec.frameWidth * scale);
  const frameH = Math.round(spec.frameHeight * scale);

  const screenW = Math.round(spec.screenWidth * scale);
  const screenH = Math.round(spec.screenHeight * scale);
  const screenX = Math.round(spec.screenX * scale);
  const screenY = Math.round(spec.screenY * scale);
  const inset = device.screenshotInset ?? 0;
  const innerW = Math.round(screenW * (1 - inset * 2));
  const innerH = Math.round(screenH * (1 - inset * 2));
  const innerX = screenX + Math.round(screenW * inset);
  const innerY = screenY + Math.round(screenH * inset);

  let screenshot = sharp(screenshotPath);
  const meta = await screenshot.metadata();
  if (!meta.width || !meta.height) {
    throw new Error(`Screenshot could not be decoded: ${screenshotPath}`);
  }

  const crop = device.screenshotCrop;
  const cw = meta.width;
  const ch = meta.height;
  const left = Math.round((crop?.left ?? 0) * cw);
  const top = Math.round((crop?.top ?? 0) * ch);
  const right = Math.round((crop?.right ?? 0) * cw);
  const bottom = Math.round((crop?.bottom ?? 0) * ch);
  const extractW = Math.max(1, cw - left - right);
  const extractH = Math.max(1, ch - top - bottom);

  const screenImage = await screenshot
    .extract({ left, top, width: extractW, height: extractH })
    .resize(innerW, innerH, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();

  const radius = Math.round((spec.cornerRadius - spec.bezel) * scale);
  const roundedScreen = await sharp(screenImage)
    .composite([
      {
        input: Buffer.from(
          `<svg><rect x="0" y="0" width="${innerW}" height="${innerH}" rx="${radius}" ry="${radius}"/></svg>`,
        ),
        blend: "dest-in",
      },
    ])
    .png()
    .toBuffer();

  const frameSvg = buildDeviceFrameSvg(
    spec,
    device.appearance ?? "dark",
    device.shadow ?? true,
  );
  const framePng = await svgToPng(frameSvg, frameW, frameH);

  const deviceComposite = await compositeLayers(frameW, frameH, [
    { input: framePng },
    { input: roundedScreen, left: innerX, top: innerY },
  ]);

  return rotateBuffer(deviceComposite, device.rotation ?? 0);
}
