import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DeleteDriverButton from '../delete-driver-button';
import { createMockDriver } from '@/__tests__/factories';

const mockNavigate = vi.fn();
const mockDeleteDriver = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

beforeEach(() => {
  vi.clearAllMocks();
  (window as unknown as { rgfx: { deleteDriver: typeof mockDeleteDriver } }).rgfx = {
    deleteDriver: mockDeleteDriver,
  };
});

describe('DeleteDriverButton', () => {
  describe('button rendering', () => {
    it('renders Delete button', () => {
      const driver = createMockDriver();
      render(<DeleteDriverButton driver={driver} />);

      expect(screen.getByText('Delete')).toBeDefined();
    });

    it('renders with error color', () => {
      const driver = createMockDriver();
      render(<DeleteDriverButton driver={driver} />);

      const button = screen.getByText('Delete').closest('button');
      expect(button?.className).toContain('Error');
    });
  });

  describe('dialog content', () => {
    it('shows dialog with driver ID when clicked', () => {
      const driver = createMockDriver({ id: 'test-driver-001' });
      render(<DeleteDriverButton driver={driver} />);

      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByText('Delete Driver')).toBeDefined();
      expect(screen.getByText(/test-driver-001/)).toBeDefined();
    });

    it('shows warning about action being permanent', () => {
      const driver = createMockDriver();
      render(<DeleteDriverButton driver={driver} />);

      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByText(/cannot be undone/)).toBeDefined();
    });
  });

  describe('delete action', () => {
    const getDialogConfirmButton = () => {
      const buttons = screen.getAllByRole('button');
      return buttons.find(b =>
        b.textContent === 'Delete' && b.className.includes('contained'),
      );
    };

    it('calls deleteDriver API with driver ID', async () => {
      mockDeleteDriver.mockResolvedValue({ success: true });
      const driver = createMockDriver({ id: 'driver-to-delete' });
      render(<DeleteDriverButton driver={driver} />);

      fireEvent.click(screen.getByText('Delete'));
      const confirmButton = getDialogConfirmButton();
      fireEvent.click(confirmButton!);

      await waitFor(() => {
        expect(mockDeleteDriver).toHaveBeenCalledWith('driver-to-delete');
      });
    });

    it('navigates to /drivers on successful deletion', async () => {
      mockDeleteDriver.mockResolvedValue({ success: true });
      const driver = createMockDriver();
      render(<DeleteDriverButton driver={driver} />);

      fireEvent.click(screen.getByText('Delete'));
      const confirmButton = getDialogConfirmButton();
      fireEvent.click(confirmButton!);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/drivers');
      });
    });

    it('does not navigate on API error', async () => {
      mockDeleteDriver.mockRejectedValue(new Error('API error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const driver = createMockDriver();
      render(<DeleteDriverButton driver={driver} />);

      fireEvent.click(screen.getByText('Delete'));
      const confirmButton = getDialogConfirmButton();
      fireEvent.click(confirmButton!);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      expect(mockNavigate).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('dialog cancellation', () => {
    it('closes dialog without action when Cancel is clicked', async () => {
      const driver = createMockDriver();
      render(<DeleteDriverButton driver={driver} />);

      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByText('Delete Driver')).toBeDefined();

      fireEvent.click(screen.getByText('Cancel'));

      await waitFor(() => {
        expect(screen.queryByText('Delete Driver')).toBeNull();
      });

      expect(mockDeleteDriver).not.toHaveBeenCalled();
    });
  });
});
