import { effectSchemas } from '@/schemas';

// Build map of effect keys to display names from schema literals
// Extract literal value from z.literal() schema via internal _zod.def.values
export const effectDisplayNames = Object.fromEntries(
  Object.entries(effectSchemas).map(([key, schema]) => {
    const nameSchema = schema.shape.name as { _zod: { def: { values: string[] } } };
    return [key, nameSchema._zod.def.values[0]];
  }),
);

// Sort by display name for a more intuitive list
export const formEffects = Object.keys(effectSchemas).sort((a, b) =>
  effectDisplayNames[a].localeCompare(effectDisplayNames[b]),
);
