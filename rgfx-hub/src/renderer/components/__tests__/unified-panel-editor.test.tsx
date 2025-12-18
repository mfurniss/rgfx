/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { UnifiedPanelEditor } from '../unified-panel-editor';

describe('UnifiedPanelEditor', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
    cleanup();
  });

  describe('empty state (single panel mode)', () => {
    it('should show single panel mode message when value is null', () => {
      render(<UnifiedPanelEditor value={null} onChange={mockOnChange} />);

      expect(screen.getByText('Single panel mode (no unified layout)')).toBeDefined();
      expect(screen.getByText('Configure Multi-Panel')).toBeDefined();
    });

    it('should show single panel mode message when value is undefined', () => {
      render(<UnifiedPanelEditor value={undefined} onChange={mockOnChange} />);

      expect(screen.getByText('Single panel mode (no unified layout)')).toBeDefined();
    });

    it('should create default 2x2 grid when clicking Configure Multi-Panel', () => {
      render(<UnifiedPanelEditor value={null} onChange={mockOnChange} />);

      fireEvent.click(screen.getByText('Configure Multi-Panel'));

      expect(mockOnChange).toHaveBeenCalledWith([
        ['0', '1'],
        ['2', '3'],
      ]);
    });

    it('should disable Configure Multi-Panel button when disabled prop is true', () => {
      render(<UnifiedPanelEditor value={null} onChange={mockOnChange} disabled />);

      expect(screen.getByText('Configure Multi-Panel')).toHaveProperty('disabled', true);
    });
  });

  describe('grid display', () => {
    it('should display 2x2 grid with correct indices', () => {
      render(
        <UnifiedPanelEditor
          value={[
            ['0', '1'],
            ['2', '3'],
          ]}
          onChange={mockOnChange}
        />,
      );

      expect(screen.getByText('Multi-Panel Layout (2×2 = 4 panels)')).toBeDefined();
      expect(screen.getByText('0')).toBeDefined();
      expect(screen.getByText('1')).toBeDefined();
      expect(screen.getByText('2')).toBeDefined();
      expect(screen.getByText('3')).toBeDefined();
    });

    it('should display rotation labels correctly', () => {
      render(
        <UnifiedPanelEditor
          value={[
            ['0a', '1b'],
            ['2c', '3d'],
          ]}
          onChange={mockOnChange}
        />,
      );

      // All four rotation labels should be present
      const rotationLabels = screen.getAllByText(/^(0°|90°|180°|270°)$/);
      expect(rotationLabels.length).toBe(4);
    });

    it('should display 1x3 horizontal layout', () => {
      render(<UnifiedPanelEditor value={[['0', '1', '2']]} onChange={mockOnChange} />);

      expect(screen.getByText('Multi-Panel Layout (1×3 = 3 panels)')).toBeDefined();
    });

    it('should display 3x1 vertical layout', () => {
      render(<UnifiedPanelEditor value={[['0'], ['1'], ['2']]} onChange={mockOnChange} />);

      expect(screen.getByText('Multi-Panel Layout (3×1 = 3 panels)')).toBeDefined();
    });

    it('should handle cells without rotation suffix (defaults to 0°)', () => {
      render(<UnifiedPanelEditor value={[['5']]} onChange={mockOnChange} />);

      expect(screen.getByText('5')).toBeDefined();
      expect(screen.getByText('0°')).toBeDefined();
    });

    it('should show helper text for drag and click interactions', () => {
      render(
        <UnifiedPanelEditor
          value={[
            ['0', '1'],
            ['2', '3'],
          ]}
          onChange={mockOnChange}
        />,
      );

      expect(screen.getByText('Drag to swap panels, click to rotate')).toBeDefined();
    });
  });

  describe('clear functionality', () => {
    it('should clear grid to null when clicking Clear button', () => {
      render(
        <UnifiedPanelEditor
          value={[
            ['0', '1'],
            ['2', '3'],
          ]}
          onChange={mockOnChange}
        />,
      );

      fireEvent.click(screen.getByText('Clear'));

      expect(mockOnChange).toHaveBeenCalledWith(null);
    });

    it('should disable Clear button when disabled prop is true', () => {
      render(
        <UnifiedPanelEditor
          value={[
            ['0', '1'],
            ['2', '3'],
          ]}
          onChange={mockOnChange}
          disabled
        />,
      );

      expect(screen.getByText('Clear')).toHaveProperty('disabled', true);
    });
  });

  describe('dimension changes', () => {
    it('should increase rows while preserving existing cells', () => {
      render(
        <UnifiedPanelEditor
          value={[
            ['0a', '1b'],
            ['2c', '3d'],
          ]}
          onChange={mockOnChange}
        />,
      );

      const rowsInput = screen.getByLabelText('Rows');
      fireEvent.change(rowsInput, { target: { value: '3' } });

      expect(mockOnChange).toHaveBeenCalledWith([
        ['0a', '1b'],
        ['2c', '3d'],
        ['4', '5'],
      ]);
    });

    it('should increase cols while preserving existing cells', () => {
      render(
        <UnifiedPanelEditor
          value={[
            ['0a', '1b'],
            ['2c', '3d'],
          ]}
          onChange={mockOnChange}
        />,
      );

      const colsInput = screen.getByLabelText('Cols');
      fireEvent.change(colsInput, { target: { value: '3' } });

      expect(mockOnChange).toHaveBeenCalledWith([
        ['0a', '1b', '4'],
        ['2c', '3d', '5'],
      ]);
    });

    it('should decrease rows (truncate grid)', () => {
      render(
        <UnifiedPanelEditor
          value={[
            ['0', '1'],
            ['2', '3'],
            ['4', '5'],
          ]}
          onChange={mockOnChange}
        />,
      );

      const rowsInput = screen.getByLabelText('Rows');
      fireEvent.change(rowsInput, { target: { value: '2' } });

      expect(mockOnChange).toHaveBeenCalledWith([
        ['0', '1'],
        ['2', '3'],
      ]);
    });

    it('should decrease cols (truncate grid)', () => {
      render(
        <UnifiedPanelEditor
          value={[
            ['0', '1', '2'],
            ['3', '4', '5'],
          ]}
          onChange={mockOnChange}
        />,
      );

      const colsInput = screen.getByLabelText('Cols');
      fireEvent.change(colsInput, { target: { value: '2' } });

      expect(mockOnChange).toHaveBeenCalledWith([
        ['0', '1'],
        ['3', '4'],
      ]);
    });

    it('should not change grid when rows is less than 1', () => {
      render(
        <UnifiedPanelEditor
          value={[
            ['0', '1'],
            ['2', '3'],
          ]}
          onChange={mockOnChange}
        />,
      );

      const rowsInput = screen.getByLabelText('Rows');
      fireEvent.change(rowsInput, { target: { value: '0' } });

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should not change grid when rows is greater than 8', () => {
      render(
        <UnifiedPanelEditor
          value={[
            ['0', '1'],
            ['2', '3'],
          ]}
          onChange={mockOnChange}
        />,
      );

      const rowsInput = screen.getByLabelText('Rows');
      fireEvent.change(rowsInput, { target: { value: '9' } });

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should not change grid when cols is less than 1', () => {
      render(
        <UnifiedPanelEditor
          value={[
            ['0', '1'],
            ['2', '3'],
          ]}
          onChange={mockOnChange}
        />,
      );

      const colsInput = screen.getByLabelText('Cols');
      fireEvent.change(colsInput, { target: { value: '0' } });

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should not change grid when cols is greater than 8', () => {
      render(
        <UnifiedPanelEditor
          value={[
            ['0', '1'],
            ['2', '3'],
          ]}
          onChange={mockOnChange}
        />,
      );

      const colsInput = screen.getByLabelText('Cols');
      fireEvent.change(colsInput, { target: { value: '9' } });

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should disable dimension inputs when disabled prop is true', () => {
      render(
        <UnifiedPanelEditor
          value={[
            ['0', '1'],
            ['2', '3'],
          ]}
          onChange={mockOnChange}
          disabled
        />,
      );

      expect(screen.getByLabelText('Rows')).toHaveProperty('disabled', true);
      expect(screen.getByLabelText('Cols')).toHaveProperty('disabled', true);
    });

    it('should create default grid when enabling multi-panel mode', () => {
      render(<UnifiedPanelEditor value={null} onChange={mockOnChange} />);

      fireEvent.click(screen.getByText('Configure Multi-Panel'));

      expect(mockOnChange).toHaveBeenCalledWith([
        ['0', '1'],
        ['2', '3'],
      ]);
    });
  });

  describe('click-to-rotate', () => {
    it('should rotate cell from 0° to 90° on click', () => {
      render(
        <UnifiedPanelEditor
          value={[
            ['0', '1'],
            ['2', '3'],
          ]}
          onChange={mockOnChange}
        />,
      );

      // Click on cell with index 0 (which has 0° rotation by default)
      fireEvent.click(screen.getByText('0'));

      expect(mockOnChange).toHaveBeenCalledWith([
        ['0b', '1'],
        ['2', '3'],
      ]);
    });

    it('should rotate cell from 90° to 180° on click', () => {
      render(
        <UnifiedPanelEditor
          value={[
            ['0b', '1'],
            ['2', '3'],
          ]}
          onChange={mockOnChange}
        />,
      );

      fireEvent.click(screen.getByText('0'));

      expect(mockOnChange).toHaveBeenCalledWith([
        ['0c', '1'],
        ['2', '3'],
      ]);
    });

    it('should rotate cell from 180° to 270° on click', () => {
      render(
        <UnifiedPanelEditor
          value={[
            ['0c', '1'],
            ['2', '3'],
          ]}
          onChange={mockOnChange}
        />,
      );

      fireEvent.click(screen.getByText('0'));

      expect(mockOnChange).toHaveBeenCalledWith([
        ['0d', '1'],
        ['2', '3'],
      ]);
    });

    it('should rotate cell from 270° back to 0° on click', () => {
      render(
        <UnifiedPanelEditor
          value={[
            ['0d', '1'],
            ['2', '3'],
          ]}
          onChange={mockOnChange}
        />,
      );

      fireEvent.click(screen.getByText('0'));

      expect(mockOnChange).toHaveBeenCalledWith([
        ['0', '1'],
        ['2', '3'],
      ]);
    });

    it('should rotate cell in second row', () => {
      render(
        <UnifiedPanelEditor
          value={[
            ['0', '1'],
            ['2', '3'],
          ]}
          onChange={mockOnChange}
        />,
      );

      // Click on cell with index 2 (row 1, col 0)
      fireEvent.click(screen.getByText('2'));

      expect(mockOnChange).toHaveBeenCalledWith([
        ['0', '1'],
        ['2b', '3'],
      ]);
    });

    it('should not rotate when disabled', () => {
      render(
        <UnifiedPanelEditor
          value={[
            ['0', '1'],
            ['2', '3'],
          ]}
          onChange={mockOnChange}
          disabled
        />,
      );

      fireEvent.click(screen.getByText('0'));

      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  describe('parseCell edge cases', () => {
    it('should handle invalid cell format gracefully', () => {
      // Invalid cell format should default to index 0, rotation a
      render(<UnifiedPanelEditor value={[['invalid']]} onChange={mockOnChange} />);

      expect(screen.getByText('0')).toBeDefined();
      expect(screen.getByText('0°')).toBeDefined();
    });

    it('should handle multi-digit indices', () => {
      render(<UnifiedPanelEditor value={[['12c']]} onChange={mockOnChange} />);

      expect(screen.getByText('12')).toBeDefined();
      expect(screen.getByText('180°')).toBeDefined();
    });
  });

  describe('resizeGrid with non-sequential indices', () => {
    it('should find max index and continue from there when adding cells', () => {
      // Grid with custom arrangement where indices are not sequential
      render(
        <UnifiedPanelEditor
          value={[
            ['5', '3'],
            ['1', '7'],
          ]}
          onChange={mockOnChange}
        />,
      );

      const rowsInput = screen.getByLabelText('Rows');
      fireEvent.change(rowsInput, { target: { value: '3' } });

      // Max index is 7, so new cells should start at 8
      expect(mockOnChange).toHaveBeenCalledWith([
        ['5', '3'],
        ['1', '7'],
        ['8', '9'],
      ]);
    });
  });
});
