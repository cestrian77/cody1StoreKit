/** Generic vector device frames (not third-party mockups). */

export type DeviceFrameType = "iphone" | "ipad" | "mac";

export interface DeviceFrameSpec {
  type: DeviceFrameType;
  /** Total frame width in layout units */
  frameWidth: number;
  frameHeight: number;
  screenX: number;
  screenY: number;
  screenWidth: number;
  screenHeight: number;
  cornerRadius: number;
  bezel: number;
}

export const DEVICE_FRAMES: Record<DeviceFrameType, DeviceFrameSpec> = {
  iphone: {
    type: "iphone",
    frameWidth: 390,
    frameHeight: 844,
    screenX: 12,
    screenY: 14,
    screenWidth: 366,
    screenHeight: 792,
    cornerRadius: 48,
    bezel: 12,
  },
  ipad: {
    type: "ipad",
    frameWidth: 820,
    frameHeight: 1180,
    screenX: 24,
    screenY: 24,
    screenWidth: 772,
    screenHeight: 1132,
    cornerRadius: 28,
    bezel: 24,
  },
  mac: {
    type: "mac",
    frameWidth: 960,
    frameHeight: 600,
    screenX: 40,
    screenY: 28,
    screenWidth: 880,
    screenHeight: 550,
    cornerRadius: 10,
    bezel: 6,
  },
};

export function buildDeviceFrameSvg(
  spec: DeviceFrameSpec,
  appearance: "light" | "dark",
  shadow: boolean,
): string {
  const { frameWidth: w, frameHeight: h } = spec;
  const body =
    appearance === "dark"
      ? { fill: "#1C1C1E", stroke: "#3A3A3C", base: "#2C2C2E" }
      : { fill: "#E8E8ED", stroke: "#C7C7CC", base: "#D1D1D6" };
  const screenFill = "#000000";

  const shadowFilter = shadow
    ? `<filter id="deviceShadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="24" stdDeviation="28" flood-color="#000000" flood-opacity="0.35"/>
      </filter>`
    : "";

  const dynamicIsland =
    spec.type === "iphone"
      ? `<rect x="${w / 2 - 52}" y="18" width="104" height="28" rx="14" fill="#000"/>`
      : "";

  const macLid =
    spec.type === "mac"
      ? `<rect x="8" y="8" width="${w - 16}" height="${h - 72}" rx="14" fill="${body.fill}" stroke="${body.stroke}" stroke-width="2"/>
    <rect x="${spec.screenX}" y="${spec.screenY}" width="${spec.screenWidth}" height="${spec.screenHeight}" rx="${spec.cornerRadius}" fill="${screenFill}"/>
    <rect x="${w * 0.2}" y="${h - 56}" width="${w * 0.6}" height="10" rx="5" fill="${body.base}"/>
    <rect x="${w * 0.08}" y="${h - 48}" width="${w * 0.84}" height="40" rx="8" fill="${body.base}" stroke="${body.stroke}" stroke-width="1"/>`
      : `<rect x="0" y="0" width="${w}" height="${h}" rx="${spec.cornerRadius}" fill="${body.fill}" stroke="${body.stroke}" stroke-width="2"/>
    <rect x="${spec.screenX}" y="${spec.screenY}" width="${spec.screenWidth}" height="${spec.screenHeight}" rx="${spec.cornerRadius - spec.bezel}" fill="${screenFill}"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>${shadowFilter}</defs>
  <g filter="${shadow ? "url(#deviceShadow)" : "none"}">
    ${macLid}
    ${dynamicIsland}
  </g>
</svg>`;
}
