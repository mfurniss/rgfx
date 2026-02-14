import React from 'react';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BackupSection } from '../backup-section';

const mockNotify = vi.fn();

vi.mock('../../../store/notification-store', () => ({
  notify: (...args: unknown[]) => mockNotify(...args),
}));

afterEach(() => {
  cleanup();
});

describe('BackupSection', () => {
  let mockCreateBackup: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateBackup = vi.fn();

    (window as unknown as { rgfx: Record<string, unknown> }).rgfx = {
      createBackup: mockCreateBackup,
    };
  });

  describe('rendering', () => {
    it('renders section title', () => {
      render(<BackupSection />);

      expect(screen.getByText('Backup')).toBeDefined();
    });

    it('renders subtitle', () => {
      render(<BackupSection />);

      expect(screen.getByText('Save a copy of your RGFX configuration directory')).toBeDefined();
    });

    it('renders description text', () => {
      render(<BackupSection />);

      expect(screen.getByText(/Creates a zip archive/)).toBeDefined();
    });

    it('renders Create Backup button', () => {
      render(<BackupSection />);

      expect(screen.getByRole('button', { name: /create backup/i })).toBeDefined();
    });
  });

  describe('backup action', () => {
    it('calls createBackup when button is clicked', async () => {
      mockCreateBackup.mockResolvedValue({ success: true });
      render(<BackupSection />);

      fireEvent.click(screen.getByRole('button', { name: /create backup/i }));

      await waitFor(() => {
        expect(mockCreateBackup).toHaveBeenCalledTimes(1);
      });
    });

    it('shows success notification on successful backup', async () => {
      mockCreateBackup.mockResolvedValue({ success: true });
      render(<BackupSection />);

      fireEvent.click(screen.getByRole('button', { name: /create backup/i }));

      await waitFor(() => {
        expect(mockNotify).toHaveBeenCalledWith('Backup saved successfully', 'success');
      });
    });

    it('shows error notification when backup fails with error', async () => {
      mockCreateBackup.mockResolvedValue({ success: false, error: 'disk full' });
      render(<BackupSection />);

      fireEvent.click(screen.getByRole('button', { name: /create backup/i }));

      await waitFor(() => {
        expect(mockNotify).toHaveBeenCalledWith('Backup failed: disk full', 'error');
      });
    });

    it('shows no notification when user cancels dialog', async () => {
      mockCreateBackup.mockResolvedValue({ success: false });
      render(<BackupSection />);

      fireEvent.click(screen.getByRole('button', { name: /create backup/i }));

      await waitFor(() => {
        expect(mockCreateBackup).toHaveBeenCalled();
      });

      expect(mockNotify).not.toHaveBeenCalled();
    });

    it('shows error notification when IPC call throws', async () => {
      mockCreateBackup.mockRejectedValue(new Error('IPC failed'));
      render(<BackupSection />);

      fireEvent.click(screen.getByRole('button', { name: /create backup/i }));

      await waitFor(() => {
        expect(mockNotify).toHaveBeenCalledWith('Backup failed: IPC failed', 'error');
      });
    });

    it('disables button while backup is in progress', async () => {
      let resolveBackup!: (value: { success: boolean }) => void;
      mockCreateBackup.mockReturnValue(
        new Promise((resolve) => {
          resolveBackup = resolve;
        }),
      );

      render(<BackupSection />);

      fireEvent.click(screen.getByRole('button', { name: /create backup/i }));

      await waitFor(() => {
        const button = screen.getByRole('button', { name: /create backup/i });

        expect(button).toHaveProperty('disabled', true);
      });

      resolveBackup({ success: true });

      await waitFor(() => {
        const button = screen.getByRole('button', { name: /create backup/i });

        expect(button).toHaveProperty('disabled', false);
      });
    });
  });
});
