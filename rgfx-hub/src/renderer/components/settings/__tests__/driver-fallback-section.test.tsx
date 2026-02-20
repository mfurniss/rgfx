import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DriverFallbackSection } from '../driver-fallback-section';

const mockSetDriverFallbackEnabled = vi.fn();
let mockDriverFallbackEnabled = false;

vi.mock('../../../store/ui-store', () => ({
  useUiStore: vi.fn((selector) =>
    selector({
      driverFallbackEnabled: mockDriverFallbackEnabled,
      setDriverFallbackEnabled: mockSetDriverFallbackEnabled,
    }),
  ),
}));

const mockSetDriverFallbackEnabledIpc = vi.fn().mockResolvedValue({
  success: true,
});

(window as unknown as { rgfx: Record<string, unknown> }).rgfx = {
  setDriverFallbackEnabled: mockSetDriverFallbackEnabledIpc,
};

afterEach(() => {
  cleanup();
});

describe('DriverFallbackSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDriverFallbackEnabled = false;
  });

  describe('rendering', () => {
    it('renders section title', () => {
      render(<DriverFallbackSection />);
      expect(screen.getByText('Driver Fallback')).toBeDefined();
    });

    it('renders subtitle', () => {
      render(<DriverFallbackSection />);
      expect(
        screen.getByText(
          'Route effects to first available driver when targets are undefined or offline',
        ),
      ).toBeDefined();
    });

    it('renders switch with label', () => {
      render(<DriverFallbackSection />);
      expect(screen.getByRole('switch')).toBeDefined();
      expect(screen.getByText('Enable driver fallback')).toBeDefined();
    });

    it('renders helper text', () => {
      render(<DriverFallbackSection />);
      expect(
        screen.getByText(/effects targeting offline or non-existent drivers/),
      ).toBeDefined();
    });

    it('renders switch as unchecked when disabled', () => {
      mockDriverFallbackEnabled = false;
      render(<DriverFallbackSection />);
      const checkbox = screen.getByRole('switch');
      expect(checkbox).toHaveProperty('checked', false);
    });

    it('renders switch as checked when enabled', () => {
      mockDriverFallbackEnabled = true;
      render(<DriverFallbackSection />);
      const checkbox = screen.getByRole('switch');
      expect(checkbox).toHaveProperty('checked', true);
    });
  });

  describe('toggle interaction', () => {
    it('calls setDriverFallbackEnabled when toggled on', () => {
      mockDriverFallbackEnabled = false;
      render(<DriverFallbackSection />);
      const checkbox = screen.getByRole('switch');

      fireEvent.click(checkbox);

      expect(mockSetDriverFallbackEnabled).toHaveBeenCalledWith(true);
    });

    it('calls IPC to sync setting to main process', () => {
      mockDriverFallbackEnabled = false;
      render(<DriverFallbackSection />);
      const checkbox = screen.getByRole('switch');

      fireEvent.click(checkbox);

      expect(mockSetDriverFallbackEnabledIpc)
        .toHaveBeenCalledWith(true);
    });

    it('calls setDriverFallbackEnabled when toggled off', () => {
      mockDriverFallbackEnabled = true;
      render(<DriverFallbackSection />);
      const checkbox = screen.getByRole('switch');

      fireEvent.click(checkbox);

      expect(mockSetDriverFallbackEnabled).toHaveBeenCalledWith(false);
    });
  });
});
