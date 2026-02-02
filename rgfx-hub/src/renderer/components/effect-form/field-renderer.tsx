/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import React from 'react';
import { Box, Tooltip } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { type Control, type FieldValues, type FieldErrors, type FieldPath } from 'react-hook-form';
import { type FieldMetadata } from '@/renderer/utils/zod-introspection';
import { NumberField } from '../common/number-field';
import {
  EnumField,
  BooleanField,
  ColorField,
  CenterField,
  SpritePresetField,
  StringField,
  GradientArrayField,
  BackgroundGradientField,
} from './fields';
import {
  formatLabel,
  formatConstraintHint,
  buildTooltip,
  isColorDisabledByGradient,
} from './field-utils';

interface FieldRendererProps<T extends FieldValues> {
  field: FieldMetadata;
  control: Control<T>;
  errors: FieldErrors<T>;
  formValues: Partial<T>;
}

interface FieldWithHelpProps {
  description?: string;
  defaultValue?: unknown;
  children: React.ReactElement;
}

function FieldWithHelp({ description, defaultValue, children }: FieldWithHelpProps) {
  const tooltip = buildTooltip(description, defaultValue);

  if (!tooltip) {
    return children;
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
      <Tooltip title={<span style={{ whiteSpace: 'pre-line' }}>{tooltip}</span>} placement="top" arrow>
        <HelpOutlineIcon
          sx={{
            fontSize: 16,
            color: 'text.secondary',
            mt: 1.25,
            cursor: 'help',
          }}
        />
      </Tooltip>
      <Box sx={{ flex: 1 }}>{children}</Box>
    </Box>
  );
}

export function FieldRenderer<T extends FieldValues>({
  field,
  control,
  errors,
  formValues,
}: FieldRendererProps<T>) {
  const error = errors[field.name as keyof T];
  const errorMessage = error?.message as string | undefined;
  const label = formatLabel(field.name);

  const gradientValue = formValues.gradient as string[] | { colors?: string[] } | undefined;
  const colorDisabled = isColorDisabledByGradient(field.name, gradientValue);

  switch (field.type) {
    case 'enum':
      return (
        <FieldWithHelp description={field.description} defaultValue={field.defaultValue}>
          <EnumField
            name={field.name as FieldPath<T>}
            control={control}
            label={label}
            options={field.constraints?.enumValues ?? []}
            error={errorMessage}
          />
        </FieldWithHelp>
      );

    case 'boolean':
      return (
        <FieldWithHelp description={field.description} defaultValue={field.defaultValue}>
          <BooleanField
            name={field.name as FieldPath<T>}
            control={control}
            label={label}
          />
        </FieldWithHelp>
      );

    case 'number':
      return (
        <FieldWithHelp description={field.description} defaultValue={field.defaultValue}>
          <NumberField
            name={field.name as FieldPath<T>}
            control={control}
            label={label}
            min={field.constraints?.min}
            max={field.constraints?.max}
            helperText={formatConstraintHint(field.constraints)}
            allowFloat
            size="small"
            emptyValue={field.emptyValue}
          />
        </FieldWithHelp>
      );

    case 'color':
      return (
        <FieldWithHelp description={field.description} defaultValue={field.defaultValue}>
          <ColorField
            name={field.name as FieldPath<T>}
            control={control}
            label={label}
            namedColors={field.constraints?.enumValues ?? []}
            error={errorMessage}
            disabled={colorDisabled}
          />
        </FieldWithHelp>
      );

    case 'centerXY':
      return (
        <FieldWithHelp description={field.description} defaultValue={field.defaultValue}>
          <CenterField
            name={field.name as FieldPath<T>}
            control={control}
            label={label}
          />
        </FieldWithHelp>
      );

    case 'spritePreset':
      return (
        <FieldWithHelp description={field.description} defaultValue={field.defaultValue}>
          <SpritePresetField
            name={field.name as FieldPath<T>}
            control={control}
            label={label}
            error={errorMessage}
          />
        </FieldWithHelp>
      );

    case 'string':
      return (
        <FieldWithHelp description={field.description} defaultValue={field.defaultValue}>
          <StringField
            name={field.name as FieldPath<T>}
            control={control}
            label={label}
            error={errorMessage}
          />
        </FieldWithHelp>
      );

    case 'gradientArray':
      return (
        <FieldWithHelp description={field.description} defaultValue={field.defaultValue}>
          <GradientArrayField
            name={field.name as FieldPath<T>}
            control={control}
            label={label}
            error={errorMessage}
          />
        </FieldWithHelp>
      );

    case 'backgroundGradient':
      return (
        <FieldWithHelp description={field.description} defaultValue={field.defaultValue}>
          <BackgroundGradientField
            name={field.name as FieldPath<T>}
            control={control}
            label={label}
            error={errorMessage}
          />
        </FieldWithHelp>
      );

    default:
      console.warn(`Unknown field type: ${field.type} for field ${field.name}`);
      return null;
  }
}
