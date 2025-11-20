import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import SerialPortSelector from '../../renderer/components/serial-port-selector';

describe('SerialPortSelector', () => {
  afterEach(() => {
    cleanup();
  });
  it('renders the select dropdown', () => {
    const onPortSelect = vi.fn();
    const onLog = vi.fn();
    const onError = vi.fn();

    render(
      <SerialPortSelector
        disabled={false}
        onPortSelect={onPortSelect}
        onLog={onLog}
        onError={onError}
      />
    );

    expect(screen.getByText('Select a port...')).toBeDefined();
  });

  it('disables the select when disabled prop is true', () => {
    const onPortSelect = vi.fn();
    const onLog = vi.fn();
    const onError = vi.fn();

    render(
      <SerialPortSelector
        disabled={true}
        onPortSelect={onPortSelect}
        onLog={onLog}
        onError={onError}
      />
    );

    const select = screen.getByRole('combobox');
    expect(select.getAttribute('aria-disabled')).toBe('true');
  });
});
