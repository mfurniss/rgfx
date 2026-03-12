import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReinstallAssetsSection } from '../reinstall-assets-section';

const mockNotify = vi.fn();

vi.mock('../../../store/notification-store', () => ({
  notify: (...args: unknown[]) => mockNotify(...args),
}));

describe('ReinstallAssetsSection', () => {
  let mockReinstallAssets: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReinstallAssets = vi.fn();

    (window as unknown as { rgfx: Record<string, unknown> }).rgfx = {
      reinstallAssets: mockReinstallAssets,
    };
  });

  describe('rendering', () => {
    it('renders section title', () => {
      render(<ReinstallAssetsSection />);

      expect(screen.getByText('Default Assets')).toBeDefined();
    });

    it('renders description text', () => {
      render(<ReinstallAssetsSection />);

      expect(screen.getByText(/Overwrites interceptors/)).toBeDefined();
    });

    it('renders Reinstall Default Assets button', () => {
      render(<ReinstallAssetsSection />);

      expect(screen.getByRole('button', { name: /reinstall default assets/i })).toBeDefined();
    });
  });

  describe('confirmation dialog', () => {
    it('shows confirmation dialog when button is clicked', () => {
      render(<ReinstallAssetsSection />);

      fireEvent.click(screen.getByRole('button', { name: /reinstall default assets/i }));

      expect(screen.getByText(/will overwrite your customized/)).toBeDefined();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /^reinstall$/i })).toBeDefined();
    });

    it('closes dialog when Cancel is clicked', async () => {
      render(<ReinstallAssetsSection />);

      fireEvent.click(screen.getByRole('button', { name: /reinstall default assets/i }));
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

      await waitFor(() => {
        expect(screen.queryByText(/will overwrite your customized/)).toBeNull();
      });
    });

    it('does not call reinstallAssets when Cancel is clicked', () => {
      render(<ReinstallAssetsSection />);

      fireEvent.click(screen.getByRole('button', { name: /reinstall default assets/i }));
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockReinstallAssets).not.toHaveBeenCalled();
    });
  });

  describe('reinstall action', () => {
    it('calls reinstallAssets when confirmed', async () => {
      mockReinstallAssets.mockResolvedValue({ success: true });
      render(<ReinstallAssetsSection />);

      fireEvent.click(screen.getByRole('button', { name: /reinstall default assets/i }));
      fireEvent.click(screen.getByRole('button', { name: /^reinstall$/i }));

      await waitFor(() => {
        expect(mockReinstallAssets).toHaveBeenCalledTimes(1);
      });
    });

    it('shows success notification on successful reinstall', async () => {
      mockReinstallAssets.mockResolvedValue({ success: true });
      render(<ReinstallAssetsSection />);

      fireEvent.click(screen.getByRole('button', { name: /reinstall default assets/i }));
      fireEvent.click(screen.getByRole('button', { name: /^reinstall$/i }));

      await waitFor(() => {
        expect(mockNotify).toHaveBeenCalledWith(
          'Default assets reinstalled successfully',
          'success',
        );
      });
    });

    it('shows error notification when reinstall fails with error', async () => {
      mockReinstallAssets.mockResolvedValue({ success: false, error: 'Permission denied' });
      render(<ReinstallAssetsSection />);

      fireEvent.click(screen.getByRole('button', { name: /reinstall default assets/i }));
      fireEvent.click(screen.getByRole('button', { name: /^reinstall$/i }));

      await waitFor(() => {
        expect(mockNotify).toHaveBeenCalledWith('Reinstall failed: Permission denied', 'error');
      });
    });

    it('shows error notification when IPC call throws', async () => {
      mockReinstallAssets.mockRejectedValue(new Error('IPC failed'));
      render(<ReinstallAssetsSection />);

      fireEvent.click(screen.getByRole('button', { name: /reinstall default assets/i }));
      fireEvent.click(screen.getByRole('button', { name: /^reinstall$/i }));

      await waitFor(() => {
        expect(mockNotify).toHaveBeenCalledWith('Reinstall failed: IPC failed', 'error');
      });
    });

    it('disables button while reinstall is in progress', async () => {
      let resolveReinstall!: (value: { success: boolean }) => void;
      mockReinstallAssets.mockReturnValue(
        new Promise((resolve) => {
          resolveReinstall = resolve;
        }),
      );

      render(<ReinstallAssetsSection />);

      fireEvent.click(screen.getByRole('button', { name: /reinstall default assets/i }));
      fireEvent.click(screen.getByRole('button', { name: /^reinstall$/i }));

      await waitFor(() => {
        const button = screen.getByRole('button', { name: /reinstall default assets/i });

        expect(button).toHaveProperty('disabled', true);
      });

      resolveReinstall({ success: true });

      await waitFor(() => {
        const button = screen.getByRole('button', { name: /reinstall default assets/i });

        expect(button).toHaveProperty('disabled', false);
      });
    });
  });
});
