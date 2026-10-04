export function resolveLength(
  value: number | { px: number } | undefined,
  canvas: number,
  fallbackRatio: number,
): number {
  if (value === undefined) return canvas * fallbackRatio;
  if (typeof value === "number") return canvas * value;
  return value.px;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
