import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { effectPropsSchemas } from '../schemas/effects';
import defaults from '../schemas/effects/defaults.json';

const headerPath = path.resolve(
  __dirname,
  '../../../esp32/src/effects/generated/effect_defaults.h',
);

describe('effect defaults', () => {
  describe('schema validation — defaults pass their own schemas', () => {
    for (const [name, schema] of Object.entries(effectPropsSchemas)) {
      it(`${name}: parse({}) applies valid defaults`, () => {
        expect(() => schema.parse({})).not.toThrow();
      });
    }
  });

  describe('schema constraints — invalid values rejected', () => {
    const schemas = effectPropsSchemas;

    describe('pulse', () => {
      it('rejects negative duration', () => {
        expect(schemas.pulse.safeParse({ duration: -1 }).success)
          .toBe(false);
      });

      it('rejects invalid easing name', () => {
        expect(schemas.pulse.safeParse({ easing: 'bounce' }).success)
          .toBe(false);
      });

      it('rejects non-boolean fade', () => {
        expect(schemas.pulse.safeParse({ fade: 'yes' }).success)
          .toBe(false);
      });
    });

    describe('wipe', () => {
      it('rejects invalid direction', () => {
        expect(schemas.wipe.safeParse({ direction: 'diagonal' }).success)
          .toBe(false);
      });

      it('rejects invalid blendMode', () => {
        expect(
          schemas.wipe.safeParse({ blendMode: 'multiply' }).success,
        ).toBe(false);
      });
    });

    describe('explode', () => {
      it('rejects particleCount > 1000', () => {
        expect(
          schemas.explode.safeParse({ particleCount: 1001 }).success,
        ).toBe(false);
      });

      it('rejects negative lifespan', () => {
        expect(
          schemas.explode.safeParse({ lifespan: -100 }).success,
        ).toBe(false);
      });
    });

    describe('text', () => {
      it('rejects text longer than 31 characters', () => {
        expect(
          schemas.text.safeParse({ text: 'A'.repeat(32) }).success,
        ).toBe(false);
      });

      it('accepts text of exactly 31 characters', () => {
        expect(
          schemas.text.safeParse({ text: 'A'.repeat(31) }).success,
        ).toBe(true);
      });
    });

    describe('scroll_text', () => {
      it('rejects text longer than 255 characters', () => {
        expect(
          schemas.scroll_text.safeParse({
            text: 'A'.repeat(256),
          }).success,
        ).toBe(false);
      });

      it('accepts text of exactly 255 characters', () => {
        expect(
          schemas.scroll_text.safeParse({
            text: 'A'.repeat(255),
          }).success,
        ).toBe(true);
      });
    });

    describe('projectile', () => {
      it('rejects velocity below minimum', () => {
        expect(
          schemas.projectile.safeParse({ velocity: 0 }).success,
        ).toBe(false);
      });

      it('rejects velocity above maximum', () => {
        expect(
          schemas.projectile.safeParse({ velocity: 5001 }).success,
        ).toBe(false);
      });
    });

    describe('sparkle', () => {
      it('rejects density below 1', () => {
        expect(
          schemas.sparkle.safeParse({ density: 0 }).success,
        ).toBe(false);
      });

      it('rejects density above 100', () => {
        expect(
          schemas.sparkle.safeParse({ density: 101 }).success,
        ).toBe(false);
      });

      it('rejects speed below 0.1', () => {
        expect(
          schemas.sparkle.safeParse({ speed: 0.05 }).success,
        ).toBe(false);
      });

      it('rejects bloom above 100', () => {
        expect(
          schemas.sparkle.safeParse({ bloom: 101 }).success,
        ).toBe(false);
      });
    });

    describe('plasma', () => {
      it('rejects invalid enabled state', () => {
        expect(
          schemas.plasma.safeParse({ enabled: 'toggle' }).success,
        ).toBe(false);
      });
    });

    describe('warp', () => {
      it('rejects invalid orientation', () => {
        expect(
          schemas.warp.safeParse({ orientation: 'diagonal' }).success,
        ).toBe(false);
      });

      it('rejects speed outside range', () => {
        expect(schemas.warp.safeParse({ speed: 51 }).success)
          .toBe(false);
      });
    });

    describe('particle_field', () => {
      it('rejects invalid direction', () => {
        expect(
          schemas.particle_field.safeParse({
            direction: 'diagonal',
          }).success,
        ).toBe(false);
      });

      it('rejects density above 100', () => {
        expect(
          schemas.particle_field.safeParse({ density: 101 }).success,
        ).toBe(false);
      });
    });

    describe('background', () => {
      it('rejects invalid gradient orientation', () => {
        expect(
          schemas.background.safeParse({
            gradient: { orientation: 'diagonal' },
          }).success,
        ).toBe(false);
      });
    });

    describe('bitmap', () => {
      it('rejects negative duration', () => {
        expect(
          schemas.bitmap.safeParse({ duration: -1 }).success,
        ).toBe(false);
      });

      it('rejects invalid easing', () => {
        expect(
          schemas.bitmap.safeParse({ easing: 'bounce' }).success,
        ).toBe(false);
      });
    });
  });

  describe('generated header sync', () => {
    it('committed header matches generated output', async () => {
      const { generateHeader } = await import(
        '../../scripts/generate-effect-defaults.mjs',
      );
      const generated = generateHeader(defaults);
      const committed = readFileSync(headerPath, 'utf-8');
      expect(generated).toBe(committed);
    });
  });

  describe('completeness — schema props covered in defaults', () => {
    // Properties intentionally optional with no default in JSON
    const excludedProps: Record<string, string[]> = {
      bitmap: ['endX', 'endY'],
    };

    for (const [name, schema] of Object.entries(effectPropsSchemas)) {
      it(`${name}: all properties have defaults`, () => {
        const schemaKeys = Object.keys(schema.shape);
        const effectDefaults =
          defaults[name as keyof typeof defaults];
        const defaultKeys = Object.keys(effectDefaults);
        const excluded = excludedProps[name] ?? [];

        for (const key of schemaKeys) {
          if (excluded.includes(key)) {
            continue;
          }

          expect(defaultKeys).toContain(key);
        }
      });
    }
  });
});
