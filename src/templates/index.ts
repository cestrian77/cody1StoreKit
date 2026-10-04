import { TEMPLATE_CATALOG } from "./catalog.js";
import type { TemplateDefinition, TemplateStarterDefaults } from "./types.js";

export type { TemplateCategory, TemplateDefinition, DecorStyle } from "./types.js";

export const TEMPLATE_IDS = TEMPLATE_CATALOG.map((t) => t.id) as [
  string,
  ...string[],
];

export type TemplateId = (typeof TEMPLATE_IDS)[number];

export const TEMPLATES: Record<string, TemplateDefinition> = Object.fromEntries(
  TEMPLATE_CATALOG.map((t) => [t.id, t]),
);

export const TEMPLATE_CATEGORIES: {
  id: TemplateDefinition["category"];
  label: string;
}[] = [
  { id: "utility", label: "Utility" },
  { id: "puzzle", label: "Puzzle" },
  { id: "arcade", label: "Arcade" },
];

export function getTemplate(id: string): TemplateDefinition {
  const t = TEMPLATES[id];
  if (!t) {
    throw new Error(`Unknown template: ${id}`);
  }
  return t;
}

export function getTemplateStarterDefaults(id: string): TemplateStarterDefaults {
  return getTemplate(id).starter;
}

export function listTemplates(): TemplateDefinition[] {
  return TEMPLATE_CATALOG;
}
