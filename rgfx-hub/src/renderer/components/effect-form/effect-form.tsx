/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import React, { useEffect, useMemo } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Grid } from '@mui/material';
import { z } from 'zod';
import { extractFieldMetadata, type FieldTypeMap } from '@/renderer/utils/zod-introspection';
import { FieldRenderer } from './field-renderer';

type ZodShape = Record<string, z.ZodType>;

interface EffectFormProps {
  schema: z.ZodObject<ZodShape>;
  defaultValues: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
  fieldTypes?: FieldTypeMap;
}

export function EffectForm({ schema, defaultValues, onChange, fieldTypes }: EffectFormProps) {
  const fields = useMemo(() => extractFieldMetadata(schema, fieldTypes), [schema, fieldTypes]);

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

  // Watch all form values for conditional field rendering
  const formValues = watch();

  return (
    <FormProvider {...methods}>
      <Grid container spacing={3}>
        {fields.map((field) => (
          <Grid key={field.name} size={{ xs: 12, md: 6 }}>
            <FieldRenderer
              field={field}
              control={control}
              errors={errors}
              formValues={formValues}
            />
          </Grid>
        ))}
      </Grid>
    </FormProvider>
  );
}
