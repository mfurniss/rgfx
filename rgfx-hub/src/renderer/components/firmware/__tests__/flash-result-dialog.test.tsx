/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import FlashResultDialog from '../flash-result-dialog';

afterEach(() => {
  cleanup();
});

describe('FlashResultDialog', () => {
  describe('success state', () => {
    it('shows success title and icon', () => {
      render(
        <FlashResultDialog
          open={true}
          success={true}
          message="Firmware flashed successfully!"
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
          onClose={vi.fn()}
        />,
      );

      expect(screen.getByText('Firmware v1.0.0 flashed successfully to 2 drivers!')).toBeDefined();
    });

    it('does not show USB fallback hint on success', () => {
      render(
        <FlashResultDialog
          open={true}
          success={true}
          message="Firmware flashed successfully!"
          onClose={vi.fn()}
        />,
      );

      expect(screen.queryByText(/USB serial/)).toBeNull();
    });
  });

  describe('failure state', () => {
    it('shows failure title and icon', () => {
      render(
        <FlashResultDialog
          open={true}
          success={false}
          message="OTA flash failed"
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
          onClose={vi.fn()}
        />,
      );

      expect(screen.getByText('Connection timed out')).toBeDefined();
    });

    it('shows USB fallback hint on failure', () => {
      render(
        <FlashResultDialog
          open={true}
          success={false}
          message="OTA flash failed"
          onClose={vi.fn()}
        />,
      );

      expect(screen.getByText(/USB serial/)).toBeDefined();
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
          onClose={vi.fn()}
        />,
      );

      expect(screen.queryByText('Flash Complete')).toBeNull();
    });
  });
});
