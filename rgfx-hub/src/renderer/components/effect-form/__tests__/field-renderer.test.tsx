import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useForm, FormProvider } from 'react-hook-form';
import { FieldRenderer } from '../field-renderer';
import type { FieldMetadata } from '@/renderer/utils/zod-introspection';

/**
 * These tests verify that the FieldRenderer correctly renders the appropriate
 * input component for each field type. This is critical for the Effects Playground
 * form to work correctly - if a field type is not recognized, it may render
 * as the wrong input type (e.g., enum dropdown instead of color picker).
 */

interface TestFormValues {
  testField: unknown;
}

interface TestWrapperProps {
  field: FieldMetadata;
  defaultValue?: unknown;
}

function TestWrapper({ field, defaultValue }: TestWrapperProps) {
  const methods = useForm<TestFormValues>({
    defaultValues: { testField: defaultValue ?? field.defaultValue },
    mode: 'onChange',
  });

  return (
    <FormProvider {...methods}>
      <FieldRenderer
        field={field}
        control={methods.control}
        errors={{}}
      />
    </FormProvider>
  );
}

describe('FieldRenderer', () => {
  describe('color field type', () => {
    const colorField: FieldMetadata = {
      name: 'testField',
      type: 'color',
      defaultValue: 'random',
      constraints: {
        enumValues: ['random', 'red', 'green', 'blue', 'white'],
      },
      description: 'Test color field',
    };

    it('should render a text input for color field', () => {
      render(<TestWrapper field={colorField} />);

      // Color field renders as a TextField with type="text"
      const input = screen.getByRole('textbox');
      expect(input).toBeDefined();
    });

    it('should render color picker input adornment', () => {
      render(<TestWrapper field={colorField} />);

      // Color field should have a color input for the swatch picker
      const colorInput = document.querySelector('input[type="color"]');
      expect(colorInput).toBeDefined();
    });

    it('should display default value in text field', () => {
      render(<TestWrapper field={colorField} defaultValue="blue" />);

      const input = screen.getByRole('textbox');
      expect((input as HTMLInputElement).value).toBe('blue');
    });

    it('should show helper text about color format', () => {
      render(<TestWrapper field={colorField} />);

      expect(screen.getByText(/Named color.*or hex/i)).toBeDefined();
    });
  });

  describe('boolean field type', () => {
    const booleanField: FieldMetadata = {
      name: 'testField',
      type: 'boolean',
      defaultValue: false,
      description: 'Test boolean field',
    };

    it('should render a switch for boolean field', () => {
      render(<TestWrapper field={booleanField} />);

      // MUI Switch uses role="switch"
      const switchInput = screen.getByRole('switch');
      expect(switchInput).toBeDefined();
    });

    it('should display formatted label', () => {
      render(<TestWrapper field={booleanField} />);

      // Label should be "Test Field" (formatted from "testField")
      expect(screen.getByText('Test Field')).toBeDefined();
    });

    it('should be unchecked when default is false', () => {
      render(<TestWrapper field={booleanField} defaultValue={false} />);

      const switchInput = screen.getByRole('switch');
      expect((switchInput as HTMLInputElement).checked).toBe(false);
    });

    it('should be checked when default is true', () => {
      render(<TestWrapper field={booleanField} defaultValue={true} />);

      const switchInput = screen.getByRole('switch');
      expect((switchInput as HTMLInputElement).checked).toBe(true);
    });
  });

  describe('number field type', () => {
    const numberField: FieldMetadata = {
      name: 'testField',
      type: 'number',
      defaultValue: 100,
      constraints: {
        min: 1,
        max: 500,
      },
      description: 'Test number field',
    };

    it('should render a number input for number field', () => {
      render(<TestWrapper field={numberField} />);

      const input = screen.getByRole('spinbutton');
      expect(input).toBeDefined();
    });

    it('should display default value', () => {
      render(<TestWrapper field={numberField} defaultValue={250} />);

      const input = screen.getByRole('spinbutton');
      expect((input as HTMLInputElement).value).toBe('250');
    });

    it('should show constraint hint when min and max provided', () => {
      render(<TestWrapper field={numberField} />);

      // Should show range hint
      expect(screen.getByText(/Range: 1 - 500/)).toBeDefined();
    });
  });

  describe('enum field type', () => {
    const enumField: FieldMetadata = {
      name: 'testField',
      type: 'enum',
      defaultValue: 'left',
      constraints: {
        enumValues: ['left', 'right', 'up', 'down', 'random'],
      },
      description: 'Test enum field',
    };

    it('should render a select/combobox for enum field', () => {
      render(<TestWrapper field={enumField} />);

      // MUI Select renders with combobox role
      const select = screen.getByRole('combobox');
      expect(select).toBeDefined();
    });

    it('should display formatted label', () => {
      render(<TestWrapper field={enumField} />);

      // MUI Select label is rendered in multiple places (label + legend)
      const labels = screen.getAllByText('Test Field');
      expect(labels.length).toBeGreaterThan(0);
    });

    it('should display default value', () => {
      render(<TestWrapper field={enumField} defaultValue="right" />);

      // The selected value is displayed in the combobox
      const select = screen.getByRole('combobox');
      expect(select.textContent).toBe('right');
    });
  });

  describe('centerXY field type', () => {
    const centerField: FieldMetadata = {
      name: 'testField',
      type: 'centerXY',
      defaultValue: 'random',
      description: 'Test center field',
    };

    it('should render a text input for centerXY field', () => {
      render(<TestWrapper field={centerField} />);

      const input = screen.getByRole('textbox');
      expect(input).toBeDefined();
    });

    it('should display "random" as default value', () => {
      render(<TestWrapper field={centerField} defaultValue="random" />);

      const input = screen.getByRole('textbox');
      expect((input as HTMLInputElement).value).toBe('random');
    });

    it('should display numeric value', () => {
      render(<TestWrapper field={centerField} defaultValue={50} />);

      const input = screen.getByRole('textbox');
      expect((input as HTMLInputElement).value).toBe('50');
    });

    it('should show helper text about valid values', () => {
      render(<TestWrapper field={centerField} />);

      expect(screen.getByText(/Number.*or 'random'/i)).toBeDefined();
    });
  });

  describe('field label formatting', () => {
    it('should format camelCase field names to Title Case', () => {
      const field: FieldMetadata = {
        name: 'particleCount',
        type: 'number',
        defaultValue: 100,
      };

      render(<TestWrapper field={field} />);

      expect(screen.getByLabelText('Particle Count')).toBeDefined();
    });

    it('should handle single word field names', () => {
      const field: FieldMetadata = {
        name: 'color',
        type: 'color',
        defaultValue: 'random',
        constraints: { enumValues: ['random', 'red'] },
      };

      render(<TestWrapper field={field} />);

      expect(screen.getByLabelText('Color')).toBeDefined();
    });

    it('should handle field names with multiple capital letters', () => {
      const field: FieldMetadata = {
        name: 'hueSpread',
        type: 'number',
        defaultValue: 40,
      };

      render(<TestWrapper field={field} />);

      expect(screen.getByLabelText('Hue Spread')).toBeDefined();
    });
  });

  describe('unknown field type', () => {
    it('should return null for unknown field types', () => {
      const unknownField: FieldMetadata = {
        name: 'testField',
        // @ts-expect-error - testing unknown type
        type: 'unknown',
        defaultValue: 'test',
      };

      const { container } = render(<TestWrapper field={unknownField} />);

      // Should render nothing for unknown field types
      expect(container.textContent).toBe('');
    });
  });

  describe('gradient-dependent fields', () => {
    interface GradientFormValues {
      gradient: string[];
      gradientSpeed: number;
      gradientScale: number;
    }

    function GradientTestWrapper({
      field,
      gradientColors,
    }: {
      field: FieldMetadata;
      gradientColors: string[];
    }) {
      const methods = useForm<GradientFormValues>({
        defaultValues: {
          gradient: gradientColors,
          gradientSpeed: 3,
          gradientScale: 1,
        },
        mode: 'onChange',
      });

      return (
        <FormProvider {...methods}>
          <FieldRenderer
            field={field}
            control={methods.control}
            errors={{}}
          />
        </FormProvider>
      );
    }

    const gradientSpeedField: FieldMetadata = {
      name: 'gradientSpeed',
      type: 'number',
      defaultValue: 3,
      constraints: { min: 0.1, max: 20 },
      description: 'Gradient animation speed',
    };

    const gradientScaleField: FieldMetadata = {
      name: 'gradientScale',
      type: 'number',
      defaultValue: 1,
      constraints: { min: 0.1, max: 5 },
      description: 'Gradient scale',
    };

    it('should disable gradientSpeed when gradient has 0 colors', () => {
      render(<GradientTestWrapper field={gradientSpeedField} gradientColors={[]} />);

      const input = screen.getByRole('spinbutton');
      expect((input as HTMLInputElement).disabled).toBe(true);
    });

    it('should disable gradientSpeed when gradient has 1 color', () => {
      render(<GradientTestWrapper field={gradientSpeedField} gradientColors={['#FF0000']} />);

      const input = screen.getByRole('spinbutton');
      expect((input as HTMLInputElement).disabled).toBe(true);
    });

    it('should enable gradientSpeed when gradient has 2+ colors', () => {
      render(
        <GradientTestWrapper field={gradientSpeedField} gradientColors={['#FF0000', '#00FF00']} />,
      );

      const input = screen.getByRole('spinbutton');
      expect((input as HTMLInputElement).disabled).toBe(false);
    });

    it('should disable gradientScale when gradient has < 2 colors', () => {
      render(<GradientTestWrapper field={gradientScaleField} gradientColors={['#FF0000']} />);

      const input = screen.getByRole('spinbutton');
      expect((input as HTMLInputElement).disabled).toBe(true);
    });

    it('should enable gradientScale when gradient has 2+ colors', () => {
      render(
        <GradientTestWrapper
          field={gradientScaleField}
          gradientColors={['#FF0000', '#00FF00', '#0000FF']}
        />,
      );

      const input = screen.getByRole('spinbutton');
      expect((input as HTMLInputElement).disabled).toBe(false);
    });

    it('should show helper text explaining why field is disabled', () => {
      render(<GradientTestWrapper field={gradientSpeedField} gradientColors={['#FF0000']} />);

      expect(screen.getByText('Requires 2+ gradient colors')).toBeDefined();
    });

    it('should show normal constraint hint when enabled', () => {
      render(
        <GradientTestWrapper field={gradientSpeedField} gradientColors={['#FF0000', '#00FF00']} />,
      );

      expect(screen.getByText(/Range: 0.1 - 20/)).toBeDefined();
    });
  });
});
