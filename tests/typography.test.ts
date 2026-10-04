import { describe, expect, it } from "vitest";
import { layoutText } from "../src/typography/layout-text";

describe("layoutText", () => {
  it("wraps long headlines", () => {
    const result = layoutText({
      text: "SPEAK IT. SAYWRITE IT.",
      fontSize: 48,
      fontFamily: "system-ui",
      fontWeight: 800,
      lineHeight: 1.1,
      letterSpacingEm: 0,
      maxWidth: 200,
      maxLines: 4,
      align: "center",
    });
    expect(result.lines.length).toBeGreaterThan(1);
  });

  it("preserves explicit line breaks", () => {
    const result = layoutText({
      text: "LINE ONE\nLINE TWO",
      fontSize: 40,
      fontFamily: "system-ui",
      fontWeight: 700,
      lineHeight: 1.1,
      letterSpacingEm: 0,
      maxWidth: 800,
      align: "center",
    });
    expect(result.lines.length).toBeGreaterThanOrEqual(2);
  });
});
