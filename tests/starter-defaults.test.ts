import { describe, expect, it } from "vitest";
import {
  buildStarterScreen,
  resetLocaleCopyForScreen,
  resetScreenToStarter,
  screenSlotIndex,
} from "../src/config/starter-defaults";

describe("starter defaults reset", () => {
  it("resetScreenToStarter restores placeholder screenshot filename", () => {
    const existing = {
      id: "01-hero",
      copy: {
        headline: "screens.screen1.headline",
        subhead: "screens.screen1.subhead",
      },
      screenshot: "01-hero-my-upload-a1b2c3d4.png",
      device: { type: "iphone" as const, scale: 0.5, x: 0.1, y: 0.2, rotation: 10 },
    };
    const reset = resetScreenToStarter(existing, 0, "utility-clean");
    expect(reset.screenshot).toBe("screen-1.png");
    expect(reset.device?.scale).toBe(0.82);
    expect(reset.device?.rotation).toBe(0);
    expect(reset.copy).toEqual(existing.copy);
  });

  it("uses screen id prefix for screenshot slot", () => {
    expect(screenSlotIndex("03-feature", 99)).toBe(2);
    expect(screenSlotIndex("custom", 4)).toBe(4);
  });

  it("resetLocaleCopyForScreen restores headline text", () => {
    const screen = buildStarterScreen("03-feature", 2, "utility-clean");
    const bundle = resetLocaleCopyForScreen(
      { screens: { screen3: { headline: "Custom", subhead: "Old" } } },
      screen,
      2,
    );
    expect(bundle).toEqual({
      screens: {
        screen3: {
          headline: "HEADLINE 3",
          subhead: "Supporting copy for this screen.",
        },
      },
    });
  });
});
