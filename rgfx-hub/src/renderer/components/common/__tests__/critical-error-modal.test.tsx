/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CriticalErrorModal } from '../critical-error-modal';
import type { SystemError } from '@/types';

// Mock window.rgfx
const mockShowInFolder = vi.fn().mockResolvedValue(undefined);
const mockQuitApp = vi.fn();

interface MockRgfx {
  showInFolder: typeof mockShowInFolder;
  quitApp: typeof mockQuitApp;
}

beforeEach(() => {
  vi.clearAllMocks();
  // Use 'as unknown as' to bypass strict type checking for partial mock
  (window as unknown as { rgfx: MockRgfx }).rgfx = {
    showInFolder: mockShowInFolder,
    quitApp: mockQuitApp,
  };
});

describe('CriticalErrorModal', () => {
  const baseError: SystemError = {
    errorType: 'config',
    message: 'Failed to parse configuration file',
    timestamp: Date.now(),
  };

  const errorWithPath: SystemError = {
    ...baseError,
    filePath: '/home/user/.rgfx/drivers.json',
  };

  const errorWithDetails: SystemError = {
    ...errorWithPath,
    details: 'Unrecognized key: "foo" at "ledConfig"',
  };

  describe('rendering', () => {
    it('should render the error message', () => {
      render(<CriticalErrorModal error={baseError} />);
      expect(screen.getByText(baseError.message)).toBeDefined();
    });

    it('should render Configuration Error title', () => {
      render(<CriticalErrorModal error={baseError} />);
      expect(screen.getByText('Configuration Error')).toBeDefined();
    });

    it('should render the file path when provided', () => {
      render(<CriticalErrorModal error={errorWithPath} />);
      expect(screen.getByText(errorWithPath.filePath!)).toBeDefined();
    });

    it('should not render file path section when not provided', () => {
      render(<CriticalErrorModal error={baseError} />);
      expect(screen.queryByText('/home/user')).toBeNull();
    });

    it('should render error details when provided', () => {
      render(<CriticalErrorModal error={errorWithDetails} />);
      expect(screen.getByText(errorWithDetails.details!)).toBeDefined();
    });

    it('should not render details section when not provided', () => {
      render(<CriticalErrorModal error={baseError} />);
      expect(screen.queryByText('Details:')).toBeNull();
    });

    it('should render warning about manual fix required', () => {
      render(<CriticalErrorModal error={baseError} />);
      // Use queryAllByText since MUI Alert may create multiple text nodes
      const matches = screen.queryAllByText(/cannot continue/i);
      expect(matches.length).toBeGreaterThan(0);
    });

    it('should render Quit Application button', () => {
      render(<CriticalErrorModal error={baseError} />);
      expect(screen.getByRole('button', { name: /quit application/i })).toBeDefined();
    });

    it('should render Show File Location button when file path provided', () => {
      render(<CriticalErrorModal error={errorWithPath} />);
      expect(screen.getByRole('button', { name: /show file location/i })).toBeDefined();
    });

    it('should not render Show File Location button when no file path', () => {
      render(<CriticalErrorModal error={baseError} />);
      expect(screen.queryByRole('button', { name: /show file location/i })).toBeNull();
    });
  });

  describe('interactions', () => {
    it('should call quitApp when Quit Application button is clicked', () => {
      render(<CriticalErrorModal error={baseError} />);
      fireEvent.click(screen.getByRole('button', { name: /quit application/i }));
      expect(mockQuitApp).toHaveBeenCalledTimes(1);
    });

    it('should call showInFolder when Show File Location button is clicked', () => {
      render(<CriticalErrorModal error={errorWithPath} />);
      fireEvent.click(screen.getByRole('button', { name: /show file location/i }));
      expect(mockShowInFolder).toHaveBeenCalledWith(errorWithPath.filePath);
    });

    it('should call showInFolder when folder icon button is clicked', () => {
      render(<CriticalErrorModal error={errorWithPath} />);
      // Find by tooltip title
      const folderButton = screen.getByRole('button', { name: /show in folder/i });
      fireEvent.click(folderButton);
      expect(mockShowInFolder).toHaveBeenCalledWith(errorWithPath.filePath);
    });

    it('should copy path to clipboard when copy button is clicked', () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: { writeText: writeTextMock },
      });

      render(<CriticalErrorModal error={errorWithPath} />);
      const copyButton = screen.getByRole('button', { name: /copy path/i });
      fireEvent.click(copyButton);

      expect(writeTextMock).toHaveBeenCalledWith(errorWithPath.filePath);
    });
  });

  describe('modal behavior', () => {
    it('should be always open', () => {
      render(<CriticalErrorModal error={baseError} />);
      // Dialog should be visible
      expect(screen.getByRole('dialog')).toBeDefined();
    });
  });
});
