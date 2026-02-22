import { describe, it, expect } from 'vitest';
import { effectDisplayNames, formEffects } from '../effect-helpers';
import { effectSchemas } from '@/schemas';

describe('effect-helpers', () => {
  describe('effectDisplayNames', () => {
    it('should have an entry for each effect schema', () => {
      const schemaKeys = Object.keys(effectSchemas);
      const displayNameKeys = Object.keys(effectDisplayNames);

      expect(displayNameKeys).toHaveLength(schemaKeys.length);
      schemaKeys.forEach((key) => {
        expect(effectDisplayNames).toHaveProperty(key);
      });
    });

    it('should have string values for all display names', () => {
      Object.values(effectDisplayNames).forEach((value) => {
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
      });
    });

    it('should extract display name from schema literal', () => {
      // The display name should match the literal value in each effect's name field
      Object.entries(effectSchemas).forEach(([key, schema]) => {
        const nameSchema = schema.shape.name as { _zod: { def: { values: string[] } } };
        const expectedName = nameSchema._zod.def.values[0];
        expect(effectDisplayNames[key]).toBe(expectedName);
      });
    });
  });

  describe('formEffects', () => {
    it('should contain all effect keys', () => {
      const schemaKeys = Object.keys(effectSchemas);

      expect(formEffects).toHaveLength(schemaKeys.length);
      schemaKeys.forEach((key) => {
        expect(formEffects).toContain(key);
      });
    });

    it('should be sorted alphabetically by display name', () => {
      for (let i = 1; i < formEffects.length; i++) {
        const prevName = effectDisplayNames[formEffects[i - 1]];
        const currName = effectDisplayNames[formEffects[i]];
        expect(prevName.localeCompare(currName)).toBeLessThanOrEqual(0);
      }
    });

    it('should be an array of strings', () => {
      expect(Array.isArray(formEffects)).toBe(true);
      formEffects.forEach((effect) => {
        expect(typeof effect).toBe('string');
      });
    });
  });
});
