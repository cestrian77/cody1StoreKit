import path from "node:path";
import sharp from "sharp";
import { resolveBackground } from "../backgrounds/presets.js";
import { buildBackgroundSvg } from "../backgrounds/render-background.js";
import { resolveLocaleKey } from "../localisation/resolve.js";
import { getTemplate } from "../templates/index.js";
import { buildTextSvg } from "../typography/layout-text.js";
import { resolveLength } from "../utils/relative.js";
import type { RenderResult, RenderScreenInput } from "./types.js";
import { compositeCentered, compositeLayers, svgToPng } from "./compositor.js";
import { renderDeviceWithScreenshot } from "./render-device.js";
import { resolveDeviceForPreset } from "./resolve-device.js";

const FEATURE_ICONS: Record<string, string> = {
  cloud: "☁️",
  offline: "📴",
  account: "👤",
  unlimited: "∞",
  free: "✓",
  siri: "🎙",
  action: "⚡",
  lock: "🔒",
};

export async function renderScreen(
  input: RenderScreenInput,
): Promise<RenderResult> {
  const warnings: string[] = [];
  const templateId =
    input.screen.template ?? input.app.template ?? "utility-clean";
  const template = getTemplate(templateId);
  const preset = input.preset;

  const scale = input.previewScale ?? 1;
  const W = Math.round(preset.width * scale);
  const H = Math.round(preset.height * scale);

  const headline = resolveLocaleKey(
    input.locale,
    input.screen.copy.headline,
  );
  const subhead = input.screen.copy.subhead
    ? resolveLocaleKey(input.locale, input.screen.copy.subhead)
    : undefined;

  const layoutType = input.screen.layout?.type ?? "hero-device";
  const textAlign =
    input.screen.layout?.textAlign ?? template.layout.defaultTextAlign;
  const typo = template.typography;
  const isMac = preset.platform === "mac";
  const paddingX = W * (isMac ? 0.06 : template.layout.paddingXRatio);
  const headlineTop = isMac ? 0.06 : template.headlineTopRatio;
  const headlineSizeRatio = isMac
    ? typo.headlineSizeRatio * 0.55
    : typo.headlineSizeRatio;
  const subheadSizeRatio = isMac
    ? typo.subheadSizeRatio * 0.65
    : typo.subheadSizeRatio;

  const bgConfig = resolveBackground(input.screen.background);
  const bgSvg = buildBackgroundSvg(W, H, bgConfig, {
    intensity: template.decorativeIntensity,
    style: template.decorStyle,
  });
  const bgLayer = await svgToPng(bgSvg, W, H);

  const headlineMaxW = resolveLength(
    input.screen.layout?.headlineMaxWidth,
    W,
    template.layout.headlineMaxWidthDefault,
  );
  const subheadMaxW = resolveLength(
    input.screen.layout?.subheadMaxWidth,
    W,
    template.layout.subheadMaxWidthDefault,
  );

  const headlineSize = W * headlineSizeRatio;
  const { svg: headlineSvg, layout: headlineLayout } = buildTextSvg({
    text: headline,
    fontSize: headlineSize,
    fontFamily: typo.headlineFontFamily,
    fontWeight: typo.headlineWeight,
    lineHeight: typo.headlineLineHeight,
    letterSpacingEm: typo.headlineLetterSpacing,
    maxWidth: headlineMaxW,
    maxLines: 4,
    align: textAlign,
    shrinkToFit: true,
    x: paddingX,
    y: H * headlineTop,
    fill: typo.headlineColor,
  });
  if (headlineLayout.overflow) {
    warnings.push(`Screen ${input.screen.id}: headline text may overflow`);
  }

  let subheadSvg = "";
  if (subhead) {
    const subY =
      H * headlineTop +
      headlineLayout.totalHeight +
      H * template.subheadGapRatio;
    const { svg, layout: subLayout } = buildTextSvg({
      text: subhead,
      fontSize: W * subheadSizeRatio,
      fontFamily: typo.subheadFontFamily,
      fontWeight: typo.subheadWeight,
      lineHeight: typo.subheadLineHeight,
      letterSpacingEm: 0,
      maxWidth: subheadMaxW,
      maxLines: 3,
      align: textAlign,
      shrinkToFit: true,
      x: paddingX,
      y: subY,
      fill: typo.subheadColor,
      opacity: typo.subheadOpacity,
    });
    subheadSvg = svg;
    if (subLayout.overflow) {
      warnings.push(`Screen ${input.screen.id}: subhead text may overflow`);
    }
  }

  let featureSvg = "";
  if (layoutType === "feature-list" && input.screen.features?.length) {
    featureSvg = buildFeatureListSvg(
      input,
      W,
      H,
      template,
      paddingX,
      textAlign,
    );
  }
  if (layoutType === "feature-cards" && input.screen.featureCards?.length) {
    featureSvg = buildFeatureCardsSvg(input, W, H, template, paddingX);
  }

  const textLayerSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    ${headlineSvg}
    ${subheadSvg}
    ${featureSvg}
  </svg>`;
  const textLayer = await svgToPng(textLayerSvg, W, H);

  const layers: { input: Buffer; top?: number; left?: number }[] = [
    { input: bgLayer },
    { input: textLayer },
  ];

  if (
    (layoutType === "hero-device" || layoutType === "feature-cards") &&
    input.screen.screenshot &&
    input.screen.device
  ) {
    const device = resolveDeviceForPreset(
      input.screen.device,
      preset,
    )!;
    const deviceBaseWidth = W * device.scale;
    const deviceBuf = await renderDeviceWithScreenshot(
      input.screenshotPath,
      device,
      deviceBaseWidth,
    );
    const deviceLayer = await compositeCentered(
      W,
      H,
      deviceBuf,
      device.x * W,
      device.y * H,
    );
    layers.push({ input: deviceLayer });
  }

  const buffer = await compositeLayers(W, H, layers);

  return { buffer, width: W, height: H, warnings };
}

function buildFeatureListSvg(
  input: RenderScreenInput,
  W: number,
  H: number,
  template: ReturnType<typeof getTemplate>,
  paddingX: number,
  align: "left" | "center",
): string {
  const features = input.screen.features ?? [];
  const typo = template.typography;
  const startY = H * template.layout.featureListStartRatio;
  const gap = H * 0.075;
  const maxW = W - paddingX * 2;
  let y = startY;
  const blocks: string[] = [];

  for (const f of features) {
    const title = resolveLocaleKey(input.locale, f.titleKey);
    const body = f.bodyKey
      ? resolveLocaleKey(input.locale, f.bodyKey)
      : undefined;
    const icon = f.icon ? (FEATURE_ICONS[f.icon] ?? "•") : "•";
    const x = align === "center" ? W / 2 : paddingX + 28;
    const anchor = align === "center" ? "middle" : "start";

    blocks.push(
      `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${W * typo.featureTitleSizeRatio}" font-weight="700" fill="${typo.headlineColor}" font-family='${escapeFontFamily(typo.headlineFontFamily)}'>${icon}  ${escapeXml(title)}</text>`,
    );
    y += W * typo.featureTitleSizeRatio * 1.4;
    if (body) {
      blocks.push(
        `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${W * typo.featureBodySizeRatio}" font-weight="500" fill="${typo.subheadColor}" opacity="0.85" font-family='${escapeFontFamily(typo.subheadFontFamily)}'>${escapeXml(body)}</text>`,
      );
      y += W * typo.featureBodySizeRatio * 1.8;
    }
    y += gap;
  }

  return blocks.join("\n");
}

