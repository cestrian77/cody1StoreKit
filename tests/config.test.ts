import { describe, expect, it } from "vitest";
import { AppConfigSchema } from "../src/schemas/app-config";
import example from "../apps/example/app.config";

describe("AppConfigSchema", () => {
  it("parses example app config", () => {
    const result = AppConfigSchema.safeParse(example);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.screens).toHaveLength(5);
    }
  });
});
