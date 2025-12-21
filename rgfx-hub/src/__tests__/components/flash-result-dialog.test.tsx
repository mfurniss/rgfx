import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import FlashResultDialog from '@/renderer/components/firmware/flash-result-dialog';

describe('FlashResultDialog', () => {
  afterEach(() => {
    cleanup();
  });
  it('renders success state correctly', () => {
    const onClose = vi.fn();
    render(
      <FlashResultDialog
        open={true}
        success={true}
        message="Firmware flashed successfully!"
        onClose={onClose}
      />,
    );

    expect(screen.getByText('Flash Complete')).toBeDefined();
    expect(screen.getByText('Firmware flashed successfully!')).toBeDefined();
  });

  it('renders failure state correctly', () => {
    const onClose = vi.fn();
    render(
      <FlashResultDialog
        open={true}
        success={false}
        message="Connection failed"
        onClose={onClose}
      />,
    );

    expect(screen.getByText('Flash Failed')).toBeDefined();
    expect(screen.getByText('Connection failed')).toBeDefined();
  });

  it('calls onClose when OK button clicked', () => {
    const onClose = vi.fn();
    render(
      <FlashResultDialog
        open={true}
        success={true}
        message="Done"
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not render when closed', () => {
    const onClose = vi.fn();
    render(
      <FlashResultDialog
        open={false}
        success={true}
        message="Should not appear"
        onClose={onClose}
      />,
    );

    expect(screen.queryByText('Flash Complete')).toBeNull();
  });
});
