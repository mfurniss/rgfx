export function roundFloat(value: number, decPlaces = 2): number {
  const factor = Math.pow(10, decPlaces);
  return Math.round(value * factor) / factor;
}
