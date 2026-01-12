/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

export interface PresetData {
  gradient: string[];
  speed?: number;
  scale?: number;
}

export type PresetType = 'plasma' | 'gradient';

export interface PresetConfig {
  type: PresetType;
  apply: (
    presetData: PresetData,
    currentValues: Record<string, unknown>,
  ) => Record<string, unknown>;
}
