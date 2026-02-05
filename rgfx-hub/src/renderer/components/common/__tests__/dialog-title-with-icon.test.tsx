/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { Dialog, IconButton } from '@mui/material';
import { Warning as WarningIcon, Error as ErrorIcon, Close as CloseIcon } from '@mui/icons-material';
import { DialogTitleWithIcon } from '../dialog-title-with-icon';

const renderWithDialog = (ui: React.ReactElement) => {
  return render(<Dialog open={true}>{ui}</Dialog>);
};

describe('DialogTitleWithIcon', () => {
  afterEach(() => {
    cleanup();
  });

  describe('basic rendering', () => {
    it('renders the title text', () => {
      renderWithDialog(
        <DialogTitleWithIcon icon={<WarningIcon />} title="Test Title" />,
      );

      expect(screen.getByText('Test Title')).toBeDefined();
    });

    it('renders the icon', () => {
      renderWithDialog(
        <DialogTitleWithIcon icon={<WarningIcon data-testid="warning-icon" />} title="With Icon" />,
      );

      const icon = screen.getByTestId('warning-icon');
      expect(icon).toBeDefined();
    });

    it('renders different icons', () => {
      renderWithDialog(
        <DialogTitleWithIcon icon={<ErrorIcon data-testid="error-icon" />} title="Error Title" />,
      );

      const icon = screen.getByTestId('error-icon');
      expect(icon).toBeDefined();
    });
  });

  describe('iconColor prop', () => {
    it('renders with iconColor warning', () => {
      renderWithDialog(
        <DialogTitleWithIcon
          icon={<WarningIcon data-testid="warning-icon" />}
          title="Warning"
          iconColor="warning"
        />,
      );

      // The icon should be rendered
      const icon = screen.getByTestId('warning-icon');
      expect(icon).toBeDefined();
      expect(screen.getByText('Warning')).toBeDefined();
    });

    it('renders with iconColor error', () => {
      renderWithDialog(
        <DialogTitleWithIcon
          icon={<ErrorIcon data-testid="error-icon" />}
          title="Error"
          iconColor="error"
        />,
      );

      const icon = screen.getByTestId('error-icon');
      expect(icon).toBeDefined();
      expect(screen.getByText('Error')).toBeDefined();
    });

    it('renders without iconColor', () => {
      renderWithDialog(
        <DialogTitleWithIcon
          icon={<WarningIcon data-testid="plain-icon" />}
          title="Plain"
        />,
      );

      const icon = screen.getByTestId('plain-icon');
      expect(icon).toBeDefined();
      expect(screen.getByText('Plain')).toBeDefined();
    });
  });

  describe('titleColor prop', () => {
    it('renders with titleColor prop', () => {
      renderWithDialog(
        <DialogTitleWithIcon
          icon={<WarningIcon />}
          title="Colored Title"
          titleColor="success.main"
        />,
      );

      expect(screen.getByText('Colored Title')).toBeDefined();
    });

    it('renders without titleColor', () => {
      renderWithDialog(
        <DialogTitleWithIcon
          icon={<WarningIcon />}
          title="Default Title"
        />,
      );

      expect(screen.getByText('Default Title')).toBeDefined();
    });
  });

  describe('action slot', () => {
    it('renders action element when provided', () => {
      renderWithDialog(
        <DialogTitleWithIcon
          icon={<WarningIcon />}
          title="With Action"
          action={
            <IconButton data-testid="close-button">
              <CloseIcon />
            </IconButton>
          }
        />,
      );

      const closeButton = screen.getByTestId('close-button');
      expect(closeButton).toBeDefined();
    });

    it('renders both title and action', () => {
      renderWithDialog(
        <DialogTitleWithIcon
          icon={<WarningIcon />}
          title="Title With Action"
          action={<IconButton data-testid="action-btn"><CloseIcon /></IconButton>}
        />,
      );

      expect(screen.getByText('Title With Action')).toBeDefined();
      expect(screen.getByTestId('action-btn')).toBeDefined();
    });

    it('does not render action when not provided', () => {
      renderWithDialog(
        <DialogTitleWithIcon
          icon={<WarningIcon />}
          title="No Action"
        />,
      );

      expect(screen.getByText('No Action')).toBeDefined();
      expect(screen.queryByTestId('close-button')).toBeNull();
    });
  });

  describe('integration scenarios', () => {
    it('renders confirmation dialog title pattern', () => {
      renderWithDialog(
        <DialogTitleWithIcon
          icon={<WarningIcon />}
          title="Confirm Reset"
          iconColor="warning"
        />,
      );

      expect(screen.getByText('Confirm Reset')).toBeDefined();
    });

    it('renders error dialog title pattern', () => {
      renderWithDialog(
        <DialogTitleWithIcon
          icon={<ErrorIcon />}
          title="Configuration Error"
          iconColor="error"
        />,
      );

      expect(screen.getByText('Configuration Error')).toBeDefined();
    });

    it('renders flash result dialog pattern with titleColor', () => {
      renderWithDialog(
        <DialogTitleWithIcon
          icon={<WarningIcon />}
          title="Flash Complete"
          titleColor="success.main"
        />,
      );

      expect(screen.getByText('Flash Complete')).toBeDefined();
    });

    it('renders preset selector dialog pattern with action', () => {
      renderWithDialog(
        <DialogTitleWithIcon
          icon={<WarningIcon />}
          title="Select Preset"
          action={
            <IconButton data-testid="preset-close">
              <CloseIcon />
            </IconButton>
          }
        />,
      );

      expect(screen.getByText('Select Preset')).toBeDefined();
      expect(screen.getByTestId('preset-close')).toBeDefined();
    });
  });
});
