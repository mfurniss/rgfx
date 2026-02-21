/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { effectPropsSchemas, isEffectName } from '../schemas/effects';
import type { EffectPayload, Logger } from '../types/transformer-types';

/**
 * Validate transformer effect payload and apply Zod schema defaults.
 *
 * Transformer-originated effects bypass the UI validation path
 * (trigger-effect-handler), so schema defaults like centerX: 'random'
 * are never applied. This function fills that gap by parsing props
 * through the schema in loose mode (applies defaults without
 * rejecting unknown fields).
 *
 * On validation failure, logs a warning and returns the original
 * payload unchanged (graceful degradation).
 */
export function validateTransformerEffect(
  payload: EffectPayload,
  log: Logger,
): EffectPayload {
  const { effect } = payload;
  const props = payload.props as Record<string, unknown> | undefined;

  if (!effect || !isEffectName(effect) || !props || typeof props !== 'object') {
    return payload;
  }

  const schema = effectPropsSchemas[effect];
  const result = schema.loose().safeParse(props);

  if (result.success) {
    return { ...payload, props: result.data as Record<string, unknown> };
  }

  const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
  log.warn(`Transformer effect '${effect}' validation: ${issues}`, props);

  return payload;
}
