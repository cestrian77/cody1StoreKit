import type { BackgroundConfig } from "../schemas/app-config.js";
import { resolveBackground } from "./presets.js";

function angleToCoords(angleDeg: number, w: number, h: number) {
  const rad = (angleDeg * Math.PI) / 180;
  const cx = w / 2;
  const cy = h / 2;
  const len = Math.sqrt(w * w + h * h) / 2;
  const x1 = cx - Math.cos(rad) * len;
  const y1 = cy - Math.sin(rad) * len;
  const x2 = cx + Math.cos(rad) * len;
  const y2 = cy + Math.sin(rad) * len;
  return { x1, y1, x2, y2 };
}

export function buildBackgroundSvg(
  width: number,
  height: number,
  config?: BackgroundConfig,
  templateDecor?: "minimal" | "medium" | "high",
): string {
  const bg = resolveBackground(config);
  let defs = "";
  let fill = "";

  if (bg.solid) {
    fill = `<rect width="100%" height="100%" fill="${bg.solid}"/>`;
  } else if (bg.gradient) {
    const g = bg.gradient;
    const id = "bgGrad";
    const stops = g.stops
      .map(
        (s) =>
          `<stop offset="${s.offset * 100}%" stop-color="${s.color}"/>`,
      )
      .join("");
    if (g.type === "linear") {
      const { x1, y1, x2, y2 } = angleToCoords(g.angle ?? 180, width, height);
      defs = `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" gradientUnits="userSpaceOnUse">${stops}</linearGradient>`;
    } else {
      const cx = (g.cx ?? 0.5) * width;
      const cy = (g.cy ?? 0.35) * height;
      const r = (g.r ?? 0.8) * Math.max(width, height);
      defs = `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}" gradientUnits="userSpaceOnUse">${stops}</radialGradient>`;
    }
    fill = `<rect width="100%" height="100%" fill="url(#${id})"/>`;
  }

  let decor = "";
  if (templateDecor === "medium" || templateDecor === "high") {
    decor += `<circle cx="${width * 0.85}" cy="${height * 0.12}" r="${width * 0.18}" fill="white" opacity="0.08"/>`;
    decor += `<circle cx="${width * 0.1}" cy="${height * 0.88}" r="${width * 0.22}" fill="white" opacity="0.06"/>`;
  }
  if (templateDecor === "high") {
    decor += `<ellipse cx="${width * 0.5}" cy="${height * 0.55}" rx="${width * 0.45}" ry="${height * 0.25}" fill="url(#glow)" opacity="0.35"/>`;
    defs += `<radialGradient id="glow"><stop offset="0%" stop-color="#ffffff" stop-opacity="0.5"/><stop offset="100%" stop-color="#ffffff" stop-opacity="0"/></radialGradient>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>${defs}</defs>
  ${fill}
  ${decor}
</svg>`;
}
