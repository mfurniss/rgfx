import { z } from 'zod';

type FieldType =
  | 'enum'
  | 'boolean'
  | 'number'
  | 'string'
  | 'color'
  | 'centerXY'
  | 'spritePreset'
  | 'gradientArray'
  | 'backgroundGradient'
  | 'hidden';

/** Field configuration: can be just a type string or an object with type and emptyValue */
type FieldConfig = FieldType | { type?: FieldType; emptyValue?: number };

/** Map of field names to their UI component types or full config */
export type FieldTypeMap = Partial<Record<string, FieldConfig>>;

const VALID_FIELD_TYPES: readonly FieldType[] = [
  'enum',
  'boolean',
  'number',
  'string',
  'color',
  'centerXY',
  'spritePreset',
  'gradientArray',
  'backgroundGradient',
  'hidden',
];

/**
 * Parse explicit field type from description string.
 * Format: 'fieldType:typeName|Human readable description'
 * Returns the field type and cleaned description (without prefix).
 */
function parseFieldType(description: string | undefined): {
  fieldType: FieldType | null;
  cleanDescription: string | undefined;
} {
  if (!description) {
    return { fieldType: null, cleanDescription: undefined };
  }

  const match = /^fieldType:(\w+)\|(.*)$/.exec(description);

  if (match) {
    const [, type, desc] = match;

    if (VALID_FIELD_TYPES.includes(type as FieldType)) {
      return {
        fieldType: type as FieldType,
        cleanDescription: desc || undefined,
      };
    }
  }

  return { fieldType: null, cleanDescription: description };
}

interface FieldConstraints {
  min?: number;
  max?: number;
  isInteger?: boolean;
  enumValues?: readonly string[];
}

export interface FieldMetadata {
  name: string;
  type: FieldType;
  defaultValue: unknown;
  constraints?: FieldConstraints;
  description?: string;
  emptyValue?: number;
}

type ZodShape = Record<string, z.ZodType>;

/** Zod v4 check stored in _zod.def of each check object */
interface ZodV4CheckDef {
  check: string;
  value: number;
  inclusive?: boolean;
}

/** Individual check item — Zod v3 uses plain objects, Zod v4 uses schema-like wrappers */
interface ZodCheck {
  // Zod v3 format
  kind?: string;
  value?: number;
  // Zod v4 format: check is a schema-like object with _zod.def
  _zod?: { def: ZodV4CheckDef };
}

