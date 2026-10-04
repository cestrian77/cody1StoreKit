import type { DecorStyle } from "./types.js";

function intensityScale(
  intensity: "minimal" | "medium" | "high",
): number {
  if (intensity === "minimal") return 0.55;
  if (intensity === "medium") return 0.85;
  return 1;
}

export function buildTemplateDecorSvg(
  width: number,
  height: number,
  style: DecorStyle,
  intensity: "minimal" | "medium" | "high",
): { defs: string; markup: string } {
  if (style === "none") {
    return { defs: "", markup: "" };
  }

  const s = intensityScale(intensity);
  let defs = "";
  let markup = "";

  switch (style) {
    case "soft-orbs":
      markup += `<circle cx="${width * 0.88}" cy="${height * 0.1}" r="${width * 0.2 * s}" fill="white" opacity="${0.07 * s}"/>`;
      markup += `<circle cx="${width * 0.08}" cy="${height * 0.9}" r="${width * 0.24 * s}" fill="white" opacity="${0.05 * s}"/>`;
      if (intensity === "high") {
        markup += `<circle cx="${width * 0.72}" cy="${height * 0.78}" r="${width * 0.12 * s}" fill="#A5F3FC" opacity="0.12"/>`;
      }
      break;
    case "glow-center":
      defs += `<radialGradient id="tplGlow"><stop offset="0%" stop-color="#ffffff" stop-opacity="${0.45 * s}"/><stop offset="100%" stop-color="#ffffff" stop-opacity="0"/></radialGradient>`;
      markup += `<ellipse cx="${width * 0.5}" cy="${height * 0.52}" rx="${width * 0.48}" ry="${height * 0.28}" fill="url(#tplGlow)" opacity="${0.35 * s}"/>`;
      markup += `<circle cx="${width * 0.15}" cy="${height * 0.18}" r="${width * 0.14 * s}" fill="#FDE68A" opacity="${0.14 * s}"/>`;
      break;
    case "starfield":
      for (let i = 0; i < 18; i++) {
        const x = ((i * 47) % 97) / 100;
        const y = ((i * 31) % 89) / 100;
        const r = (1.2 + (i % 3)) * s;
        const op = (0.15 + (i % 5) * 0.04) * s;
        markup += `<circle cx="${width * x}" cy="${height * y}" r="${r}" fill="white" opacity="${op}"/>`;
      }
      break;
    case "neon-grid":
      defs += `<pattern id="neonGrid" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M 48 0 L 0 0 0 48" fill="none" stroke="#22D3EE" stroke-width="1" opacity="${0.12 * s}"/></pattern>`;
      markup += `<rect width="100%" height="100%" fill="url(#neonGrid)" opacity="${0.65 * s}"/>`;
      markup += `<ellipse cx="${width * 0.5}" cy="${height * 0.2}" rx="${width * 0.35}" ry="${height * 0.08}" fill="#A855F7" opacity="${0.2 * s}"/>`;
      break;
    case "diagonal-bands":
      defs += `<linearGradient id="diagBand" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#FBBF24" stop-opacity="0"/><stop offset="50%" stop-color="#FBBF24" stop-opacity="${0.12 * s}"/><stop offset="100%" stop-color="#FBBF24" stop-opacity="0"/></linearGradient>`;
      markup += `<rect x="${-width * 0.2}" y="${height * 0.15}" width="${width * 1.4}" height="${height * 0.18}" fill="url(#diagBand)" transform="rotate(-8 ${width / 2} ${height / 2})"/>`;
      markup += `<rect x="${-width * 0.2}" y="${height * 0.62}" width="${width * 1.4}" height="${height * 0.14}" fill="url(#diagBand)" transform="rotate(-8 ${width / 2} ${height / 2})" opacity="0.7"/>`;
      break;
    case "corner-wash":
      defs += `<radialGradient id="cornerWash" cx="0" cy="0" r="1"><stop offset="0%" stop-color="#F472B6" stop-opacity="${0.22 * s}"/><stop offset="100%" stop-color="#F472B6" stop-opacity="0"/></radialGradient>`;
      markup += `<rect width="${width * 0.55}" height="${height * 0.45}" fill="url(#cornerWash)"/>`;
      markup += `<circle cx="${width * 0.92}" cy="${height * 0.88}" r="${width * 0.22}" fill="#38BDF8" opacity="${0.08 * s}"/>`;
      break;
    case "wave-lines":
      markup += `<path d="M0 ${height * 0.22} Q ${width * 0.25} ${height * 0.16} ${width * 0.5} ${height * 0.22} T ${width} ${height * 0.22}" fill="none" stroke="white" stroke-width="3" opacity="${0.1 * s}"/>`;
      markup += `<path d="M0 ${height * 0.28} Q ${width * 0.3} ${height * 0.34} ${width * 0.55} ${height * 0.26} T ${width} ${height * 0.3}" fill="none" stroke="white" stroke-width="2" opacity="${0.08 * s}"/>`;
      break;
  }

  return { defs, markup };
}
