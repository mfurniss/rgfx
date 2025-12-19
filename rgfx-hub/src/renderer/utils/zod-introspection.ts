/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { z } from 'zod';

type FieldType =
  | 'enum'
  | 'boolean'
  | 'number'
  | 'string'
  | 'color'
  | 'centerXY'
  | 'spritePreset'
  | 'gradientPreset';

interface FieldConstraints {
  min?: number;
  max?: number;
  enumValues?: readonly string[];
}

export interface FieldMetadata {
  name: string;
  type: FieldType;
  defaultValue: unknown;
  constraints?: FieldConstraints;
  description?: string;
}

type ZodShape = Record<string, z.ZodType>;

interface ZodDef {
  type?: string;
  defaultValue?: unknown;
  innerType?: z.ZodType;
  options?: z.ZodType[];
  entries?: Record<string, string>;
  value?: unknown;
  values?: unknown[];
  checks?: { kind: string; value: number }[];
  description?: string;
}

interface ZodWithDef {
  _zod: { def: ZodDef };
}

function hasZodDef(schema: z.ZodType): schema is z.ZodType & ZodWithDef {
  return '_zod' in schema;
}

interface UnwrapResult {
  innerSchema: z.ZodType;
  defaultValue: unknown;
  description?: string;
}

/**
 * Extract description from a schema if present
 * In Zod 4, description is stored directly on the schema object
 */
function extractDescription(schema: z.ZodType): string | undefined {
  // Zod 4 stores description directly on the schema object
  if ('description' in schema && typeof schema.description === 'string') {
    return schema.description;
  }

  return undefined;
}

/**
 * Unwrap ZodDefault and ZodOptional wrappers to get the inner type
 */
function unwrapSchema(schema: z.ZodType): UnwrapResult {
  let current = schema;
  let defaultValue: unknown = undefined;
  let description = extractDescription(schema);

  // Unwrap ZodDefault - check for _zod.def.defaultValue
  if (hasZodDef(current) && 'defaultValue' in current._zod.def) {
    const { def } = current._zod;
    defaultValue = typeof def.defaultValue === 'function'
      ? (def.defaultValue as () => unknown)()
      : def.defaultValue;

    if (def.innerType) {
      current = def.innerType;
      // Check for description on inner type if not found on wrapper
      description ??= extractDescription(current);
    }
  }

  // Unwrap ZodOptional - check for _zod.def.innerType without defaultValue
  if (hasZodDef(current) && current._zod.def.innerType && !('defaultValue' in current._zod.def)) {
    current = current._zod.def.innerType;
    // Check for description on inner type if not found on wrapper
    description ??= extractDescription(current);
  }

  return { innerSchema: current, defaultValue, description };
}

/**
 * Check if schema is a color union (named colors | hex string | number)
 */
function isColorSchema(schema: z.ZodType): boolean {
  if (!hasZodDef(schema)) {
    return false;
  }

  const { def } = schema._zod;

  if (def.type !== 'union' || !def.options || def.options.length < 2) {
    return false;
  }

  // Color schema has: enum (named colors) + string (hex) + number
  let hasEnum = false;
  let hasString = false;
  let hasNumber = false;

  for (const option of def.options) {
    if (hasZodDef(option)) {
      const optDef = option._zod.def;

      if (optDef.type === 'enum') {
        hasEnum = true;
      }

      if (optDef.type === 'string') {
        hasString = true;
      }

      if (optDef.type === 'number') {
        hasNumber = true;
      }
    }
  }

  return hasEnum && hasString && hasNumber;
}

/**
 * Check if schema is a centerX/Y union ('random' literal | number)
 */
function isCenterSchema(schema: z.ZodType): boolean {
  if (!hasZodDef(schema)) {
    return false;
  }

  const { def } = schema._zod;

  if (def.type !== 'union' || !def.options?.length || def.options.length !== 2) {
    return false;
  }

  let hasRandomLiteral = false;
  let hasNumber = false;

  for (const option of def.options) {
    if (hasZodDef(option)) {
      const optDef = option._zod.def;

      if (optDef.type === 'literal' && optDef.values?.[0] === 'random') {
        hasRandomLiteral = true;
      }

      if (optDef.type === 'number') {
        hasNumber = true;
      }
    }
  }

  return hasRandomLiteral && hasNumber;
}

/**
 * Zod 4 check object interface
 * In Zod 4, checks have _zod.def with check type and constraint value
 */
interface Zod4Check {
  _zod?: {
    def?: {
      check?: string;
      minimum?: number;
      maximum?: number;
    };
  };
}

/**
 * Check if array schema has a minimum length constraint >= threshold
 * Handles both Zod 3 (kind/value) and Zod 4 (_zod.def.check/minimum) formats
 */
function hasMinLengthConstraint(checks: unknown[], threshold: number): boolean {
  return checks.some((check) => {
    // Zod 4 format: check._zod.def.check === 'min_length' and check._zod.def.minimum
    const zod4Check = check as Zod4Check;

    if (zod4Check._zod?.def?.check === 'min_length') {
      return (zod4Check._zod.def.minimum ?? 0) >= threshold;
    }

    // Zod 3 format: check.kind === 'min' and check.value
    const zod3Check = check as { kind?: string; value?: number };

    if (zod3Check.kind === 'min') {
      return (zod3Check.value ?? 0) >= threshold;
    }

    return false;
  });
}

