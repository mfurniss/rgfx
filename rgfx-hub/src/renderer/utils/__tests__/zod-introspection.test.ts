/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect } from 'vitest';
import { extractFieldMetadata } from '../zod-introspection';
import { effectPropsSchemas } from '@/schemas';

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
        const fields = extractFieldMetadata(effectPropsSchemas.pulse);
        const fieldMap = new Map(fields.map((f) => [f.name, f]));

        expect(fieldMap.get('color')?.type).toBe('color');
        expect(fieldMap.get('reset')?.type).toBe('boolean');
        expect(fieldMap.get('duration')?.type).toBe('number');
        expect(fieldMap.get('easing')?.type).toBe('enum');
        expect(fieldMap.get('fade')?.type).toBe('boolean');
        expect(fieldMap.get('collapse')?.type).toBe('enum');
      });

      it('should extract color field with named color options', () => {
        const fields = extractFieldMetadata(effectPropsSchemas.pulse);
        const colorField = fields.find((f) => f.name === 'color');

        expect(colorField).toBeDefined();
        expect(colorField?.type).toBe('color');
        expect(colorField?.constraints?.enumValues).toContain('random');
        expect(colorField?.constraints?.enumValues).toContain('red');
        expect(colorField?.constraints?.enumValues).toContain('blue');
      });

      it('should extract easing field with all easing options', () => {
        const fields = extractFieldMetadata(effectPropsSchemas.pulse);
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
        const fields = extractFieldMetadata(effectPropsSchemas.wipe);
        const fieldMap = new Map(fields.map((f) => [f.name, f]));

        expect(fieldMap.get('color')?.type).toBe('color');
        expect(fieldMap.get('reset')?.type).toBe('boolean');
        expect(fieldMap.get('direction')?.type).toBe('enum');
        expect(fieldMap.get('duration')?.type).toBe('number');
      });

      it('should extract direction field with all direction options', () => {
        const fields = extractFieldMetadata(effectPropsSchemas.wipe);
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
        const fields = extractFieldMetadata(effectPropsSchemas.explode);
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
        const fields = extractFieldMetadata(effectPropsSchemas.background);
        const fieldMap = new Map(fields.map((f) => [f.name, f]));

        expect(fieldMap.get('color')?.type).toBe('color');
        expect(fieldMap.get('enabled')?.type).toBe('enum');
      });

      it('should extract enabled field with all state options', () => {
        const fields = extractFieldMetadata(effectPropsSchemas.background);
        const enabledField = fields.find((f) => f.name === 'enabled');

        expect(enabledField).toBeDefined();
        expect(enabledField?.type).toBe('enum');
        expect(enabledField?.constraints?.enumValues).toEqual(
          expect.arrayContaining(['off', 'on', 'fadeIn', 'fadeOut']),
        );
      });

      it('should extract color field as color type (not enum)', () => {
        const fields = extractFieldMetadata(effectPropsSchemas.background);
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

      it('should have exactly 4 fields', () => {
        const fields = extractFieldMetadata(effectPropsSchemas.background);
        expect(fields).toHaveLength(4);
      });
    });

    describe('bitmap schema', () => {
      it('should extract position fields with correct types (no color - uses palette)', () => {
        const fields = extractFieldMetadata(effectPropsSchemas.bitmap);
        const fieldMap = new Map(fields.map((f) => [f.name, f]));

        expect(fieldMap.get('color')).toBeUndefined();
        expect(fieldMap.get('reset')?.type).toBe('boolean');
        expect(fieldMap.get('centerX')?.type).toBe('centerXY');
        expect(fieldMap.get('centerY')?.type).toBe('centerXY');
        expect(fieldMap.get('duration')?.type).toBe('number');
      });
    });

    describe('all effect schemas', () => {
      it('should have color field recognized as color type in all schemas that have it', () => {
        const schemasWithColor = ['pulse', 'wipe', 'explode', 'background'] as const;

        for (const schemaName of schemasWithColor) {
          const schema = effectPropsSchemas[schemaName];
          const fields = extractFieldMetadata(schema);
          const colorField = fields.find((f) => f.name === 'color');

          expect(colorField, `${schemaName} should have color field`).toBeDefined();
          expect(colorField?.type, `${schemaName} color should be type 'color'`).toBe('color');
        }
      });

      it('should extract default values for fields that have them', () => {
        // Fields that are purely optional (no default) are allowed
        const optionalFieldsWithoutDefaults = ['endX', 'endY', 'accentColor', 'gradient'];

        for (const [schemaName, schema] of Object.entries(effectPropsSchemas)) {
          const fields = extractFieldMetadata(schema);

          for (const field of fields) {
            if (optionalFieldsWithoutDefaults.includes(field.name)) {
              continue;
            }

            // Most fields should have a default value
            expect(
              field.defaultValue,
              `${schemaName}.${field.name} should have a default value`,
            ).toBeDefined();
          }
        }
      });

      it('should extract descriptions for fields that have them', () => {
        const fields = extractFieldMetadata(effectPropsSchemas.background);
        const colorField = fields.find((f) => f.name === 'color');
        const enabledField = fields.find((f) => f.name === 'enabled');

        expect(colorField?.description).toContain('Background color');
        expect(enabledField?.description).toContain('fadeIn');
      });
    });
  });

  describe('field type detection', () => {
    it('should not confuse color union with regular enum', () => {
      // The color schema is a union of: enum (named colors) | string (hex) | number
      // It should be detected as 'color', not 'enum'
      const fields = extractFieldMetadata(effectPropsSchemas.pulse);
      const colorField = fields.find((f) => f.name === 'color');
      const easingField = fields.find((f) => f.name === 'easing');

      // Color is a union, should be type 'color'
      expect(colorField?.type).toBe('color');

      // Easing is a pure enum, should be type 'enum'
      expect(easingField?.type).toBe('enum');
    });

    it('should detect centerX/Y as centerXY type via fieldType annotation', () => {
      // centerX/Y must use explicit fieldType:centerXY annotation
      const fields = extractFieldMetadata(effectPropsSchemas.explode);
      const centerXField = fields.find((f) => f.name === 'centerX');
      const centerYField = fields.find((f) => f.name === 'centerY');

      expect(centerXField?.type).toBe('centerXY');
      expect(centerYField?.type).toBe('centerXY');
    });
  });
});
