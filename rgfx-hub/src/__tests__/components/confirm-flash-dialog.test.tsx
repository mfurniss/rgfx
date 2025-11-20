import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import ConfirmFlashDialog from '../../renderer/components/confirm-flash-dialog';

describe('ConfirmFlashDialog', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders warning content when open', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmFlashDialog
        open={true}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    expect(screen.getByText('Confirm Firmware Flash')).toBeDefined();
    expect(screen.getByText(/cannot be interrupted/)).toBeDefined();
    expect(screen.getByText(/Do not disconnect/)).toBeDefined();
  });

  it('calls onConfirm when Start Flashing clicked', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmFlashDialog
        open={true}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    fireEvent.click(screen.getByText('Start Flashing'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when Cancel clicked', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmFlashDialog
        open={true}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('does not render when closed', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmFlashDialog
        open={false}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    expect(screen.queryByText('Confirm Firmware Flash')).toBeNull();
  });
});