interface ZodDef {
  type?: string;
  defaultValue?: unknown;
  innerType?: z.ZodType;
  options?: z.ZodType[];
  entries?: Record<string, string>;
  value?: unknown;
  values?: unknown[];
  checks?: ZodCheck[];
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
 * Unwrap ZodDefault, ZodOptional, ZodNullable, and ZodPipe wrappers
 */
function unwrapSchema(schema: z.ZodType): UnwrapResult {
  let current = schema;
  let defaultValue: unknown = undefined;
  let description = extractDescription(schema);

  // Keep unwrapping until we reach a non-wrapper type
  // Use a loop to handle nested wrappers like pipe(transform, default(optional(union)))
  let maxIterations = 10; // Safety limit

  while (maxIterations-- > 0 && hasZodDef(current)) {
    const { def } = current._zod;

    // Unwrap ZodPipe (Zod 4) - def.type === 'pipe' with def.in and def.out
    // The 'out' contains the actual schema structure we want to unwrap
    if (def.type === 'pipe' && 'out' in def && def.out) {
      current = def.out as z.ZodType;
      description ??= extractDescription(current);
      continue;
    }

    // Unwrap ZodDefault - check for _zod.def.defaultValue
    if ('defaultValue' in def) {
      defaultValue ??= typeof def.defaultValue === 'function'
        ? (def.defaultValue as () => unknown)()
        : def.defaultValue;

      if (def.innerType) {
        current = def.innerType;
        description ??= extractDescription(current);
        continue;
      }
    }

    // Unwrap ZodOptional - check for _zod.def.innerType without defaultValue
    if (def.innerType && !('defaultValue' in def)) {
      current = def.innerType;
      description ??= extractDescription(current);
      continue;
    }

    // Unwrap ZodNullable - check for _zod.def.type === 'nullable'
    if (def.type === 'nullable' && def.innerType) {
      current = def.innerType;
      description ??= extractDescription(current);
      continue;
    }

    // No more wrappers to unwrap
    break;
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
 * Extract min/max/integer constraints from a ZodNumber schema.
 * Supports both Zod v3 (plain check objects) and Zod v4 (schema-like check wrappers).
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
    const { check: checkType, value } = check._zod.def;

    if (checkType === 'greater_than') {
      constraints.min = value;
    }

    if (checkType === 'less_than') {
      constraints.max = value;
    }
  }

  return Object.keys(constraints).length > 0 ? constraints : undefined;
}

/**
 * Extract type and emptyValue from field config
 */
function parseFieldConfig(config: FieldConfig | undefined): {
  overrideType?: FieldType;
  emptyValue?: number;
} {
  if (!config) {
    return {};
  }

  if (typeof config === 'string') {
    return { overrideType: config };
  }

  return {
    overrideType: config.type,
    emptyValue: config.emptyValue,
  };
}

/**
 * Analyze a single field and return its metadata
 */
function analyzeField(name: string, schema: z.ZodType, fieldConfig?: FieldConfig): FieldMetadata {
  const { innerSchema, defaultValue, description } = unwrapSchema(schema);
  const { overrideType, emptyValue } = parseFieldConfig(fieldConfig);

  // Check for explicit override type first (from fieldTypes map)
  if (overrideType) {
    if (overrideType === 'color') {
      return {
        name,
        type: 'color',
        defaultValue,
        constraints: { enumValues: extractColorNames(innerSchema) },
        description,
        emptyValue,
      };
    }

    return {
      name,
      type: overrideType,
      defaultValue,
      description,
      emptyValue,
    };
  }

  // Legacy: check for explicit field type in description (deprecated)
  const { fieldType, cleanDescription } = parseFieldType(description);

  if (fieldType) {
    // For explicit color type, still extract named colors from the inner schema
    if (fieldType === 'color') {
      return {
        name,
        type: 'color',
        defaultValue,
        constraints: { enumValues: extractColorNames(innerSchema) },
        description: cleanDescription,
        emptyValue,
      };
    }

    return {
      name,
      type: fieldType,
      defaultValue,
      description: cleanDescription,
      emptyValue,
    };
  }

  // Fall back to inference for backwards compatibility
  if (isColorSchema(innerSchema)) {
    return {
      name,
      type: 'color',
      defaultValue,
      constraints: { enumValues: extractColorNames(innerSchema) },
      description,
      emptyValue,
    };
  }


  if (!hasZodDef(innerSchema)) {
    return { name, type: 'enum', defaultValue, description, emptyValue };
  }

  const { def } = innerSchema._zod;

  if (def.type === 'enum') {
    return {
      name,
      type: 'enum',
      defaultValue,
      constraints: { enumValues: extractEnumValues(innerSchema) },
      description,
      emptyValue,
    };
  }

  if (def.type === 'boolean') {
    return {
      name,
      type: 'boolean',
      defaultValue,
      description,
      emptyValue,
    };
  }

  if (def.type === 'number') {
    return {
      name,
      type: 'number',
      defaultValue,
      constraints: extractNumberConstraints(innerSchema),
      description,
      emptyValue,
    };
  }

  if (def.type === 'string') {
    return {
      name,
      type: 'string',
      defaultValue,
      description,
      emptyValue,
    };
  }

  return { name, type: 'enum', defaultValue, description, emptyValue };
}

/**
 * Extract field metadata from a Zod object schema
 * @param schema - The Zod object schema to analyze
 * @param fieldTypes - Optional map of field names to UI types/config (overrides inference)
 */
export function extractFieldMetadata(
  schema: z.ZodObject<ZodShape>,
  fieldTypes?: FieldTypeMap,
): FieldMetadata[] {
  const { shape } = schema;
  const fields: FieldMetadata[] = [];

  for (const [name, fieldSchema] of Object.entries(shape)) {
    fields.push(analyzeField(name, fieldSchema, fieldTypes?.[name]));
  }

  return fields;
}
