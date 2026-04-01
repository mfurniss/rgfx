import React from 'react';
import { render, screen, fireEvent } from '@/__tests__/render';
import { describe, it, expect, beforeEach } from 'vitest';
import { DriverFallbackNotification } from '@/renderer/components/system/driver-fallback-notification';
import { useSystemStatusStore } from '@/renderer/store/system-status-store';

const setFallbackActive = (driverFallbackActive: boolean | undefined) => {
  useSystemStatusStore.setState((state) => ({
    systemStatus: { ...state.systemStatus, driverFallbackActive },
  }));
};

describe('DriverFallbackNotification', () => {
  beforeEach(() => {
    setFallbackActive(undefined);
  });

  it('renders nothing when fallback is not active', () => {
    render(<DriverFallbackNotification />);

    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('renders warning alert when fallback is active', () => {
    setFallbackActive(true);
    render(<DriverFallbackNotification />);

    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText(/fallback driver/)).toBeDefined();
  });

  it('dismisses the alert when close button is clicked', () => {
    setFallbackActive(true);
    render(<DriverFallbackNotification />);

    fireEvent.click(screen.getByTitle('Close'));

    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('renders nothing when fallback is explicitly false', () => {
    setFallbackActive(false);
    render(<DriverFallbackNotification />);

    expect(screen.queryByRole('alert')).toBeNull();
  });
});
