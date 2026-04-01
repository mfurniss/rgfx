import React from 'react';
import { render, screen } from '@/__tests__/render';
import { describe, it, expect, beforeEach } from 'vitest';
import { OfflineNotification } from '@/renderer/components/system/offline-notification';
import { useSystemStatusStore } from '@/renderer/store/system-status-store';

const setHubIp = (hubIp: string) => {
  useSystemStatusStore.setState((state) => ({
    systemStatus: { ...state.systemStatus, hubIp },
  }));
};

describe('OfflineNotification', () => {
  beforeEach(() => {
    setHubIp('192.168.1.1');
  });

  it('renders nothing when hub is online', () => {
    render(<OfflineNotification />);

    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('renders error alert when hub IP is Unknown', () => {
    setHubIp('Unknown');
    render(<OfflineNotification />);

    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText(/Network unavailable/)).toBeDefined();
  });
});
