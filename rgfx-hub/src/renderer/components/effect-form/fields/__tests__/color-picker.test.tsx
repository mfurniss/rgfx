/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { ColorPicker } from '../color-picker';

describe('ColorPicker', () => {
  afterEach(() => {
    cleanup();
  });

  describe('rendering', () => {
    it('should render color swatch and text input', () => {
      render(<ColorPicker value="#FF0000" onChange={vi.fn()} />);

      const colorInput = document.querySelector('input[type="color"]');
      const textInput = screen.getByRole('textbox');

      expect(colorInput).toBeDefined();
      expect(textInput).toBeDefined();
    });

    it('should display the current value in text field', () => {
      render(<ColorPicker value="#00FF00" onChange={vi.fn()} />);

      const textInput = screen.getByRole('textbox');
      expect((textInput as HTMLInputElement).value).toBe('#00FF00');
    });

    it('should display hex value in color swatch', () => {
      render(<ColorPicker value="#0000FF" onChange={vi.fn()} />);

      const colorInput = document.querySelector('input[type="color"]')!;
      expect((colorInput as HTMLInputElement).value).toBe('#0000ff');
    });

    it('should convert named color to hex in color swatch', () => {
      render(<ColorPicker value="red" onChange={vi.fn()} />);

      const colorInput = document.querySelector('input[type="color"]')!;
      expect((colorInput as HTMLInputElement).value).toBe('#ff0000');
    });
  });

  describe('validation', () => {
    it('should show error for invalid hex like "#foobar"', () => {
      render(<ColorPicker value="#foobar" onChange={vi.fn()} />);

      const textInput = screen.getByRole('textbox');
      expect(textInput.getAttribute('aria-invalid')).toBe('true');
      expect(screen.getByText('Invalid color')).toBeDefined();
    });

    it('should accept valid hex "#FF0000"', () => {
      render(<ColorPicker value="#FF0000" onChange={vi.fn()} />);

      const textInput = screen.getByRole('textbox');
      expect(textInput.getAttribute('aria-invalid')).toBe('false');
    });

    it('should accept named color "red"', () => {
      render(<ColorPicker value="red" onChange={vi.fn()} />);

      const textInput = screen.getByRole('textbox');
      expect(textInput.getAttribute('aria-invalid')).toBe('false');
    });

    it('should accept named color "random"', () => {
      render(<ColorPicker value="random" onChange={vi.fn()} />);

      const textInput = screen.getByRole('textbox');
      expect(textInput.getAttribute('aria-invalid')).toBe('false');
    });

    it('should show error for unknown color "foobar"', () => {
      render(<ColorPicker value="foobar" onChange={vi.fn()} />);

      const textInput = screen.getByRole('textbox');
      expect(textInput.getAttribute('aria-invalid')).toBe('true');
    });

    it('should show error for hex without # prefix', () => {
      render(<ColorPicker value="FF0000" onChange={vi.fn()} />);

      const textInput = screen.getByRole('textbox');
      expect(textInput.getAttribute('aria-invalid')).toBe('true');
    });
  });

  describe('interaction', () => {
    it('should call onChange when text input changes', () => {
      const handleChange = vi.fn();
      render(<ColorPicker value="#FF0000" onChange={handleChange} />);

      const textInput = screen.getByRole('textbox');
      fireEvent.change(textInput, { target: { value: '#00FF00' } });

      expect(handleChange).toHaveBeenCalledWith('#00FF00');
    });

    it('should call onChange when color swatch changes', () => {
      const handleChange = vi.fn();
      render(<ColorPicker value="#FF0000" onChange={handleChange} />);

      const colorInput = document.querySelector('input[type="color"]')!;
      fireEvent.change(colorInput, { target: { value: '#0000ff' } });

      expect(handleChange).toHaveBeenCalledWith('#0000ff');
    });
  });

  describe('disabled state', () => {
    it('should disable both inputs when disabled=true', () => {
      render(<ColorPicker value="#FF0000" onChange={vi.fn()} disabled={true} />);

      const colorInput = document.querySelector('input[type="color"]')!;
      const textInput = screen.getByRole('textbox');

      expect((colorInput as HTMLInputElement).disabled).toBe(true);
      expect((textInput as HTMLInputElement).disabled).toBe(true);
    });
  });

  describe('helper text', () => {
    it('should show custom helper text when valid', () => {
      render(
        <ColorPicker
          value="#FF0000"
          onChange={vi.fn()}
          helperText="Enter a hex color"
        />,
      );

      expect(screen.getByText('Enter a hex color')).toBeDefined();
    });

    it('should show error text instead of helper text when invalid', () => {
      render(
        <ColorPicker
          value="#foobar"
          onChange={vi.fn()}
          helperText="Enter a hex color"
        />,
      );

      expect(screen.getByText('Invalid color')).toBeDefined();
      expect(screen.queryByText('Enter a hex color')).toBeNull();
    });
  });

  describe('label', () => {
    it('should render label when provided', () => {
      render(<ColorPicker value="#FF0000" onChange={vi.fn()} label="Color" />);

      expect(screen.getByLabelText('Color')).toBeDefined();
    });
  });

  describe('local state optimization', () => {
    it('should not call onChange for partial/invalid text input', () => {
      const handleChange = vi.fn();
      render(<ColorPicker value="#FF0000" onChange={handleChange} />);

      const textInput = screen.getByRole('textbox');
      fireEvent.change(textInput, { target: { value: '#F' } });

      expect(handleChange).not.toHaveBeenCalled();
      expect((textInput as HTMLInputElement).value).toBe('#F');
    });

    it('should call onChange immediately when typed value is valid', () => {
      const handleChange = vi.fn();
      render(<ColorPicker value="#FF0000" onChange={handleChange} />);

      const textInput = screen.getByRole('textbox');
      fireEvent.change(textInput, { target: { value: '#00FF00' } });

      expect(handleChange).toHaveBeenCalledWith('#00FF00');
    });

    it('should call onChange on blur with valid value', () => {
      const handleChange = vi.fn();
      render(<ColorPicker value="#FF0000" onChange={handleChange} />);

      const textInput = screen.getByRole('textbox');
      fireEvent.change(textInput, { target: { value: 'red' } });
      handleChange.mockClear();
      fireEvent.blur(textInput);

      expect(handleChange).toHaveBeenCalledWith('red');
    });

    it('should revert to last valid value on blur when invalid', () => {
      const handleChange = vi.fn();
      render(<ColorPicker value="#FF0000" onChange={handleChange} />);

      const textInput = screen.getByRole('textbox');
      fireEvent.change(textInput, { target: { value: 'foobar' } });
      fireEvent.blur(textInput);

      expect((textInput as HTMLInputElement).value).toBe('#FF0000');
    });

    it('should call onChange immediately from color swatch', () => {
      const handleChange = vi.fn();
      render(<ColorPicker value="#FF0000" onChange={handleChange} />);

      const colorInput = document.querySelector('input[type="color"]')!;
      fireEvent.change(colorInput, { target: { value: '#0000ff' } });

      expect(handleChange).toHaveBeenCalledWith('#0000ff');
    });

    it('should sync local state when value prop changes externally', () => {
      const handleChange = vi.fn();
      const { rerender } = render(
        <ColorPicker value="#FF0000" onChange={handleChange} />,
      );

      rerender(
        <ColorPicker value="#00FF00" onChange={handleChange} />,
      );

      const textInput = screen.getByRole('textbox');
      expect((textInput as HTMLInputElement).value).toBe('#00FF00');
    });
  });
});
