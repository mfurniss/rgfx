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
import { type FieldMetadata } from '../../utils/zod-introspection';
import { NumberField } from '../common/number-field';
import {
  EnumField,
  BooleanField,
  ColorField,
  CenterField,
  SpritePresetField,
  GradientPresetField,
  StringField,
} from './fields';

interface FieldRendererProps<T extends FieldValues> {
  field: FieldMetadata;
  control: Control<T>;
  errors: FieldErrors<T>;
}

function formatLabel(name: string): string {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

function formatConstraintHint(constraints?: { min?: number; max?: number }): string | undefined {
  if (!constraints) {
    return undefined;
  }

  const { min, max } = constraints;

  if (min !== undefined && max !== undefined) {
    return `Range: ${min} - ${max}`;
  }

  if (min !== undefined) {
    return `Min: ${min}`;
  }

  if (max !== undefined) {
    return `Max: ${max}`;
  }

  return undefined;
}

function formatDefaultValue(value: unknown): string {
  if (value === undefined || value === null) {
    return 'none';
  }

  if (typeof value === 'boolean') {
    return value ? 'on' : 'off';
  }

  if (typeof value === 'string') {
    return `"${value}"`;
  }

  if (typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return 'unknown';
}

function buildTooltip(description?: string, defaultValue?: unknown): string | undefined {
  const parts: string[] = [];

  if (description) {
    parts.push(description);
  }

  if (defaultValue !== undefined) {
    parts.push(`Default: ${formatDefaultValue(defaultValue)}`);
  }

  return parts.length > 0 ? parts.join('\n') : undefined;
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
}: FieldRendererProps<T>) {
  const error = errors[field.name as keyof T];
  const errorMessage = error?.message as string | undefined;
  const label = formatLabel(field.name);

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

    case 'gradientPreset':
      return (
        <FieldWithHelp description={field.description} defaultValue={field.defaultValue}>
          <GradientPresetField
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

    default:
      return null;
  }
}
