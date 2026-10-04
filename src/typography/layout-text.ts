export interface TextLayoutOptions {
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: number;
  lineHeight: number;
  letterSpacingEm: number;
  maxWidth: number;
  maxLines?: number;
  align: "left" | "center";
  shrinkToFit?: boolean;
  minFontSizeRatio?: number;
}

export interface TextLayoutResult {
  lines: string[];
  fontSize: number;
  lineHeightPx: number;
  totalHeight: number;
  overflow: boolean;
}

/** Approximate average glyph width factor for Latin caps-heavy headlines */
const AVG_CHAR_WIDTH = 0.52;

function estimateLineWidth(text: string, fontSize: number, letterSpacingEm: number): number {
  const spacing = letterSpacingEm * fontSize;
  return text.length * fontSize * AVG_CHAR_WIDTH + spacing * Math.max(0, text.length - 1);
}

function wrapParagraph(
  paragraph: string,
  fontSize: number,
  maxWidth: number,
  letterSpacingEm: number,
): string[] {
  const words = paragraph.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let current = words[0];
  for (let i = 1; i < words.length; i++) {
    const next = `${current} ${words[i]}`;
    if (estimateLineWidth(next, fontSize, letterSpacingEm) <= maxWidth) {
      current = next;
    } else {
      lines.push(current);
      current = words[i];
    }
  }
  lines.push(current);
  return lines;
}

export function layoutText(opts: TextLayoutOptions): TextLayoutResult {
  let fontSize = opts.fontSize;
  const minSize = opts.fontSize * (opts.minFontSizeRatio ?? 0.65);
  const maxLines = opts.maxLines ?? 6;
  let lines: string[] = [];
  let overflow = false;

  const paragraphs = opts.text.split("\n");

  for (let attempt = 0; attempt < 12; attempt++) {
    lines = [];
    for (const p of paragraphs) {
      if (p === "") {
        lines.push("");
        continue;
      }
      lines.push(...wrapParagraph(p, fontSize, opts.maxWidth, opts.letterSpacingEm));
    }
    const lineHeightPx = fontSize * opts.lineHeight;
    if (lines.length <= maxLines) break;
    if (!opts.shrinkToFit || fontSize <= minSize) {
      overflow = true;
      lines = lines.slice(0, maxLines);
      break;
    }
    fontSize *= 0.92;
  }

  const lineHeightPx = fontSize * opts.lineHeight;
  return {
    lines,
    fontSize,
    lineHeightPx,
    totalHeight: lines.length * lineHeightPx,
    overflow,
  };
}

export function buildTextSvg(
  opts: TextLayoutOptions & { x: number; y: number; fill: string; opacity?: number },
): { svg: string; layout: TextLayoutResult } {
  const layout = layoutText(opts);
  const anchor = opts.align === "center" ? "middle" : "start";
  const x = opts.align === "center" ? opts.x + opts.maxWidth / 2 : opts.x;

  const tspans = layout.lines
    .map((line, i) => {
      const dy = i === 0 ? 0 : layout.lineHeightPx;
      return `<tspan x="${x}" dy="${dy}">${escapeXml(line)}</tspan>`;
    })
    .join("");

  const fontFamily = opts.fontFamily.replace(/'/g, "&apos;");
  const svg = `<text
    x="${x}"
    y="${opts.y + layout.fontSize}"
    text-anchor="${anchor}"
    font-family='${fontFamily}'
    font-size="${layout.fontSize}"
    font-weight="${opts.fontWeight}"
    fill="${opts.fill}"
    opacity="${opts.opacity ?? 1}"
    letter-spacing="${opts.letterSpacingEm}em"
  >${tspans}</text>`;

  return { svg, layout };
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
