/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import React from 'react';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ResetDriverButton from '../reset-driver-button';
import { createMockDriver } from '@/__tests__/factories';

const mockSendDriverCommand = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  (window as unknown as { rgfx: { sendDriverCommand: typeof mockSendDriverCommand } }).rgfx = {
    sendDriverCommand: mockSendDriverCommand,
  };
});

afterEach(() => {
  cleanup();
});

describe('ResetDriverButton', () => {
  describe('button state', () => {
    it('renders Reset button', () => {
      const driver = createMockDriver({ state: 'connected' });
      render(<ResetDriverButton driver={driver} />);

      expect(screen.getByText('Reset')).toBeDefined();
    });

    it('is enabled when driver is connected', () => {
      const driver = createMockDriver({ state: 'connected' });
      render(<ResetDriverButton driver={driver} />);

      const button = screen.getByRole('button');
      expect(button).toHaveProperty('disabled', false);
    });

    it('is disabled when driver is disconnected', () => {
      const driver = createMockDriver({ state: 'disconnected' });
      render(<ResetDriverButton driver={driver} />);

      const button = screen.getByRole('button');
      expect(button).toHaveProperty('disabled', true);
    });

    it('is disabled when driver is updating', () => {
      const driver = createMockDriver({ state: 'updating' });
      render(<ResetDriverButton driver={driver} />);

      const button = screen.getByRole('button');
      expect(button).toHaveProperty('disabled', true);
    });

    it('renders with error color', () => {
      const driver = createMockDriver({ state: 'connected' });
      render(<ResetDriverButton driver={driver} />);

      const button = screen.getByText('Reset').closest('button');
      expect(button?.className).toContain('Error');
    });
  });

  describe('dialog content', () => {
    it('shows dialog with driver ID when clicked', () => {
      const driver = createMockDriver({ id: 'test-driver-001', state: 'connected' });
      render(<ResetDriverButton driver={driver} />);

      fireEvent.click(screen.getByText('Reset'));

      expect(screen.getByText('Confirm Reset')).toBeDefined();
      expect(screen.getByText(/test-driver-001/)).toBeDefined();
    });

    it('lists items that will be erased', () => {
      const driver = createMockDriver({ state: 'connected' });
      render(<ResetDriverButton driver={driver} />);

      fireEvent.click(screen.getByText('Reset'));

      expect(screen.getByText('Driver ID')).toBeDefined();
      expect(screen.getByText('LED hardware configuration')).toBeDefined();
      expect(screen.getByText('WiFi credentials')).toBeDefined();
    });

    it('shows warning about immediate reboot', () => {
      const driver = createMockDriver({ state: 'connected' });
      render(<ResetDriverButton driver={driver} />);

      fireEvent.click(screen.getByText('Reset'));

      expect(screen.getByText(/reboot immediately/)).toBeDefined();
    });
  });

  describe('reset action', () => {
    const getDialogConfirmButton = () => {
      const buttons = screen.getAllByRole('button');
      return buttons.find(b =>
        b.textContent === 'Reset' && b.className.includes('contained'),
      );
    };

    it('calls sendDriverCommand with driver ID and reset command', async () => {
      mockSendDriverCommand.mockResolvedValue(undefined);
      const driver = createMockDriver({ id: 'driver-to-reset', state: 'connected' });
      render(<ResetDriverButton driver={driver} />);

      fireEvent.click(screen.getByText('Reset'));
      const confirmButton = getDialogConfirmButton();
      fireEvent.click(confirmButton!);

      await waitFor(() => {
        expect(mockSendDriverCommand).toHaveBeenCalledWith('driver-to-reset', 'reset');
      });
    });

    it('handles API errors gracefully', async () => {
      mockSendDriverCommand.mockRejectedValue(new Error('Command failed'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const driver = createMockDriver({ state: 'connected' });
      render(<ResetDriverButton driver={driver} />);

      fireEvent.click(screen.getByText('Reset'));
      const confirmButton = getDialogConfirmButton();
      fireEvent.click(confirmButton!);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Action failed:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('dialog cancellation', () => {
    it('closes dialog without action when Cancel is clicked', async () => {
      const driver = createMockDriver({ state: 'connected' });
      render(<ResetDriverButton driver={driver} />);

      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByText('Confirm Reset')).toBeDefined();

      fireEvent.click(screen.getByText('Cancel'));

      await waitFor(() => {
        expect(screen.queryByText('Confirm Reset')).toBeNull();
      });

      expect(mockSendDriverCommand).not.toHaveBeenCalled();
    });
  });

  describe('pending state', () => {
    it('shows Resetting... label during execution', async () => {
      let resolveCommand: () => void;
      mockSendDriverCommand.mockImplementation(
        () => new Promise<void>((resolve) => {
          resolveCommand = resolve;
        }),
      );
      const driver = createMockDriver({ state: 'connected' });
      render(<ResetDriverButton driver={driver} />);

      fireEvent.click(screen.getByText('Reset'));
      const buttons = screen.getAllByRole('button');
      const confirmButton = buttons.find(b =>
        b.textContent === 'Reset' && b.className.includes('contained'),
      );
      fireEvent.click(confirmButton!);

      await waitFor(() => {
        expect(screen.getByText('Resetting...')).toBeDefined();
      });

      resolveCommand!();

      await waitFor(() => {
        expect(screen.getByText('Reset')).toBeDefined();
      });
    });
  });
});
