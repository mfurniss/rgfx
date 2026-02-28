import { effectCodeGenerators, effectCodePropsTransforms } from '@/schemas/effects';
import { createValueFormatter, type ValueFormatter } from './value-formatter';

/** Full override of code generation for an effect. Return null to fall through to generic. */
export type CodeGenerator = (
  props: Record<string, unknown>,
  drivers: string[],
  isAllDrivers: boolean,
  formatValue: ValueFormatter,
) => string | null;

/** Transform props before code generation (e.g. strip irrelevant fields). */
export type CodePropsTransform = (props: Record<string, unknown>) => Record<string, unknown>;

export function generateBroadcastCode(
  effect: string,
  props: Record<string, unknown>,
  drivers: string[],
  isAllDrivers: boolean,
): string {
  const formatValue = createValueFormatter();

  // Apply per-effect prop transformations first
  let cleanProps = { ...props };
  const transform = effectCodePropsTransforms[effect];

  if (transform) {
    cleanProps = transform(cleanProps);
  }

  // Check for per-effect code generation override
  const customGenerator = effectCodeGenerators[effect];

  if (customGenerator) {
    const result = customGenerator(cleanProps, drivers, isAllDrivers, formatValue);

    if (result) {
      return result;
    }
  }

  // Strip internal markers (__ prefixed props)
  cleanProps = Object.fromEntries(
    Object.entries(cleanProps).filter(([key]) => !key.startsWith('__')),
  );

  // Exclude color when gradient is present (gradient overrides color)
  // Handle both array format (plasma, text) and object format (background)
  const gradient = cleanProps.gradient as
    | string[]
    | { colors?: string[] }
    | undefined;
  const hasGradient = Array.isArray(gradient)
    ? gradient.length > 0
    : Array.isArray(gradient?.colors) && gradient.colors.length > 0;

  if (hasGradient) {
    delete cleanProps.color;
  }

  const lines = [
    'broadcast({',
    `  effect: '${effect}',`,
  ];

  // Only include drivers if targeting specific drivers (not all)
  if (!isAllDrivers && drivers.length > 0) {
    lines.push(`  drivers: ${formatValue(drivers, 1)},`);
  }

  lines.push(`  props: ${formatValue(cleanProps, 1)},`);
  lines.push('});');

  return lines.join('\n');
}
