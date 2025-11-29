/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { z } from 'zod';

/**
 * Firmware file entry schema
 */
const FirmwareFileSchema = z.object({
  name: z.string().min(1),
  address: z.number().int().nonnegative(),
  size: z.number().int().positive(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/i),
});

/**
 * Firmware manifest schema
 * Used for USB serial flashing with integrity verification
 */
export const FirmwareManifestSchema = z.object({
  version: z.string().min(1),
  generatedAt: z.string(),
  files: z.array(FirmwareFileSchema).min(1),
});

export type FirmwareManifest = z.infer<typeof FirmwareManifestSchema>;
