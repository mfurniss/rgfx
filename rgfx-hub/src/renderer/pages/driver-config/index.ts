// Components
export { IdentitySection } from './components/identity-section';
export { SettingsSection } from './components/settings-section';
export { LedConfigSection } from './components/led-config-section';

// Hooks
export { useLedHardware } from './hooks/use-led-hardware';

// Utils (only normalizeLedConfig is used externally; others are internal to led-config-section)
export { normalizeLedConfig } from './utils/led-config-helpers';
