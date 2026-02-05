/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

/**
 * Layout configuration for effect forms.
 * Each inner array represents a column with stacked fields.
 * All columns use responsive width: xs=12 (full width on mobile), md=6 (half width on desktop)
 */
export type LayoutConfig = string[][];
