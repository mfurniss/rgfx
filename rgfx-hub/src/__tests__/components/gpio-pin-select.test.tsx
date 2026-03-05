import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useForm } from 'react-hook-form';
import { GpioPinSelect } from '@/renderer/components/common/gpio-pin-select';

interface TestFormValues {
  pin: number | null;
}

// Test wrapper component
const TestGpioPinSelect: React.FC<{
  defaultValue?: number | null;
  chipModel?: string;
  onValueChange?: (value: number | null) => void;
}> = ({ defaultValue = null, chipModel, onValueChange }) => {
  const { control, watch } = useForm<TestFormValues>({
    defaultValues: { pin: defaultValue },
    mode: 'onChange',
  });

  const value = watch('pin');
  React.useEffect(() => {
    onValueChange?.(value);
  }, [value, onValueChange]);

  return <GpioPinSelect name="pin" control={control} chipModel={chipModel} />;
};

describe('GpioPinSelect', () => {
  describe('rendering', () => {
    it('renders with GPIO Pin label', () => {
      render(<TestGpioPinSelect />);
      // MUI renders label in multiple places
      expect(screen.getAllByText('GPIO Pin').length).toBeGreaterThan(0);
    });

    it('displays selected pin value', () => {
      render(<TestGpioPinSelect defaultValue={16} />);
      const select = screen.getByRole('combobox');
      expect(select.textContent).toContain('GPIO 16');
    });

    it('displays empty when no value selected', () => {
      render(<TestGpioPinSelect defaultValue={null} />);
      const select = screen.getByRole('combobox');
      // MUI renders a zero-width space character for empty select
      expect(select.textContent).not.toContain('GPIO');
    });
  });

  describe('chip type detection', () => {
    it('shows ESP32 header when chipModel is null', async () => {
      render(<TestGpioPinSelect />);

      const select = screen.getByRole('combobox');
      fireEvent.mouseDown(select);

      const listbox = await screen.findByRole('listbox');
      expect(within(listbox).getByText('ESP32')).toBeDefined();
    });

    it('shows ESP32 header for ESP32-WROOM chip model', async () => {
      render(<TestGpioPinSelect chipModel="ESP32-D0WD-V3" />);

      const select = screen.getByRole('combobox');
      fireEvent.mouseDown(select);

      const listbox = await screen.findByRole('listbox');
      expect(within(listbox).getByText('ESP32')).toBeDefined();
    });

    it('shows ESP32-S3 header for ESP32-S3 chip model', async () => {
      render(<TestGpioPinSelect chipModel="ESP32-S3-WROOM-1" />);

      const select = screen.getByRole('combobox');
      fireEvent.mouseDown(select);

      const listbox = await screen.findByRole('listbox');
      expect(within(listbox).getByText('ESP32-S3')).toBeDefined();
    });
  });

  describe('ESP32 pins', () => {
    it('shows safe ESP32 pins', async () => {
      render(<TestGpioPinSelect chipModel="ESP32" />);

      const select = screen.getByRole('combobox');
      fireEvent.mouseDown(select);

      const listbox = await screen.findByRole('listbox');
      // Check some known safe pins
      expect(within(listbox).getByText('GPIO 4')).toBeDefined();
      expect(within(listbox).getByText('GPIO 16')).toBeDefined();
      expect(within(listbox).getByText('GPIO 32')).toBeDefined();
    });

    it('shows ESP32 boot strapping pins with warnings', async () => {
      render(<TestGpioPinSelect chipModel="ESP32" />);

      const select = screen.getByRole('combobox');
      fireEvent.mouseDown(select);

      const listbox = await screen.findByRole('listbox');
      expect(within(listbox).getByText(/GPIO 0 - Boot strapping/)).toBeDefined();
      expect(within(listbox).getByText(/GPIO 12 - Boot strapping/)).toBeDefined();
    });

    it('does not show ESP32 flash pins (6-11)', async () => {
      render(<TestGpioPinSelect chipModel="ESP32" />);

      const select = screen.getByRole('combobox');
      fireEvent.mouseDown(select);

      const listbox = await screen.findByRole('listbox');
      expect(within(listbox).queryByText('GPIO 6')).toBeNull();
      expect(within(listbox).queryByText('GPIO 7')).toBeNull();
      expect(within(listbox).queryByText('GPIO 11')).toBeNull();
    });

    it('does not show ESP32 input-only pins (34-39)', async () => {
      render(<TestGpioPinSelect chipModel="ESP32" />);

      const select = screen.getByRole('combobox');
      fireEvent.mouseDown(select);

      const listbox = await screen.findByRole('listbox');
      expect(within(listbox).queryByText('GPIO 34')).toBeNull();
      expect(within(listbox).queryByText('GPIO 39')).toBeNull();
    });
  });

  describe('ESP32-S3 pins', () => {
    it('shows safe ESP32-S3 pins', async () => {
      render(<TestGpioPinSelect chipModel="ESP32-S3" />);

      const select = screen.getByRole('combobox');
      fireEvent.mouseDown(select);

      const listbox = await screen.findByRole('listbox');
      // Check some known safe S3 pins
      expect(within(listbox).getByText('GPIO 1')).toBeDefined();
      expect(within(listbox).getByText('GPIO 5')).toBeDefined();
      expect(within(listbox).getByText('GPIO 10')).toBeDefined();
    });

    it('shows ESP32-S3 JTAG pins with warnings', async () => {
      render(<TestGpioPinSelect chipModel="ESP32-S3" />);

      const select = screen.getByRole('combobox');
      fireEvent.mouseDown(select);

      const listbox = await screen.findByRole('listbox');
      expect(within(listbox).getByText(/GPIO 15 - JTAG/)).toBeDefined();
      expect(within(listbox).getByText(/GPIO 16 - JTAG/)).toBeDefined();
    });

    it('does not show ESP32-S3 USB pins (19-20)', async () => {
      render(<TestGpioPinSelect chipModel="ESP32-S3" />);

      const select = screen.getByRole('combobox');
      fireEvent.mouseDown(select);

      const listbox = await screen.findByRole('listbox');
      expect(within(listbox).queryByText('GPIO 19')).toBeNull();
      expect(within(listbox).queryByText('GPIO 20')).toBeNull();
    });
  });

  describe('unlisted pin warning', () => {
    it('shows warning for unlisted pin on ESP32', () => {
    // Pin 6 is flash on ESP32 - not in the safe list
      render(<TestGpioPinSelect defaultValue={6} chipModel="ESP32" />);

      expect(screen.getByText(/GPIO 6 is not recommended/)).toBeDefined();
    });

    it('shows warning for unlisted pin on ESP32-S3', () => {
    // Pin 19 is USB on S3 - not in the safe list
      render(<TestGpioPinSelect defaultValue={19} chipModel="ESP32-S3" />);

      expect(screen.getByText(/GPIO 19 is not recommended/)).toBeDefined();
    });

    it('includes chip type in warning message', () => {
      render(<TestGpioPinSelect defaultValue={6} chipModel="ESP32" />);

      expect(screen.getByText(/not recommended for ESP32/)).toBeDefined();
    });

    it('shows unlisted pin as selectable option', async () => {
      render(<TestGpioPinSelect defaultValue={6} chipModel="ESP32" />);

      const select = screen.getByRole('combobox');
      fireEvent.mouseDown(select);

      const listbox = await screen.findByRole('listbox');
      expect(within(listbox).getByText(/GPIO 6 \(current\)/)).toBeDefined();
    });

    it('does not show warning for listed pin', () => {
      render(<TestGpioPinSelect defaultValue={16} chipModel="ESP32" />);

      expect(screen.queryByRole('alert')).toBeNull();
    });
  });

  describe('pin selection', () => {
    it('updates value when pin is selected', async () => {
      let capturedValue: number | null = null;
      render(
        <TestGpioPinSelect
          defaultValue={16}
          chipModel="ESP32"
          onValueChange={(v) => {
            capturedValue = v;
          }}
        />,
      );

      const select = screen.getByRole('combobox');
      fireEvent.mouseDown(select);

      const listbox = await screen.findByRole('listbox');
      const option = within(listbox).getByText('GPIO 4');
      fireEvent.click(option);

      expect(capturedValue).toBe(4);
    });
  });

  describe('Use with Caution section', () => {
    it('shows Use with Caution header', async () => {
      render(<TestGpioPinSelect chipModel="ESP32" />);

      const select = screen.getByRole('combobox');
      fireEvent.mouseDown(select);

      const listbox = await screen.findByRole('listbox');
      expect(within(listbox).getByText('Use with Caution')).toBeDefined();
    });
  });
});
