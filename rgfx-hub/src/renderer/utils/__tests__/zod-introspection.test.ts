/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect } from 'vitest';
import { extractFieldMetadata } from '../zod-introspection';
import { effectSchemas } from '@/schemas';

/**
 * These tests ensure that all effect schemas are correctly introspected
 * for the EffectForm component. If a field is not recognized correctly,
 * the form will render the wrong input type (e.g., dropdown instead of
 * color picker with text input).
 */
describe('zod-introspection', () => {
  describe('extractFieldMetadata', () => {
    describe('pulse schema', () => {
      it('should extract all fields with correct types', () => {
        const fields = extractFieldMetadata(effectSchemas.pulse);
        const fieldMap = new Map(fields.map((f) => [f.name, f]));

        expect(fieldMap.get('color')?.type).toBe('color');
        expect(fieldMap.get('reset')?.type).toBe('boolean');
        expect(fieldMap.get('duration')?.type).toBe('number');
        expect(fieldMap.get('easing')?.type).toBe('enum');
        expect(fieldMap.get('fade')?.type).toBe('boolean');
        expect(fieldMap.get('collapse')?.type).toBe('enum');
      });

      it('should extract color field with named color options', () => {
        const fields = extractFieldMetadata(effectSchemas.pulse);
        const colorField = fields.find((f) => f.name === 'color');

        expect(colorField).toBeDefined();
        expect(colorField?.type).toBe('color');
        expect(colorField?.constraints?.enumValues).toContain('random');
        expect(colorField?.constraints?.enumValues).toContain('red');
        expect(colorField?.constraints?.enumValues).toContain('blue');
      });

      it('should extract easing field with all easing options', () => {
        const fields = extractFieldMetadata(effectSchemas.pulse);
        const easingField = fields.find((f) => f.name === 'easing');

        expect(easingField).toBeDefined();
        expect(easingField?.type).toBe('enum');
        expect(easingField?.constraints?.enumValues).toContain('linear');
        expect(easingField?.constraints?.enumValues).toContain('quadraticIn');
        expect(easingField?.constraints?.enumValues).toContain('quadraticOut');
      });
    });

    describe('wipe schema', () => {
      it('should extract all fields with correct types', () => {
        const fields = extractFieldMetadata(effectSchemas.wipe);
        const fieldMap = new Map(fields.map((f) => [f.name, f]));

        expect(fieldMap.get('color')?.type).toBe('color');
        expect(fieldMap.get('reset')?.type).toBe('boolean');
        expect(fieldMap.get('direction')?.type).toBe('enum');
        expect(fieldMap.get('duration')?.type).toBe('number');
      });

      it('should extract direction field with all direction options', () => {
        const fields = extractFieldMetadata(effectSchemas.wipe);
        const directionField = fields.find((f) => f.name === 'direction');

        expect(directionField).toBeDefined();
        expect(directionField?.type).toBe('enum');
        expect(directionField?.constraints?.enumValues).toEqual(
          expect.arrayContaining(['left', 'right', 'up', 'down', 'random']),
        );
      });
    });

    describe('explode schema', () => {
      it('should extract all fields with correct types', () => {
        const fields = extractFieldMetadata(effectSchemas.explode);
        const fieldMap = new Map(fields.map((f) => [f.name, f]));

        expect(fieldMap.get('color')?.type).toBe('color');
        expect(fieldMap.get('reset')?.type).toBe('boolean');
        expect(fieldMap.get('centerX')?.type).toBe('centerXY');
        expect(fieldMap.get('centerY')?.type).toBe('centerXY');
        expect(fieldMap.get('friction')?.type).toBe('number');
        expect(fieldMap.get('hueSpread')?.type).toBe('number');
        expect(fieldMap.get('lifespan')?.type).toBe('number');
        expect(fieldMap.get('lifespanSpread')?.type).toBe('number');
        expect(fieldMap.get('particleCount')?.type).toBe('number');
        expect(fieldMap.get('particleSize')?.type).toBe('number');
        expect(fieldMap.get('power')?.type).toBe('number');
        expect(fieldMap.get('powerSpread')?.type).toBe('number');
      });

    });

    describe('background schema', () => {
      it('should extract all fields with correct types', () => {
        const fields = extractFieldMetadata(effectSchemas.background);
        const fieldMap = new Map(fields.map((f) => [f.name, f]));

        expect(fieldMap.get('color')?.type).toBe('color');
        expect(fieldMap.get('enabled')?.type).toBe('boolean');
      });

      it('should extract color field as color type (not enum)', () => {
        const fields = extractFieldMetadata(effectSchemas.background);
        const colorField = fields.find((f) => f.name === 'color');

        // This test ensures the color field is recognized as a color union,
        // not just an enum dropdown. This was a bug when color was double-wrapped
        // with .optional()
        expect(colorField).toBeDefined();
        expect(colorField?.type).toBe('color');
        expect(colorField?.constraints?.enumValues).toContain('random');
        expect(colorField?.constraints?.enumValues).toContain('red');
        expect(colorField?.constraints?.enumValues).toContain('blue');
      });

      it('should have exactly 2 fields', () => {
        const fields = extractFieldMetadata(effectSchemas.background);
        expect(fields).toHaveLength(2);
      });
    });

    describe('bitmap schema', () => {
      it('should extract color and position fields with correct types', () => {
        const fields = extractFieldMetadata(effectSchemas.bitmap);
        const fieldMap = new Map(fields.map((f) => [f.name, f]));

        expect(fieldMap.get('color')?.type).toBe('color');
        expect(fieldMap.get('reset')?.type).toBe('boolean');
        expect(fieldMap.get('centerX')?.type).toBe('centerXY');
        expect(fieldMap.get('centerY')?.type).toBe('centerXY');
        expect(fieldMap.get('duration')?.type).toBe('number');
      });
    });

    describe('all effect schemas', () => {
      it('should have color field recognized as color type in all schemas that have it', () => {
        const schemasWithColor = ['pulse', 'wipe', 'explode', 'bitmap', 'background'] as const;

        for (const schemaName of schemasWithColor) {
          const schema = effectSchemas[schemaName];
          const fields = extractFieldMetadata(schema);
          const colorField = fields.find((f) => f.name === 'color');

          expect(colorField, `${schemaName} should have color field`).toBeDefined();
          expect(colorField?.type, `${schemaName} color should be type 'color'`).toBe('color');
        }
      });

      it('should extract default values for all fields', () => {
        for (const [schemaName, schema] of Object.entries(effectSchemas)) {
          const fields = extractFieldMetadata(schema);

          for (const field of fields) {
            // Every field should have a default value (since all props are optional with defaults)
            expect(
              field.defaultValue,
              `${schemaName}.${field.name} should have a default value`,
            ).toBeDefined();
          }
        }
      });

      it('should extract descriptions for fields that have them', () => {
        const fields = extractFieldMetadata(effectSchemas.background);
        const colorField = fields.find((f) => f.name === 'color');
        const enabledField = fields.find((f) => f.name === 'enabled');

        expect(colorField?.description).toContain('Background color');
        expect(enabledField?.description).toContain('Show or hide');
      });
    });
  });

  describe('field type detection', () => {
    it('should not confuse color union with regular enum', () => {
      // The color schema is a union of: enum (named colors) | string (hex) | number
      // It should be detected as 'color', not 'enum'
      const fields = extractFieldMetadata(effectSchemas.pulse);
      const colorField = fields.find((f) => f.name === 'color');
      const easingField = fields.find((f) => f.name === 'easing');

      // Color is a union, should be type 'color'
      expect(colorField?.type).toBe('color');

      // Easing is a pure enum, should be type 'enum'
      expect(easingField?.type).toBe('enum');
    });

    it('should detect centerX/Y as centerXY type', () => {
      // centerX/Y are unions of: 'random' literal | number
      const fields = extractFieldMetadata(effectSchemas.explode);
      const centerXField = fields.find((f) => f.name === 'centerX');
      const centerYField = fields.find((f) => f.name === 'centerY');

      expect(centerXField?.type).toBe('centerXY');
      expect(centerYField?.type).toBe('centerXY');
    });
  });
});
