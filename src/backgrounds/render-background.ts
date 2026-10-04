import type { BackgroundConfig } from "../schemas/app-config.js";
import { buildTemplateDecorSvg } from "../templates/decor.js";
import type { DecorStyle } from "../templates/types.js";
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
  decor?: {
    intensity: "minimal" | "medium" | "high";
    style: DecorStyle;
  },
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

  let decorMarkup = "";
  if (decor) {
    const { defs: decorDefs, markup } = buildTemplateDecorSvg(
      width,
      height,
      decor.style,
      decor.intensity,
    );
    defs += decorDefs;
    decorMarkup = markup;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>${defs}</defs>
  ${fill}
  ${decorMarkup}
</svg>`;
}