function buildFeatureCardsSvg(
  input: RenderScreenInput,
  W: number,
  H: number,
  template: ReturnType<typeof getTemplate>,
  paddingX: number,
): string {
  const cards = input.screen.featureCards ?? [];
  if (cards.length === 0) return "";
  const cardW = (W - paddingX * 2 - 24 * (cards.length - 1)) / cards.length;
  const cardH = H * 0.12;
  const y = H * template.layout.featureCardsYRatio;
  const typo = template.typography;
  const cardStyle = template.featureCards;
  const parts: string[] = [];

  cards.forEach((card, i) => {
    const x = paddingX + i * (cardW + 24);
    const title = resolveLocaleKey(input.locale, card.titleKey);
    const sub = card.subtitleKey
      ? resolveLocaleKey(input.locale, card.subtitleKey)
      : undefined;
    const icon = card.icon ? (FEATURE_ICONS[card.icon] ?? "") : "";
    parts.push(
      `<rect x="${x}" y="${y}" width="${cardW}" height="${cardH}" rx="${cardStyle.borderRadius}" fill="${cardStyle.fill}" opacity="${cardStyle.fillOpacity}"/>`,
    );
    parts.push(
      `<text x="${x + cardW / 2}" y="${y + cardH * 0.42}" text-anchor="middle" font-size="${W * 0.04}" font-family='${escapeFontFamily(typo.headlineFontFamily)}'>${icon}</text>`,
    );
    parts.push(
      `<text x="${x + cardW / 2}" y="${y + cardH * 0.68}" text-anchor="middle" font-size="${W * 0.028}" font-weight="700" fill="${cardStyle.titleColor}" font-family='${escapeFontFamily(typo.headlineFontFamily)}'>${escapeXml(title)}</text>`,
    );
    if (sub) {
      parts.push(
        `<text x="${x + cardW / 2}" y="${y + cardH * 0.88}" text-anchor="middle" font-size="${W * 0.022}" fill="${cardStyle.subtitleColor}" font-family='${escapeFontFamily(typo.subheadFontFamily)}'>${escapeXml(sub)}</text>`,
      );
    }
  });

  return parts.join("\n");
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeFontFamily(s: string): string {
  return s.replace(/'/g, "&apos;");
}

export async function verifyPngDimensions(
  buffer: Buffer,
  expectedW: number,
  expectedH: number,
): Promise<void> {
  const meta = await sharp(buffer).metadata();
  if (meta.width !== expectedW || meta.height !== expectedH) {
    throw new Error(
      `Output dimension mismatch: got ${meta.width}×${meta.height}, expected ${expectedW}×${expectedH}`,
    );
  }
}
