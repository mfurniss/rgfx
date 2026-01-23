/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import type { DriverLEDConfig, LEDHardware } from '@/types';

/** Extract display name from hardware ref (e.g., "led-hardware/foo.json" -> "foo") */
export const getHardwareDisplayName = (ref: string): string =>
  ref.replace(/^led-hardware\//, '').replace(/\.json$/, '');

/** Check if hardware has RGBW color order (4-character order containing 'W') */
export const isRGBWHardware = (hardware: LEDHardware | null): boolean =>
  hardware?.colorOrder?.length === 4 && hardware.colorOrder.includes('W');

/**
 * Normalize ledConfig to ensure nested objects have all required fields with defaults.
 * Uses 'as' casts because old saved configs may have partial/missing gamma/floor objects.
 */
export const normalizeLedConfig = (
  config: DriverLEDConfig | null | undefined,
): DriverLEDConfig | null => {
  if (!config) {
    return null;
  }
  const gamma = config.gamma as Partial<DriverLEDConfig['gamma']> | undefined;
  const floor = config.floor as Partial<DriverLEDConfig['floor']> | undefined;
  return {
    ...config,
    gamma: {
      r: gamma?.r ?? 2.8,
      g: gamma?.g ?? 2.8,
      b: gamma?.b ?? 2.8,
    },
    floor: {
      r: floor?.r ?? 0,
      g: floor?.g ?? 0,
      b: floor?.b ?? 0,
    },
  };
};
