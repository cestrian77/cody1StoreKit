export type TemplateCategory = "utility" | "puzzle" | "arcade";

export type DecorStyle =
  | "none"
  | "soft-orbs"
  | "glow-center"
  | "starfield"
  | "neon-grid"
  | "diagonal-bands"
  | "corner-wash"
  | "wave-lines";

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

export interface TemplateLayout {
  paddingXRatio: number;
  defaultTextAlign: "left" | "center";
  headlineMaxWidthDefault: number;
  subheadMaxWidthDefault: number;
  featureListStartRatio: number;
  featureCardsYRatio: number;
}

export interface TemplateFeatureCardsStyle {
  fill: string;
  fillOpacity: number;
  borderRadius: number;
  /** Text on cards uses dedicated colors instead of headline/subhead colors. */
  titleColor: string;
  subtitleColor: string;
}

export interface TemplateStarterDefaults {
  backgroundPreset: string;
  device: {
    scale: number;
    x: number;
    y: number;
    appearance: "light" | "dark";
  };
  layout: {
    type: "hero-device" | "feature-list" | "feature-cards" | "minimal";
    textAlign: "left" | "center";
  };
}

export interface TemplateDefinition {
  id: string;
  label: string;
  category: TemplateCategory;
  description: string;
  typography: TemplateTypography;
  layout: TemplateLayout;
  featureCards: TemplateFeatureCardsStyle;
  headlineTopRatio: number;
  subheadGapRatio: number;
  deviceDefaultScale: number;
  decorativeIntensity: "minimal" | "medium" | "high";
  decorStyle: DecorStyle;
  starter: TemplateStarterDefaults;
}
