import React from 'react';
import { Box, Tooltip } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { type Control, type FieldValues, type FieldErrors, type FieldPath, useWatch } from 'react-hook-form';
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
} from './field-utils';

interface FieldRendererProps<T extends FieldValues> {
  field: FieldMetadata;
  control: Control<T>;
  errors: FieldErrors<T>;
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
      <Tooltip title={<Box component="span" sx={{ whiteSpace: 'pre-line' }}>{tooltip}</Box>} placement="top" arrow>
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

// Fields that should be disabled when gradient has < 2 colors
const GRADIENT_DEPENDENT_FIELDS = ['gradientSpeed', 'gradientScale'];

export function FieldRenderer<T extends FieldValues>({
  field,
  control,
  errors,
}: FieldRendererProps<T>) {
  const error = errors[field.name as keyof T];
  const errorMessage = error?.message as string | undefined;
  const label = formatLabel(field.name);

  // Watch gradient field to determine if speed/scale should be disabled
  const gradientValue = useWatch({ control, name: 'gradient' as FieldPath<T> }) as unknown;
  const isGradientDependentField = GRADIENT_DEPENDENT_FIELDS.includes(field.name);
  const gradientColors = Array.isArray(gradientValue) ? (gradientValue as unknown[]).length : 0;
  const isGradientAnimationDisabled = isGradientDependentField && gradientColors < 2;

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
            helperText={
              isGradientAnimationDisabled
                ? 'Requires 2+ gradient colors'
                : formatConstraintHint(field.constraints)
            }
            allowFloat
            size="small"
            emptyValue={field.emptyValue}
            disabled={isGradientAnimationDisabled}
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
