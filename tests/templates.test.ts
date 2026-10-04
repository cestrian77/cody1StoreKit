import { describe, expect, it } from "vitest";
import { AppConfigSchema } from "../src/schemas/app-config";
import {
  TEMPLATE_IDS,
  getTemplate,
  listTemplates,
} from "../src/templates/index";

describe("templates", () => {
  it("exposes a varied catalog", () => {
    const all = listTemplates();
    expect(all.length).toBeGreaterThanOrEqual(12);
    const categories = new Set(all.map((t) => t.category));
    expect(categories.has("utility")).toBe(true);
    expect(categories.has("puzzle")).toBe(true);
    expect(categories.has("arcade")).toBe(true);
  });

  it("gives each template distinct decor and starter background", () => {
    const decorStyles = new Set(listTemplates().map((t) => t.decorStyle));
    expect(decorStyles.size).toBeGreaterThanOrEqual(6);
    const backgrounds = new Set(
      listTemplates().map((t) => t.starter.backgroundPreset),
    );
    expect(backgrounds.size).toBeGreaterThanOrEqual(8);
  });

  it("parses every template id in app config", () => {
    for (const id of TEMPLATE_IDS) {
      const parsed = AppConfigSchema.safeParse({
        app: { id: "demo", name: "Demo" },
        template: id,
        screens: [
          {
            id: "01-hero",
            copy: { headline: "screens.screen1.headline" },
          },
        ],
      });
      expect(parsed.success).toBe(true);
      expect(getTemplate(id).id).toBe(id);
    }
  });
});
