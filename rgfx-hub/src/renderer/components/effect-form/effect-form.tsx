/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

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
  fieldTypes?: FieldTypeMap;
  layoutConfig?: LayoutConfig;
}

export function EffectForm(props: EffectFormProps) {
  const { schema, defaultValues, onChange, fieldTypes, layoutConfig } = props;
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
    formState: { errors },
  } = methods;

  // Reset form when schema changes
  useEffect(() => {
    reset(defaultValues);
  }, [schema, defaultValues, reset]);

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
