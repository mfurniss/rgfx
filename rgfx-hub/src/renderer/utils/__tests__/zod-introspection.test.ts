/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { extractFieldMetadata, type FieldTypeMap } from '../zod-introspection';
import { effectPropsSchemas, effectFieldTypes } from '@/schemas';

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
        const fields = extractFieldMetadata(effectPropsSchemas.explode, effectFieldTypes.explode);
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
        const fields = extractFieldMetadata(
          effectPropsSchemas.background,
          effectFieldTypes.background,
        );
        const fieldMap = new Map(fields.map((f) => [f.name, f]));

        expect(fieldMap.get('gradient')?.type).toBe('backgroundGradient');
        expect(fieldMap.get('fadeDuration')?.type).toBe('number');
      });

      it('should extract fadeDuration field', () => {
        const fields = extractFieldMetadata(
          effectPropsSchemas.background,
          effectFieldTypes.background,
        );
        const fadeDurationField = fields.find((f) => f.name === 'fadeDuration');

        expect(fadeDurationField).toBeDefined();
        expect(fadeDurationField?.type).toBe('number');
        expect(fadeDurationField?.defaultValue).toBe(1000);
      });

      it('should extract gradient field as backgroundGradient type', () => {
        const fields = extractFieldMetadata(
          effectPropsSchemas.background,
          effectFieldTypes.background,
        );
        const gradientField = fields.find((f) => f.name === 'gradient');

        // Background uses gradient only (no color field)
        expect(gradientField).toBeDefined();
        expect(gradientField?.type).toBe('backgroundGradient');
      });

      it('should have exactly 2 fields (gradient and fadeDuration)', () => {
        const fields = extractFieldMetadata(
          effectPropsSchemas.background,
          effectFieldTypes.background,
        );
        expect(fields).toHaveLength(2);
      });
    });

    describe('bitmap schema', () => {
      it('should extract position fields with correct types (no color - uses palette)', () => {
        const fields = extractFieldMetadata(effectPropsSchemas.bitmap, effectFieldTypes.bitmap);
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
        // Note: background no longer has a color field (uses gradient only)
        const schemasWithColor = ['pulse', 'wipe', 'explode'] as const;

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
        const optionalFieldsWithoutDefaults = ['endX', 'endY', 'accentColor', 'gradient', 'color'];

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
        const fields = extractFieldMetadata(
          effectPropsSchemas.background,
          effectFieldTypes.background,
        );
        const gradientField = fields.find((f) => f.name === 'gradient');
        const fadeDurationField = fields.find((f) => f.name === 'fadeDuration');

        expect(gradientField?.description).toContain('Gradient');
        expect(fadeDurationField?.description).toContain('cross-fade');
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

    it('should detect centerX/Y as centerXY type via fieldTypes map', () => {
      // centerX/Y must use explicit fieldTypes override
      const fields = extractFieldMetadata(effectPropsSchemas.explode, effectFieldTypes.explode);
      const centerXField = fields.find((f) => f.name === 'centerX');
      const centerYField = fields.find((f) => f.name === 'centerY');

      expect(centerXField?.type).toBe('centerXY');
      expect(centerYField?.type).toBe('centerXY');
    });
  });

  describe('fieldTypes override parameter', () => {
    // Test schema with various field types for override testing
    const testSchema = z.object({
      name: z.string().default('test'),
      count: z.number().default(1),
      enabled: z.boolean().default(true),
      mode: z.enum(['fast', 'slow']).default('fast'),
    });

    it('should use inferred types when no fieldTypes provided', () => {
      const fields = extractFieldMetadata(testSchema);
      const fieldMap = new Map(fields.map((f) => [f.name, f]));

      expect(fieldMap.get('name')?.type).toBe('string');
      expect(fieldMap.get('count')?.type).toBe('number');
      expect(fieldMap.get('enabled')?.type).toBe('boolean');
      expect(fieldMap.get('mode')?.type).toBe('enum');
    });

    it('should override field types when fieldTypes map provided', () => {
      const fieldTypes: FieldTypeMap = {
        name: 'color',
        count: 'hidden',
      };

      const fields = extractFieldMetadata(testSchema, fieldTypes);
      const fieldMap = new Map(fields.map((f) => [f.name, f]));

      // Overridden fields
      expect(fieldMap.get('name')?.type).toBe('color');
      expect(fieldMap.get('count')?.type).toBe('hidden');

      // Non-overridden fields use inference
      expect(fieldMap.get('enabled')?.type).toBe('boolean');
      expect(fieldMap.get('mode')?.type).toBe('enum');
    });

    it('should preserve descriptions when using fieldTypes override', () => {
      const schemaWithDesc = z.object({
        myField: z.string().default('test').describe('This is my field'),
      });

      const fieldTypes: FieldTypeMap = {
        myField: 'color',
      };

      const fields = extractFieldMetadata(schemaWithDesc, fieldTypes);
      const myField = fields.find((f) => f.name === 'myField');

      expect(myField?.type).toBe('color');
      expect(myField?.description).toBe('This is my field');
    });

    it('should preserve default values when using fieldTypes override', () => {
      const fieldTypes: FieldTypeMap = {
        name: 'color',
      };

      const fields = extractFieldMetadata(testSchema, fieldTypes);
      const nameField = fields.find((f) => f.name === 'name');

      expect(nameField?.type).toBe('color');
      expect(nameField?.defaultValue).toBe('test');
    });

    it('should handle empty fieldTypes map same as undefined', () => {
      const fieldsWithEmpty = extractFieldMetadata(testSchema, {});
      const fieldsWithUndefined = extractFieldMetadata(testSchema, undefined);

      expect(fieldsWithEmpty).toEqual(fieldsWithUndefined);
    });

    it('should ignore fieldTypes entries for non-existent fields', () => {
      const fieldTypes: FieldTypeMap = {
        nonExistent: 'color',
        name: 'hidden',
      };

      const fields = extractFieldMetadata(testSchema, fieldTypes);
      const fieldNames = fields.map((f) => f.name);

      // Should not add non-existent field
      expect(fieldNames).not.toContain('nonExistent');
      // Should still override existing field
      expect(fields.find((f) => f.name === 'name')?.type).toBe('hidden');
    });
  });

  describe('legacy fieldType description annotation (backwards compatibility)', () => {
    it('should parse fieldType from description when no override provided', () => {
      const schemaWithAnnotation = z.object({
        myGradient: z
          .array(z.string())
          .default([])
          .describe('fieldType:gradientArray|Colors for animation'),
      });

      const fields = extractFieldMetadata(schemaWithAnnotation);
      const gradientField = fields.find((f) => f.name === 'myGradient');

      expect(gradientField?.type).toBe('gradientArray');
      expect(gradientField?.description).toBe('Colors for animation');
    });

    it('should prefer fieldTypes override over description annotation', () => {
      const schemaWithAnnotation = z.object({
        myField: z.string().default('').describe('fieldType:color|A color field'),
      });

      const fieldTypes: FieldTypeMap = {
        myField: 'hidden',
      };

      const fields = extractFieldMetadata(schemaWithAnnotation, fieldTypes);
      const myField = fields.find((f) => f.name === 'myField');

      // Override takes precedence
      expect(myField?.type).toBe('hidden');
      // Description is NOT cleaned when using override (uses raw description)
      expect(myField?.description).toBe('fieldType:color|A color field');
    });

    it('should clean description when using annotation without override', () => {
      const schemaWithAnnotation = z.object({
        myField: z.string().default('').describe('fieldType:centerXY|Position value'),
      });

      const fields = extractFieldMetadata(schemaWithAnnotation);
      const myField = fields.find((f) => f.name === 'myField');

      expect(myField?.type).toBe('centerXY');
      expect(myField?.description).toBe('Position value');
    });
  });
});
