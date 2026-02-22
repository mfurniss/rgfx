import React, { useEffect, useMemo } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Grid, Stack } from '@mui/material';
import { z } from 'zod';
import {
  extractFieldMetadata,
  type FieldTypeMap,
  type FieldMetadata,
} from '@/renderer/utils/zod-introspection';
import { FieldRenderer } from './field-renderer';
import type { LayoutConfig } from '@/schemas/effects';

type ZodShape = Record<string, z.ZodType>;

interface EffectFormProps {
  schema: z.ZodObject<ZodShape>;
  defaultValues: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
  onValidityChange?: (isValid: boolean) => void;
  fieldTypes?: FieldTypeMap;
  layoutConfig?: LayoutConfig;
}

export function EffectForm(props: EffectFormProps) {
  const {
    schema, defaultValues, onChange, onValidityChange, fieldTypes, layoutConfig,
  } = props;
  const fields = useMemo(() => extractFieldMetadata(schema, fieldTypes), [schema, fieldTypes]);
  const fieldMap = useMemo(() => new Map(fields.map((f) => [f.name, f])), [fields]);

  const methods = useForm({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onChange',
  });

  const {
    control,
    watch,
    reset,
    formState: { errors, isValid },
  } = methods;

  // Reset form when schema changes
  useEffect(() => {
    reset(defaultValues);
  }, [schema, defaultValues, reset]);

  // Notify parent of form validity once the user has edited a field.
  // isValid starts false before async validation resolves, so we
  // gate on isDirty to avoid disabling TRIGGER on initial load.
  const { isDirty } = methods.formState;

  useEffect(() => {
    if (isDirty) {
      onValidityChange?.(isValid);
    }
  }, [isValid, isDirty, onValidityChange]);

  // Sync form changes to parent
  useEffect(() => {
    const subscription = watch((values) => {
      onChange(values as Record<string, unknown>);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [watch, onChange]);

  const renderField = (field: FieldMetadata) => (
    <FieldRenderer key={field.name} field={field} control={control} errors={errors} />
  );

  // Render with layout config (column-based)
  if (layoutConfig) {
    return (
      <FormProvider {...methods}>
        <Grid container spacing={3}>
          {layoutConfig.map((columnFields, colIndex) => (
            <Grid key={colIndex} size={{ xs: 12, md: 6 }}>
              <Stack spacing={3}>
                {columnFields
                  .map((fieldName) => fieldMap.get(fieldName))
                  .filter((field): field is FieldMetadata => field !== undefined)
                  .map(renderField)}
              </Stack>
            </Grid>
          ))}
        </Grid>
      </FormProvider>
    );
  }

  // Fallback: flat 2-column layout
  return (
    <FormProvider {...methods}>
      <Grid container spacing={3}>
        {fields.map((field) => (
          <Grid key={field.name} size={{ xs: 12, md: 6 }}>
            {renderField(field)}
          </Grid>
        ))}
      </Grid>
    </FormProvider>
  );
}
