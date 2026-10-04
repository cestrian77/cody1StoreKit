import { z } from "zod";

const relativeOrPx = z.union([
  z.number().min(0).max(2),
  z.object({ px: z.number() }),
]);

export const BackgroundConfigSchema = z.object({
  preset: z.string().optional(),
  solid: z.string().optional(),
  gradient: z
    .object({
      type: z.enum(["linear", "radial"]),
      angle: z.number().optional(),
      stops: z.array(
        z.object({
          offset: z.number().min(0).max(1),
          color: z.string(),
        }),
      ),
      cx: z.number().optional(),
      cy: z.number().optional(),
      r: z.number().optional(),
    })
    .optional(),
});

export const DeviceConfigSchema = z.object({
  type: z.enum(["iphone", "ipad", "mac"]),
  scale: z.number().min(0.1).max(1.5).default(0.82),
  x: z.number().min(0).max(1).default(0.5),
  y: z.number().min(0).max(1).default(0.72),
  rotation: z.number().min(-45).max(45).default(0),
  shadow: z.boolean().optional().default(true),
  appearance: z.enum(["light", "dark"]).optional().default("dark"),
  screenshotInset: z.number().min(0).max(0.1).optional(),
  screenshotCrop: z
    .object({
      top: z.number().min(0).max(0.5).optional(),
      bottom: z.number().min(0).max(0.5).optional(),
      left: z.number().min(0).max(0.5).optional(),
      right: z.number().min(0).max(0.5).optional(),
    })
    .optional(),
});

export const CopyRefSchema = z.object({
  headline: z.string(),
  subhead: z.string().optional(),
});

export const FeatureItemSchema = z.object({
  icon: z.string().optional(),
  titleKey: z.string(),
  bodyKey: z.string().optional(),
});

export const FeatureCardSchema = z.object({
  icon: z.string().optional(),
  titleKey: z.string(),
  subtitleKey: z.string().optional(),
});

export const ScreenLayoutSchema = z.object({
  type: z
    .enum([
      "hero-device",
      "feature-list",
      "feature-cards",
      "minimal",
    ])
    .default("hero-device"),
  textAlign: z.enum(["left", "center"]).default("center"),
  headlineMaxWidth: relativeOrPx.optional(),
  subheadMaxWidth: relativeOrPx.optional(),
});

export const ScreenConfigSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  copy: CopyRefSchema,
  screenshot: z.string().optional(),
  template: z.string().optional(),
  background: BackgroundConfigSchema.optional(),
  device: DeviceConfigSchema.optional(),
  layout: ScreenLayoutSchema.optional(),
  features: z.array(FeatureItemSchema).optional(),
  featureCards: z.array(FeatureCardSchema).optional(),
  variantOf: z.string().optional(),
  variantKey: z.string().optional(),
});

export const AppMetadataSchema = z
  .object({
    title: z.string().optional(),
    subtitle: z.string().optional(),
    promotionalText: z.string().optional(),
    description: z.string().optional(),
    keywords: z.array(z.string()).optional(),
    primaryCategory: z.string().optional(),
    secondaryCategory: z.string().optional(),
  })
  .optional();

export const AppConfigSchema = z.object({
  app: z.object({
    id: z.string().regex(/^[a-z][a-z0-9-]*$/),
    name: z.string().min(1),
    icon: z.string().optional(),
  }),
  /** Which App Store targets this app uses (drives UI preset filters). */
  targets: z
    .array(z.enum(["ios", "mac"]))
    .default(["ios"]),
  template: z.enum(["utility-clean", "puzzle", "arcade"]).default("utility-clean"),
  defaultLocale: z.string().default("en-GB"),
  defaultPreset: z.string().default("iphone69"),
  /** Used when generating Mac screenshots (UI + CLI). */
  defaultMacPreset: z.string().default("mac2880"),
  screens: z.array(ScreenConfigSchema).min(1),
  metadata: z.record(z.string(), AppMetadataSchema).optional(),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;
export type ScreenConfig = z.infer<typeof ScreenConfigSchema>;
export type DeviceConfig = z.infer<typeof DeviceConfigSchema>;
export type BackgroundConfig = z.infer<typeof BackgroundConfigSchema>;
