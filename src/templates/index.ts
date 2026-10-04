export type TemplateId = "utility-clean" | "puzzle" | "arcade";

export interface TemplateTypography {
  headlineFontFamily: string;
  headlineWeight: number;
  headlineSizeRatio: number;
  headlineLineHeight: number;
  headlineLetterSpacing: number;
  subheadFontFamily: string;
  subheadWeight: number;
  subheadSizeRatio: number;
  subheadLineHeight: number;
  subheadOpacity: number;
  headlineColor: string;
  subheadColor: string;
  featureTitleSizeRatio: number;
  featureBodySizeRatio: number;
}

export interface TemplateDefinition {
  id: TemplateId;
  label: string;
  typography: TemplateTypography;
  headlineTopRatio: number;
  subheadGapRatio: number;
  deviceDefaultScale: number;
  decorativeIntensity: "minimal" | "medium" | "high";
}

export const TEMPLATES: Record<TemplateId, TemplateDefinition> = {
  "utility-clean": {
    id: "utility-clean",
    label: "Utility Clean",
    typography: {
      headlineFontFamily:
        'system-ui, -apple-system, "SF Pro Display", "Helvetica Neue", sans-serif',
      headlineWeight: 800,
      headlineSizeRatio: 0.078,
      headlineLineHeight: 1.05,
      headlineLetterSpacing: -0.02,
      subheadFontFamily:
        'system-ui, -apple-system, "SF Pro Text", "Helvetica Neue", sans-serif',
      subheadWeight: 500,
      subheadSizeRatio: 0.034,
      subheadLineHeight: 1.35,
      subheadOpacity: 0.72,
      headlineColor: "#0F172A",
      subheadColor: "#334155",
      featureTitleSizeRatio: 0.032,
      featureBodySizeRatio: 0.026,
    },
    headlineTopRatio: 0.09,
    subheadGapRatio: 0.028,
    deviceDefaultScale: 0.82,
    decorativeIntensity: "minimal",
  },
  puzzle: {
    id: "puzzle",
    label: "Puzzle",
    typography: {
      headlineFontFamily:
        'system-ui, -apple-system, "SF Pro Rounded", "Helvetica Neue", sans-serif',
      headlineWeight: 900,
      headlineSizeRatio: 0.085,
      headlineLineHeight: 1.02,
      headlineLetterSpacing: 0,
      subheadFontFamily:
        'system-ui, -apple-system, "SF Pro Text", sans-serif',
      subheadWeight: 600,
      subheadSizeRatio: 0.036,
      subheadLineHeight: 1.3,
      subheadOpacity: 0.9,
      headlineColor: "#FFFFFF",
      subheadColor: "#F8FAFC",
      featureTitleSizeRatio: 0.034,
      featureBodySizeRatio: 0.028,
    },
    headlineTopRatio: 0.08,
    subheadGapRatio: 0.024,
    deviceDefaultScale: 0.88,
    decorativeIntensity: "medium",
  },
  arcade: {
    id: "arcade",
    label: "Arcade",
    typography: {
      headlineFontFamily:
        'system-ui, -apple-system, "SF Pro Display", sans-serif',
      headlineWeight: 900,
      headlineSizeRatio: 0.09,
      headlineLineHeight: 1,
      headlineLetterSpacing: 0.02,
      subheadFontFamily:
        'system-ui, -apple-system, "SF Pro Text", sans-serif',
      subheadWeight: 600,
      subheadSizeRatio: 0.035,
      subheadLineHeight: 1.25,
      subheadOpacity: 0.85,
      headlineColor: "#FFFFFF",
      subheadColor: "#E2E8F0",
      featureTitleSizeRatio: 0.033,
      featureBodySizeRatio: 0.027,
    },
    headlineTopRatio: 0.075,
    subheadGapRatio: 0.022,
    deviceDefaultScale: 0.9,
    decorativeIntensity: "high",
  },
};

export function getTemplate(id: string): TemplateDefinition {
  const t = TEMPLATES[id as TemplateId];
  if (!t) {
    throw new Error(`Unknown template: ${id}`);
  }
  return t;
}
