import { describe, expect, it } from "vitest";
import { isPlaceholderFile } from "../src/utils/placeholders";

describe("placeholder manifest", () => {
  it("detects placeholder membership", () => {
    expect(
      isPlaceholderFile({ files: ["a.png"], updatedAt: "" }, "a.png"),
    ).toBe(true);
    expect(
      isPlaceholderFile({ files: ["a.png"], updatedAt: "" }, "b.png"),
    ).toBe(false);
  });
});
