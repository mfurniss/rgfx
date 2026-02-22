// Generates a C++ header from defaults.json for ESP32 effect fallback values.
// Usage: node scripts/generate-effect-defaults.mjs

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const JSON_PATH = resolve(__dirname, '../src/schemas/effects/defaults.json');
const HEADER_PATH = resolve(__dirname, '../../esp32/src/effects/generated/effect_defaults.h');

// Properties that are always float on ESP32 even when their JSON value is integer.
// ArduinoJson's | operator uses the fallback type to determine parse behavior,
// so getting this right prevents float truncation.
const FLOAT_PROPERTIES = new Set([
  'friction', 'gravity', 'power', 'powerSpread', 'lifespanSpread',
  'speed', 'scale', 'velocity', 'trail',
  'gradientSpeed', 'gradientScale', 'frameRate',
]);

/**
 * Convert a JSON value to a C++ constexpr declaration.
 * Returns null for types that can't be represented as constexpr (arrays, objects, null).
 */
function toCppValue(key, value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (Array.isArray(value) || typeof value === 'object') {
    return null;
  }

  if (typeof value === 'boolean') {
    return { type: 'bool', value: value ? 'true' : 'false' };
  }

  if (typeof value === 'number') {
    if (FLOAT_PROPERTIES.has(key) || !Number.isInteger(value)) {
      const str = Number.isInteger(value) ? `${value}.0f` : `${value}f`;
      return { type: 'float', value: str };
    }
    return { type: 'uint32_t', value: `${value}u` };
  }

  if (typeof value === 'string') {
    const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return { type: 'const char*', value: `"${escaped}"` };
  }

  return null;
}

/**
 * Generate the C++ header content from the defaults object.
 * Exported for testability.
 */
export function generateHeader(defaults) {
  const lines = [
    '// AUTO-GENERATED from defaults.json — do not edit',
    '// Regenerate: cd rgfx-hub && npm run generate:defaults',
    '#pragma once',
    '#include <cstdint>',
    '',
    'namespace effect_defaults {',
  ];

  const effectNames = Object.keys(defaults);

  for (const effectName of effectNames) {
    const props = defaults[effectName];
    const entries = [];

    for (const [key, value] of Object.entries(props)) {
      const cpp = toCppValue(key, value);

      if (cpp) {
        entries.push(`  static constexpr ${cpp.type} ${key} = ${cpp.value};`);
      }
    }

    if (entries.length > 0) {
      lines.push('');
      lines.push(`namespace ${effectName} {`);
      lines.push(...entries);
      lines.push('}');
    }
  }

  lines.push('');
  lines.push('} // namespace effect_defaults');
  lines.push('');

  return lines.join('\n');
}

// Run as CLI script (not when imported for testing)
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const defaults = JSON.parse(readFileSync(JSON_PATH, 'utf-8'));
  const header = generateHeader(defaults);

  mkdirSync(dirname(HEADER_PATH), { recursive: true });
  writeFileSync(HEADER_PATH, header);

  console.log(`Generated ${HEADER_PATH}`);
}
