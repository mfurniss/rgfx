/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

/**
 * Utility functions for form field rendering.
 */

const labelOverrides: Record<string, string> = {
  gradient: 'Gradient',
  orientation: 'Gradient Orientation',
  lifespanSpread: 'Lifespan Spread %',
  powerSpread: 'Power Spread %',
};

/**
 * Formats a field name into a human-readable label.
 * Handles camelCase conversion and special overrides.
 */
export function formatLabel(name: string): string {
  if (labelOverrides[name]) {
    return labelOverrides[name];
  }

  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

/**
 * Formats constraint hints for number fields.
 */
export function formatConstraintHint(
  constraints?: { min?: number; max?: number },
): string | undefined {
  if (!constraints) {
    return undefined;
  }

  const { min, max } = constraints;

  if (min !== undefined && max !== undefined) {
    return `Range: ${min} - ${max}`;
  }

  if (min !== undefined) {
    return `Min: ${min}`;
  }

  if (max !== undefined) {
    return `Max: ${max}`;
  }

  return undefined;
}

/**
 * Formats a default value for display in tooltip.
 */
function formatDefaultValue(value: unknown): string {
  if (value === undefined || value === null) {
    return 'none';
  }

  if (typeof value === 'boolean') {
    return value ? 'on' : 'off';
  }

  if (typeof value === 'string') {
    return `"${value}"`;
  }

  if (typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return 'unknown';
}

/**
 * Builds a tooltip string from description and default value.
 */
export function buildTooltip(description?: string, defaultValue?: unknown): string | undefined {
  const parts: string[] = [];

  if (description) {
    parts.push(description);
  }

  if (defaultValue !== undefined) {
    parts.push(`Default: ${formatDefaultValue(defaultValue)}`);
  }

  return parts.length > 0 ? parts.join('\n') : undefined;
}

