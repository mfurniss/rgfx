/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

export function roundFloat(value: number, decPlaces = 2): number {
  const factor = Math.pow(10, decPlaces);
  return Math.round(value * factor) / factor;
}
