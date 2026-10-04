import type { DeviceConfig } from "../schemas/app-config.js";
import type { OutputPreset } from "../presets/output-presets.js";

/** Map iOS device layout to Mac when exporting Mac presets (same copy, different chrome). */
export function resolveDeviceForPreset(
  device: DeviceConfig | undefined,
  preset: OutputPreset,
): DeviceConfig | undefined {
  if (!device) return undefined;
  if (preset.platform !== "mac") return device;
  if (device.type === "mac") return { ...device, rotation: 0 };

  return {
    type: "mac",
    scale: Math.min(device.scale + 0.06, 1.1),
    x: device.x,
    y: Math.min(device.y + 0.02, 0.85),
    rotation: 0,
    shadow: device.shadow ?? true,
    appearance: device.appearance ?? "dark",
    screenshotInset: device.screenshotInset,
    screenshotCrop: device.screenshotCrop,
  };
}