/**
 * Check if schema is an array of strings (sprite data)
 * Sprite arrays don't have min/max constraints
 */
function isSpriteArraySchema(schema: z.ZodType): boolean {
  if (!hasZodDef(schema)) {
    return false;
  }

  const { def } = schema._zod;

  if (def.type !== 'array') {
    return false;
  }

  // Check if element type is string
  const { element } = def as { element?: z.ZodType };

  if (element && hasZodDef(element) && element._zod.def.type === 'string') {
    // If it has min constraint >= 2, it's a gradient, not a sprite
    if (def.checks && hasMinLengthConstraint(def.checks, 2)) {
      return false;
    }

    return true;
  }

  return false;
}

/**
 * Check if schema is an array of hex color strings (gradient data)
 * Gradient arrays have min constraint >= 2
 */
function isGradientArraySchema(schema: z.ZodType): boolean {
  if (!hasZodDef(schema)) {
    return false;
  }

  const { def } = schema._zod;

  if (def.type !== 'array') {
    return false;
  }

  // Check if element type is string (hex colors are strings)
  const { element } = def as { element?: z.ZodType };

  if (element && hasZodDef(element) && element._zod.def.type === 'string') {
    // Check for min constraint >= 2 (gradients need at least 2 colors)
    if (def.checks && hasMinLengthConstraint(def.checks, 2)) {
      return true;
    }
  }

  return false;
}

/**
 * Extract enum values from a ZodEnum schema
 */
function extractEnumValues(schema: z.ZodType): readonly string[] | undefined {
  if (!hasZodDef(schema)) {
    return undefined;
  }

  const { def } = schema._zod;

  if (def.type !== 'enum' || !def.entries) {
    return undefined;
  }

  return Object.keys(def.entries);
}

/**
 * Extract named color values from a color union schema
 */
function extractColorNames(schema: z.ZodType): readonly string[] | undefined {
  if (!hasZodDef(schema)) {
    return undefined;
  }

  const { def } = schema._zod;

  if (def.type !== 'union' || !def.options) {
    return undefined;
  }

  for (const option of def.options) {
    const enumValues = extractEnumValues(option);

    if (enumValues) {
      return enumValues;
    }
  }

  return undefined;
}

/**
 * Extract min/max constraints from a ZodNumber schema
 */
function extractNumberConstraints(schema: z.ZodType): FieldConstraints | undefined {
  if (!hasZodDef(schema)) {
    return undefined;
  }

  const { def } = schema._zod;

  if (def.type !== 'number' || !def.checks) {
    return undefined;
  }

  const constraints: FieldConstraints = {};

  for (const check of def.checks) {
    if (check.kind === 'min') {
      constraints.min = check.value;
    }

    if (check.kind === 'max') {
      constraints.max = check.value;
    }
  }

  return Object.keys(constraints).length > 0 ? constraints : undefined;
}

/**
 * Analyze a single field and return its metadata
 */
function analyzeField(name: string, schema: z.ZodType): FieldMetadata {
  const { innerSchema, defaultValue, description } = unwrapSchema(schema);

  if (isColorSchema(innerSchema)) {
    return {
      name,
      type: 'color',
      defaultValue,
      constraints: { enumValues: extractColorNames(innerSchema) },
      description,
    };
  }

  if (isCenterSchema(innerSchema)) {
    return {
      name,
      type: 'centerXY',
      defaultValue,
      description,
    };
  }

  if (isGradientArraySchema(innerSchema)) {
    return {
      name,
      type: 'gradientPreset',
      defaultValue,
      description,
    };
  }

  if (isSpriteArraySchema(innerSchema)) {
    return {
      name,
      type: 'spritePreset',
      defaultValue,
      description,
    };
  }

  if (!hasZodDef(innerSchema)) {
    return { name, type: 'enum', defaultValue, description };
  }

  const { def } = innerSchema._zod;

  if (def.type === 'enum') {
    return {
      name,
      type: 'enum',
      defaultValue,
      constraints: { enumValues: extractEnumValues(innerSchema) },
      description,
    };
  }

  if (def.type === 'boolean') {
    return {
      name,
      type: 'boolean',
      defaultValue,
      description,
    };
  }

  if (def.type === 'number') {
    return {
      name,
      type: 'number',
      defaultValue,
      constraints: extractNumberConstraints(innerSchema),
      description,
    };
  }

  if (def.type === 'string') {
    return {
      name,
      type: 'string',
      defaultValue,
      description,
    };
  }

  return { name, type: 'enum', defaultValue, description };
}

/**
 * Extract field metadata from a Zod object schema
 */
export function extractFieldMetadata(schema: z.ZodObject<ZodShape>): FieldMetadata[] {
  const { shape } = schema;
  const fields: FieldMetadata[] = [];

  for (const [name, fieldSchema] of Object.entries(shape)) {
    fields.push(analyzeField(name, fieldSchema));
  }

  return fields;
}
