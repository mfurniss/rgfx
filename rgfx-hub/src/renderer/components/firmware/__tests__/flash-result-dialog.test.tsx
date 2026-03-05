import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FlashResultDialog from '../flash-result-dialog';

describe('FlashResultDialog', () => {
  describe('success state', () => {
    it('shows success title and icon', () => {
      render(
        <FlashResultDialog
          open={true}
          success={true}
          message="Firmware flashed successfully!"
          flashMethod="usb"
          onClose={vi.fn()}
        />,
      );

      expect(screen.getByText('Flash Complete')).toBeDefined();
    });

    it('shows the success message', () => {
      render(
        <FlashResultDialog
          open={true}
          success={true}
          message="Firmware v1.0.0 flashed successfully to 2 drivers!"
          flashMethod="ota"
          onClose={vi.fn()}
        />,
      );

      expect(screen.getByText('Firmware v1.0.0 flashed successfully to 2 drivers!')).toBeDefined();
    });

    it('does not show help hint on success', () => {
      render(
        <FlashResultDialog
          open={true}
          success={true}
          message="Firmware flashed successfully!"
          flashMethod="usb"
          onClose={vi.fn()}
        />,
      );

      expect(screen.queryByText(/USB serial/)).toBeNull();
      expect(screen.queryByText(/serial port/)).toBeNull();
    });
  });

  describe('failure state', () => {
    it('shows failure title and icon', () => {
      render(
        <FlashResultDialog
          open={true}
          success={false}
          message="OTA flash failed"
          flashMethod="ota"
          onClose={vi.fn()}
        />,
      );

      expect(screen.getByText('Flash Failed')).toBeDefined();
    });

    it('shows the error message', () => {
      render(
        <FlashResultDialog
          open={true}
          success={false}
          message="Connection timed out"
          flashMethod="ota"
          onClose={vi.fn()}
        />,
      );

      expect(screen.getByText('Connection timed out')).toBeDefined();
    });

    it('shows USB fallback hint on OTA failure', () => {
      render(
        <FlashResultDialog
          open={true}
          success={false}
          message="OTA flash failed"
          flashMethod="ota"
          onClose={vi.fn()}
        />,
      );

      expect(screen.getByText(/USB serial/)).toBeDefined();
    });

    it('shows serial port hint on USB failure', () => {
      render(
        <FlashResultDialog
          open={true}
          success={false}
          message="Connection failed"
          flashMethod="usb"
          onClose={vi.fn()}
        />,
      );

      expect(
        screen.getByText('Check that no other application is using the serial port and the device is connected.'),
      ).toBeDefined();
      expect(screen.queryByText(/OTA/)).toBeNull();
    });
  });

  describe('interactions', () => {
    it('calls onClose when OK button is clicked', () => {
      const onClose = vi.fn();
      render(
        <FlashResultDialog
          open={true}
          success={true}
          message="Success"
          flashMethod="usb"
          onClose={onClose}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: 'OK' }));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not render when closed', () => {
      render(
        <FlashResultDialog
          open={false}
          success={true}
          message="Success"
          flashMethod="usb"
          onClose={vi.fn()}
        />,
      );

      expect(screen.queryByText('Flash Complete')).toBeNull();
    });
  });
});
