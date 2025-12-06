/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

// Telemetry and driver registration schemas
export { TelemetryPayloadSchema } from './telemetry-payload';
export { DriverTelemetrySchema } from './driver-telemetry';
export { DriverRegistrationSchema } from './driver-registration';
export { LEDHardwareSchema } from './led-hardware';

// Driver persistence schemas
export {
  PersistedDriverSchema,
  type PersistedDriverFromSchema,
  type PersistedDriverInput,
  type RemoteLoggingLevel,
  DriversConfigFileRawSchema,
  type DriversConfigFile,
} from './driver-persistence';

// Firmware manifest schema
export { FirmwareManifestSchema, type FirmwareManifest } from './firmware-manifest';

// Effect props schemas and validation
export { effectSchemas, isEffectName } from './effects';

