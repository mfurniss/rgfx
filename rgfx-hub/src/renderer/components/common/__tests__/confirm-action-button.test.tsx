import React from 'react';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Delete as DeleteIcon } from '@mui/icons-material';
import ConfirmActionButton from '../confirm-action-button';

afterEach(() => {
  cleanup();
});

describe('ConfirmActionButton', () => {
  const defaultProps = {
    label: 'Delete',
    icon: <DeleteIcon />,
    dialogTitle: 'Confirm Delete',
    dialogContent: <span>Are you sure you want to delete this?</span>,
    onConfirm: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('button rendering', () => {
    it('renders button with label', () => {
      render(<ConfirmActionButton {...defaultProps} />);
      expect(screen.getByText('Delete')).toBeDefined();
    });

    it('renders button with specified color', () => {
      render(<ConfirmActionButton {...defaultProps} color="error" />);
      // SuperButton wraps Button, check the outer element has error class (MUI uses colorError)
      const button = screen.getByText('Delete').closest('button');
      expect(button?.className).toContain('Error');
    });

    it('renders button with specified variant', () => {
      render(<ConfirmActionButton {...defaultProps} variant="contained" />);
      const button = screen.getByText('Delete').closest('button');
      expect(button?.className).toContain('contained');
    });

    it('disables button when disabled prop is true', () => {
      render(<ConfirmActionButton {...defaultProps} disabled />);
      const button = screen.getByText('Delete').closest('button');
      expect(button).toHaveProperty('disabled', true);
    });
  });

  describe('dialog behavior', () => {
    it('opens dialog when button is clicked', () => {
      render(<ConfirmActionButton {...defaultProps} />);
      fireEvent.click(screen.getByText('Delete'));

      expect(screen.getByText('Confirm Delete')).toBeDefined();
      expect(screen.getByText('Are you sure you want to delete this?')).toBeDefined();
    });

    it('closes dialog when Cancel is clicked', async () => {
      render(<ConfirmActionButton {...defaultProps} />);
      fireEvent.click(screen.getByText('Delete'));

      expect(screen.getByText('Confirm Delete')).toBeDefined();

      fireEvent.click(screen.getByText('Cancel'));

      await waitFor(() => {
        expect(screen.queryByText('Confirm Delete')).toBeNull();
      });
    });

    it('shows correct confirm button label', () => {
      render(<ConfirmActionButton {...defaultProps} confirmLabel="Yes, Delete" />);
      fireEvent.click(screen.getByText('Delete'));

      expect(screen.getByText('Yes, Delete')).toBeDefined();
    });

    it('defaults confirm label to button label', () => {
      render(<ConfirmActionButton {...defaultProps} />);
      fireEvent.click(screen.getByText('Delete'));

      // There should be a "Delete" button in the dialog actions (contained variant)
      const buttons = screen.getAllByRole('button');
      const confirmButton = buttons.find(b =>
        b.textContent === 'Delete' && b.className.includes('contained'),
      );
      expect(confirmButton).toBeDefined();
    });
  });

  describe('async action execution', () => {
    const getDialogConfirmButton = () => {
      const buttons = screen.getAllByRole('button');
      return buttons.find(b =>
        b.textContent === 'Delete' && b.className.includes('contained'),
      );
    };

    it('calls onConfirm when confirm button is clicked', async () => {
      const onConfirm = vi.fn().mockResolvedValue(undefined);
      render(<ConfirmActionButton {...defaultProps} onConfirm={onConfirm} />);

      fireEvent.click(screen.getByText('Delete'));
      const confirmButton = getDialogConfirmButton();
      fireEvent.click(confirmButton!);

      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalledTimes(1);
      });
    });

    it('shows pending label during execution', async () => {
      let resolveAction: () => void;
      const onConfirm = vi.fn().mockImplementation(
        () => new Promise<void>((resolve) => {
          resolveAction = resolve;
        }),
      );
      render(
        <ConfirmActionButton
          {...defaultProps}
          onConfirm={onConfirm}
          pendingLabel="Deleting..."
        />,
      );

      fireEvent.click(screen.getByText('Delete'));
      const confirmButton = getDialogConfirmButton();
      fireEvent.click(confirmButton!);

      await waitFor(() => {
        expect(screen.getByText('Deleting...')).toBeDefined();
      });

      resolveAction!();

      await waitFor(() => {
        expect(screen.getByText('Delete')).toBeDefined();
      });
    });

    it('defaults pending label to label with ellipsis', async () => {
      let resolveAction: () => void;
      const onConfirm = vi.fn().mockImplementation(
        () => new Promise<void>((resolve) => {
          resolveAction = resolve;
        }),
      );
      render(<ConfirmActionButton {...defaultProps} onConfirm={onConfirm} />);

      fireEvent.click(screen.getByText('Delete'));
      const confirmButton = getDialogConfirmButton();
      fireEvent.click(confirmButton!);

      await waitFor(() => {
        expect(screen.getByText('Delete...')).toBeDefined();
      });

      resolveAction!();
    });

    it('calls onSuccess after successful completion', async () => {
      const onConfirm = vi.fn().mockResolvedValue(undefined);
      const onSuccess = vi.fn();
      render(
        <ConfirmActionButton
          {...defaultProps}
          onConfirm={onConfirm}
          onSuccess={onSuccess}
        />,
      );

      fireEvent.click(screen.getByText('Delete'));
      const confirmButton = getDialogConfirmButton();
      fireEvent.click(confirmButton!);

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('error handling', () => {
    const getDialogConfirmButton = () => {
      const buttons = screen.getAllByRole('button');
      return buttons.find(b =>
        b.textContent === 'Delete' && b.className.includes('contained'),
      );
    };

    it('calls onError when action fails', async () => {
      const error = new Error('Failed to delete');
      const onConfirm = vi.fn().mockRejectedValue(error);
      const onError = vi.fn();
      render(
        <ConfirmActionButton
          {...defaultProps}
          onConfirm={onConfirm}
          onError={onError}
        />,
      );

      fireEvent.click(screen.getByText('Delete'));
      const confirmButton = getDialogConfirmButton();
      fireEvent.click(confirmButton!);

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(error);
      });
    });

    it('logs to console.error when no onError provided', async () => {
      const error = new Error('Failed to delete');
      const onConfirm = vi.fn().mockRejectedValue(error);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

      render(<ConfirmActionButton {...defaultProps} onConfirm={onConfirm} />);

      fireEvent.click(screen.getByText('Delete'));
      const confirmButton = getDialogConfirmButton();
      fireEvent.click(confirmButton!);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Action failed:', error);
      });

      consoleSpy.mockRestore();
    });

    it('resets pending state after error', async () => {
      const onConfirm = vi.fn().mockRejectedValue(new Error('Failed'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

      render(
        <ConfirmActionButton
          {...defaultProps}
          onConfirm={onConfirm}
          pendingLabel="Deleting..."
        />,
      );

      fireEvent.click(screen.getByText('Delete'));
      const confirmButton = getDialogConfirmButton();
      fireEvent.click(confirmButton!);

      await waitFor(() => {
        expect(screen.getByText('Delete')).toBeDefined();
        expect(screen.queryByText('Deleting...')).toBeNull();
      });

      consoleSpy.mockRestore();
    });
  });
});
