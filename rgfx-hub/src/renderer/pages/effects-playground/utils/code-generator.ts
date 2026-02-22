import { createValueFormatter, type ValueFormatter } from './value-formatter';

function generateGifBitmapCode(
  gifPath: string,
  props: Record<string, unknown>,
  drivers: string[],
  isAllDrivers: boolean,
  formatValue: ValueFormatter,
): string {
  const otherProps: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(props)) {
    if (!['images', 'palette', 'frameRate', '__gifPath'].includes(key)) {
      otherProps[key] = value;
    }
  }

  const lines: string[] = [
    'let sprite;',
    '',
    'if (!sprite) {',
    `  sprite = await loadGif('${gifPath}');`,
    '}',
    '',
    'broadcast({',
    "  effect: 'bitmap',",
  ];

  if (!isAllDrivers && drivers.length > 0) {
    lines.push(`  drivers: ${formatValue(drivers, 1)},`);
  }

  lines.push('  props: {');
  lines.push('    images: sprite.images,');
  lines.push('    palette: sprite.palette,');
  lines.push('    ...(sprite.frameRate && { frameRate: sprite.frameRate }),');

  for (const [key, value] of Object.entries(otherProps)) {
    lines.push(`    ${key}: ${formatValue(value, 2)},`);
  }

  lines.push('  },');
  lines.push('});');

  return lines.join('\n');
}

export function generateBroadcastCode(
  effect: string,
  props: Record<string, unknown>,
  drivers: string[],
  isAllDrivers: boolean,
): string {
  const formatValue = createValueFormatter();

  // Check if this is a bitmap effect with a loaded GIF
  const gifPath = props.__gifPath as string | undefined;
  const isGifBitmap = effect === 'bitmap' && gifPath;

  if (isGifBitmap) {
    // Generate loadGif-based code for GIF bitmaps
    return generateGifBitmapCode(gifPath, props, drivers, isAllDrivers, formatValue);
  }

  // Strip internal markers before generating code
  const cleanProps = { ...props };
  delete cleanProps.__gifPath;

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
