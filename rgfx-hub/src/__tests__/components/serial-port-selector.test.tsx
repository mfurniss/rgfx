import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SerialPortSelector from '@/renderer/components/firmware/serial-port-selector';

describe('SerialPortSelector', () => {
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
      />,
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
      />,
    );

    // MUI Select renders with aria-disabled on the input element
    const select = screen.getByText('Select a port...');
    expect(select.closest('[aria-disabled="true"]')).not.toBeNull();
  });
});
