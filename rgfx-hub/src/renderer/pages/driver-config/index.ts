/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

// Components
export { IdentitySection } from './components/identity-section';
export { SettingsSection } from './components/settings-section';
export { LedConfigSection } from './components/led-config-section';

// Hooks
export { useLedHardware } from './hooks/use-led-hardware';

// Utils (only normalizeLedConfig is used externally; others are internal to led-config-section)
export { normalizeLedConfig } from './utils/led-config-helpers';
