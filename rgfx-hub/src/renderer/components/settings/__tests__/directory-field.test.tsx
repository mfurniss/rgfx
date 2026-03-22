import React, { createRef } from 'react';
import { render, screen, fireEvent, waitFor, act } from '@/__tests__/render';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  DirectoryField,
  DirectoryFieldHandle,
} from '../directory-field';

describe('DirectoryField', () => {
  let mockVerifyDirectory: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockVerifyDirectory = vi.fn().mockResolvedValue(true);

    (window as unknown as { rgfx: Record<string, unknown> }).rgfx = {
      verifyDirectory: mockVerifyDirectory,
      selectDirectory: vi.fn().mockResolvedValue(null),
    };
  });

  describe('rendering', () => {
    it('renders with stored value', () => {
      render(
        <DirectoryField
          label="Test Dir"
          dialogTitle="Select Test Dir"
          helperText="Some help text"
          storedValue="/home/user/test"
        />,
      );

      const input = screen.getByLabelText('Test Dir');
      expect(input).toHaveProperty('value', '/home/user/test');
    });

    it('renders helper text', () => {
      render(
        <DirectoryField
          label="Test Dir"
          dialogTitle="Select Test Dir"
          helperText="Directory for test files"
          storedValue=""
        />,
      );

      expect(screen.getByText('Directory for test files')).toBeDefined();
    });

    it('updates value on user input', () => {
      render(
        <DirectoryField
          label="Test Dir"
          dialogTitle="Select Test Dir"
          helperText="Help"
          storedValue=""
        />,
      );

      const input = screen.getByLabelText('Test Dir');
      fireEvent.change(input, { target: { value: '/new/path' } });
      expect(input).toHaveProperty('value', '/new/path');
    });
  });

  describe('validate via ref', () => {
    it('returns true for valid directory', async () => {
      const ref = createRef<DirectoryFieldHandle>();

      render(
        <DirectoryField
          ref={ref}
          label="Test Dir"
          dialogTitle="Select"
          helperText="Help"
          storedValue="/valid/path"
        />,
      );

      let result!: boolean;

      await act(async () => {
        result = await ref.current!.validate();
      });

      expect(result).toBe(true);
      expect(mockVerifyDirectory).toHaveBeenCalledWith('/valid/path');
    });

    it('returns false and shows error for non-existent directory', async () => {
      mockVerifyDirectory.mockResolvedValue(false);
      const ref = createRef<DirectoryFieldHandle>();

      render(
        <DirectoryField
          ref={ref}
          label="Test Dir"
          dialogTitle="Select"
          helperText="Help"
          storedValue="/bad/path"
        />,
      );

      let result!: boolean;

      await act(async () => {
        result = await ref.current!.validate();
      });

      expect(result).toBe(false);

      await waitFor(() => {
        expect(screen.getByText('Directory does not exist')).toBeDefined();
      });
    });

    it('returns false for empty required field', async () => {
      const ref = createRef<DirectoryFieldHandle>();

      render(
        <DirectoryField
          ref={ref}
          label="Test Dir"
          dialogTitle="Select"
          helperText="Help"
          storedValue=""
          required
        />,
      );

      let result!: boolean;

      await act(async () => {
        result = await ref.current!.validate();
      });

      expect(result).toBe(false);

      await waitFor(() => {
        expect(screen.getByText('Directory is required')).toBeDefined();
      });
    });

    it('returns true for empty optional field', async () => {
      const ref = createRef<DirectoryFieldHandle>();

      render(
        <DirectoryField
          ref={ref}
          label="Test Dir"
          dialogTitle="Select"
          helperText="Help"
          storedValue=""
        />,
      );

      let result!: boolean;

      await act(async () => {
        result = await ref.current!.validate();
      });

      expect(result).toBe(true);
      expect(mockVerifyDirectory).not.toHaveBeenCalled();
    });
  });

  describe('getValue via ref', () => {
    it('returns trimmed value', () => {
      const ref = createRef<DirectoryFieldHandle>();

      render(
        <DirectoryField
          ref={ref}
          label="Test Dir"
          dialogTitle="Select"
          helperText="Help"
          storedValue="  /some/path  "
        />,
      );

      expect(ref.current!.getValue()).toBe('/some/path');
    });
  });

  describe('error clearing', () => {
    it('clears error when user types after validation failure', async () => {
      mockVerifyDirectory.mockResolvedValue(false);
      const ref = createRef<DirectoryFieldHandle>();

      render(
        <DirectoryField
          ref={ref}
          label="Test Dir"
          dialogTitle="Select"
          helperText="Help"
          storedValue="/bad/path"
        />,
      );

      await act(async () => {
        await ref.current!.validate();
      });

      expect(screen.getByText('Directory does not exist')).toBeDefined();

      const input = screen.getByLabelText('Test Dir');
      fireEvent.change(input, { target: { value: '/new/path' } });

      expect(screen.queryByText('Directory does not exist')).toBeNull();
    });
  });
});
