/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

// Telemetry and driver registration schemas
export { TelemetryPayloadSchema, type TelemetryPayload } from './telemetry-payload';
export { DriverTelemetrySchema, type DriverTelemetryFromSchema } from './driver-telemetry';
export { DriverRegistrationSchema, type DriverRegistration } from './driver-registration';
export { LEDHardwareSchema, type LEDHardwareFromSchema } from './led-hardware';

// Driver persistence schemas
export {
  DriverLEDConfigSchema,
  type DriverLEDConfigFromSchema,
  PersistedDriverSchema,
  type PersistedDriverFromSchema,
  DriversConfigFileRawSchema,
  DriversConfigFileSchema,
  type DriversConfigFile,
} from './driver-persistence';

// Firmware manifest schema
export {
  FirmwareFileSchema,
  type FirmwareFile,
  FirmwareManifestSchema,
  type FirmwareManifest,
} from './firmware-manifest';

// Effect props schemas and validation
export {
  effectSchemas,
  type EffectName,
  validateEffectProps,
  safeValidateEffectProps,
  isEffectName,
} from './effects';
