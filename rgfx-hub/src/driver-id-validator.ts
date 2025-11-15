/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import {
  DRIVER_ID_PATTERN,
  MIN_DRIVER_ID_LENGTH,
  MAX_DRIVER_ID_LENGTH,
} from './config/constants';

export interface DriverIdValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates a driver ID against naming rules.
 *
 * Rules:
 * - Lowercase letters (a-z), numbers (0-9), hyphens (-) only
 * - Must start and end with alphanumeric character
 * - Length: 3-32 characters
 *
 * @param id The driver ID to validate
 * @returns Validation result with error message if invalid
 */
export function validateDriverId(id: string): DriverIdValidationResult {
  // Check for empty or undefined
  if (!id || id.trim().length === 0) {
    return {
      valid: false,
      error: 'Driver ID cannot be empty',
    };
  }

  // Trim the ID
  const trimmedId = id.trim();

  // Check length
  if (trimmedId.length < MIN_DRIVER_ID_LENGTH) {
    return {
      valid: false,
      error: `Driver ID must be at least ${MIN_DRIVER_ID_LENGTH} characters long`,
    };
  }

  if (trimmedId.length > MAX_DRIVER_ID_LENGTH) {
    return {
      valid: false,
      error: `Driver ID cannot exceed ${MAX_DRIVER_ID_LENGTH} characters`,
    };
  }

  // Check pattern (lowercase alphanumeric + hyphens)
  if (!DRIVER_ID_PATTERN.test(trimmedId)) {
    return {
      valid: false,
      error:
        'Driver ID can only contain lowercase letters (a-z), numbers (0-9), and hyphens (-). Must start and end with a letter or number.',
    };
  }

  return { valid: true };
}

/**
 * Checks if a driver ID is valid (boolean shorthand).
 *
 * @param id The driver ID to check
 * @returns True if valid, false otherwise
 */
export function isValidDriverId(id: string): boolean {
  return validateDriverId(id).valid;
}
