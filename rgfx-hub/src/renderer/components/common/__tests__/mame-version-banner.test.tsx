import React from 'react';
import { render, screen } from '@/__tests__/render';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach } from 'vitest';
import { useSystemStatusStore } from '@/renderer/store/system-status-store';
import { createMockSystemStatus } from '@/__tests__/factories/system-status.factory';
import { MameVersionBanner } from '../mame-version-banner';

function renderBanner() {
  return render(
    <MemoryRouter>
      <MameVersionBanner />
    </MemoryRouter>,
  );
}

describe('MameVersionBanner', () => {
  beforeEach(() => {
    useSystemStatusStore.setState({
      systemStatus: createMockSystemStatus(),
    });
  });

  it('renders nothing while MAME check is pending', () => {
    useSystemStatusStore.setState({
      systemStatus: createMockSystemStatus({ mameVersionChecked: false, mameVersion: undefined }),
    });

    const { container } = renderBanner();

    expect(container.innerHTML).toBe('');
  });

  it('shows warning when MAME is not detected', () => {
    useSystemStatusStore.setState({
      systemStatus: createMockSystemStatus({ mameVersion: undefined }),
    });

    renderBanner();

    expect(screen.getByText(/0\.250 or above not detected/)).toBeDefined();
  });

  it('shows warning when MAME version is below minimum', () => {
    useSystemStatusStore.setState({
      systemStatus: createMockSystemStatus({ mameVersion: '0.220' }),
    });

    renderBanner();

    expect(screen.getByText(/0\.250 or above not detected/)).toBeDefined();
  });

  it('renders Settings link', () => {
    useSystemStatusStore.setState({
      systemStatus: createMockSystemStatus({ mameVersion: undefined }),
    });

    renderBanner();

    const link = screen.getByText('Settings');
    expect(link).toBeDefined();
    expect(link.closest('a')?.getAttribute('href')).toBe('/settings');
  });

  it('renders nothing when MAME version meets minimum', () => {
    useSystemStatusStore.setState({
      systemStatus: createMockSystemStatus({ mameVersion: '0.250' }),
    });

    const { container } = renderBanner();

    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when MAME version exceeds minimum', () => {
    useSystemStatusStore.setState({
      systemStatus: createMockSystemStatus({ mameVersion: '0.286' }),
    });

    const { container } = renderBanner();

    expect(container.innerHTML).toBe('');
  });
});
