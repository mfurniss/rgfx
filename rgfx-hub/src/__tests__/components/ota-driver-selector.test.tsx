import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import OtaDriverSelector from '../../renderer/components/ota-driver-selector';
import { Driver } from '../../types';

const createMockDriver = (id: string, connected: boolean, ip?: string): Driver => ({
  id,
  connected,
  lastSeen: Date.now(),
  firstSeen: Date.now(),
  failedHeartbeats: 0,
  ip: connected ? ip : undefined,
  sysInfo: connected && ip
    ? {
        ip,
        mac: '00:00:00:00:00:00',
        hostname: id,
        rssi: -50,
        ssid: 'TestNetwork',
        chipModel: 'ESP32',
        chipRevision: 1,
        chipCores: 2,
        cpuFreqMHz: 240,
        flashSize: 4194304,
        flashSpeed: 40000000,
        heapSize: 327680,
        freeHeap: 100000,
        minFreeHeap: 90000,
        psramSize: 0,
        freePsram: 0,
        sketchSize: 1000000,
        freeSketchSpace: 3000000,
        firmwareVersion: '1.0.0',
        sdkVersion: '4.4.0',
        uptimeMs: 1000,
        hasDisplay: false,
      }
    : undefined,
  stats: { mqttMessagesReceived: 0, mqttMessagesFailed: 0, udpMessagesSent: 0, udpMessagesFailed: 0 },
});

describe('OtaDriverSelector', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the select dropdown', () => {
    const onDriverSelect = vi.fn();
    const drivers = [createMockDriver('rgfx-driver-0001', true, '192.168.1.1')];

    render(
      <OtaDriverSelector
        drivers={drivers}
        selectedDriver=""
        onDriverSelect={onDriverSelect}
        disabled={false}
      />
    );

    expect(screen.getByRole('combobox')).toBeDefined();
    expect(screen.getAllByText('Select Driver').length).toBeGreaterThan(0);
  });

  it('shows warning when no drivers available', () => {
    const onDriverSelect = vi.fn();

    render(
      <OtaDriverSelector
        drivers={[]}
        selectedDriver=""
        onDriverSelect={onDriverSelect}
        disabled={false}
      />
    );

    expect(screen.getByText(/No drivers connected/)).toBeDefined();
  });

  it('does not show warning when drivers are available', () => {
    const onDriverSelect = vi.fn();
    const drivers = [createMockDriver('rgfx-driver-0001', true, '192.168.1.1')];

    render(
      <OtaDriverSelector
        drivers={drivers}
        selectedDriver=""
        onDriverSelect={onDriverSelect}
        disabled={false}
      />
    );

    expect(screen.queryByText(/No drivers connected/)).toBeNull();
  });

  it('calls onDriverSelect when driver is selected', () => {
    const onDriverSelect = vi.fn();
    const drivers = [createMockDriver('rgfx-driver-0001', true, '192.168.1.1')];

    render(
      <OtaDriverSelector
        drivers={drivers}
        selectedDriver=""
        onDriverSelect={onDriverSelect}
        disabled={false}
      />
    );

    const select = screen.getByRole('combobox');
    fireEvent.mouseDown(select);

    const option = screen.getByText('rgfx-driver-0001 (192.168.1.1)');
    fireEvent.click(option);

    expect(onDriverSelect).toHaveBeenCalledWith('rgfx-driver-0001');
  });

  it('disables the select when disabled prop is true', () => {
    const onDriverSelect = vi.fn();
    const drivers = [createMockDriver('rgfx-driver-0001', true, '192.168.1.1')];

    render(
      <OtaDriverSelector
        drivers={drivers}
        selectedDriver=""
        onDriverSelect={onDriverSelect}
        disabled={true}
      />
    );

    const select = screen.getByRole('combobox');
    expect(select.getAttribute('aria-disabled')).toBe('true');
  });
});
