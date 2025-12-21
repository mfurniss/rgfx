/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { useForm } from 'react-hook-form';
import { NumberField } from '@/renderer/components/common/number-field';

interface TestFormValues {
  pin: number | null;
  brightness: number | null;
  voltage: number | null;
}


// Standalone test component with its own form
const TestNumberField: React.FC<{
  defaultValue?: number | null;
  allowFloat?: boolean;
  label?: string;
  onValueChange?: (value: number | null) => void;
}> = ({ defaultValue = null, allowFloat = false, label = 'Test Field', onValueChange }) => {
  const { control, watch } = useForm<{ testField: number | null }>({
    defaultValues: { testField: defaultValue },
    mode: 'onChange',
  });

  const value = watch('testField');
  React.useEffect(() => {
    onValueChange?.(value);
  }, [value, onValueChange]);

  return (
    <NumberField
      name="testField"
      control={control}
      label={label}
      allowFloat={allowFloat}
    />
  );
};

describe('NumberField', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders with label', () => {
    render(<TestNumberField label="GPIO Pin" />);

    expect(screen.getByLabelText('GPIO Pin')).toBeDefined();
  });

  it('renders with helper text', () => {
    const { control } = renderHookForm();

    render(
      <NumberField
        name="pin"
        control={control}
        label="Pin"
        helperText="Enter GPIO pin number"
      />,
    );

    expect(screen.getByText('Enter GPIO pin number')).toBeDefined();
  });

  it('displays initial value', () => {
    render(<TestNumberField defaultValue={16} />);

    const input: HTMLInputElement = screen.getByRole('spinbutton');
    expect(input.value).toBe('16');
  });

  it('displays empty when value is null', () => {
    render(<TestNumberField defaultValue={null} />);

    const input: HTMLInputElement = screen.getByRole('spinbutton');
    expect(input.value).toBe('');
  });

  it('converts string input to integer on blur', () => {
    let capturedValue: number | null = null;
    render(
      <TestNumberField
        onValueChange={(v) => {
          capturedValue = v;
        }}
      />,
    );

    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '42' } });
    fireEvent.blur(input);

    expect(capturedValue).toBe(42);
  });

  it('converts string input to float when allowFloat is true', () => {
    let capturedValue: number | null = null;
    render(
      <TestNumberField
        allowFloat
        onValueChange={(v) => {
          capturedValue = v;
        }}
      />,
    );

    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '3.14' } });
    fireEvent.blur(input);

    expect(capturedValue).toBe(3.14);
  });

  it('sets value to undefined when input is cleared', () => {
    let capturedValue: number | null | undefined = 42;
    render(
      <TestNumberField
        defaultValue={42}
        onValueChange={(v) => {
          capturedValue = v;
        }}
      />,
    );

    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);

    expect(capturedValue).toBeUndefined();
  });

  it('sets value to undefined for invalid input', () => {
    let capturedValue: number | null | undefined = 42;
    render(
      <TestNumberField
        defaultValue={42}
        onValueChange={(v) => {
          capturedValue = v;
        }}
      />,
    );

    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: 'abc' } });
    fireEvent.blur(input);

    expect(capturedValue).toBeUndefined();
  });

  it('uses type="number" for native number input behavior', () => {
    render(<TestNumberField />);

    const input = screen.getByRole('spinbutton');
    expect(input.getAttribute('type')).toBe('number');
  });
});

// Helper to create form methods for tests that need direct control access
function renderHookForm() {
  let control: ReturnType<typeof useForm<TestFormValues>>['control'];

  const Wrapper: React.FC = () => {
    const methods = useForm<TestFormValues>({
      defaultValues: { pin: null, brightness: null, voltage: null },
    });
    control = methods.control;
    return null;
  };

  render(<Wrapper />);
  return { control: control! };
}
