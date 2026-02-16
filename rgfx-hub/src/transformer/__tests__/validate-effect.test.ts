/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { validateTransformerEffect } from '../validate-effect';
import type { EffectPayload, Logger } from '@/types/transformer-types';

describe('validateTransformerEffect', () => {
  let mockLog: Logger;

  beforeEach(() => {
    mockLog = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
  });

  describe('schema defaults', () => {
    it('should apply centerX/centerY defaults for bitmap', () => {
      const payload: EffectPayload = {
        effect: 'bitmap',
        props: {
          images: [['88', '88']],
        },
      };

      const result = validateTransformerEffect(payload, mockLog);
      const props = result.props as Record<string, unknown>;

      expect(props.centerX).toBe('random');
      expect(props.centerY).toBe('random');
    });

    it('should apply centerX/centerY defaults for explode', () => {
      const payload: EffectPayload = {
        effect: 'explode',
        props: {
          color: '#FF0000',
        },
      };

      const result = validateTransformerEffect(payload, mockLog);
      const props = result.props as Record<string, unknown>;

      expect(props.centerX).toBe('random');
      expect(props.centerY).toBe('random');
    });

    it('should preserve explicitly provided props', () => {
      const payload: EffectPayload = {
        effect: 'bitmap',
        props: {
          centerX: 50,
          centerY: 25,
          images: [['88', '88']],
        },
      };

      const result = validateTransformerEffect(payload, mockLog);
      const props = result.props as Record<string, unknown>;

      expect(props.centerX).toBe(50);
      expect(props.centerY).toBe(25);
    });
  });

  describe('passthrough behavior', () => {
    it('should preserve unknown fields in props', () => {
      const payload: EffectPayload = {
        effect: 'pulse',
        props: {
          color: '#FF0000',
          customField: 'preserved',
        },
      };

      const result = validateTransformerEffect(payload, mockLog);
      const props = result.props as Record<string, unknown>;

      expect(props.customField).toBe('preserved');
    });
  });

  describe('skip conditions', () => {
    it('should pass through unknown effect names', () => {
      const payload: EffectPayload = {
        effect: 'nonexistent',
        props: { foo: 'bar' },
      };

      const result = validateTransformerEffect(payload, mockLog);

      expect(result).toBe(payload);
      expect(mockLog.warn).not.toHaveBeenCalled();
    });

    it('should pass through clear effect', () => {
      const payload: EffectPayload = { effect: 'clear' };

      const result = validateTransformerEffect(payload, mockLog);

      expect(result).toBe(payload);
    });

    it('should pass through payloads without props', () => {
      const payload: EffectPayload = { effect: 'bitmap' };

      const result = validateTransformerEffect(payload, mockLog);

      expect(result).toBe(payload);
    });

    it('should pass through payloads without effect', () => {
      const payload = {
        props: { color: '#FF0000' },
      } as unknown as EffectPayload;

      const result = validateTransformerEffect(payload, mockLog);

      expect(result).toBe(payload);
    });
  });

  describe('validation failure', () => {
    it('should log warning and return original payload on failure', () => {
      const payload: EffectPayload = {
        effect: 'pulse',
        props: {
          color: '#FF0000',
          duration: 'not-a-number',
        },
      };

      const result = validateTransformerEffect(payload, mockLog);

      expect(mockLog.warn).toHaveBeenCalledWith(
        expect.stringContaining("Transformer effect 'pulse'"),
      );
      expect(result).toBe(payload);
    });
  });

  describe('drivers field preservation', () => {
    it('should preserve drivers targeting in payload', () => {
      const payload: EffectPayload = {
        effect: 'pulse',
        props: { color: '#FF0000' },
        drivers: ['rgfx-driver-0001'],
      };

      const result = validateTransformerEffect(payload, mockLog);

      expect(result.drivers).toEqual(['rgfx-driver-0001']);
    });
  });
});
