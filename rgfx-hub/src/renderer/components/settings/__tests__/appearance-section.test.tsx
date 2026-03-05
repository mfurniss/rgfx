import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppearanceSection } from '../appearance-section';

const mockSetMode = vi.fn();
let mockMode: 'system' | 'light' | 'dark' = 'system';

vi.mock('@mui/material/styles', () => ({
  useColorScheme: () => ({
    mode: mockMode,
    setMode: mockSetMode,
  }),
}));

describe('AppearanceSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMode = 'system';
  });

  describe('rendering', () => {
    it('renders section title', () => {
      render(<AppearanceSection />);
      expect(screen.getByText('Appearance')).toBeDefined();
    });

    it('renders description text', () => {
      render(<AppearanceSection />);
      expect(screen.getByText('Choose your preferred theme mode')).toBeDefined();
    });

    it('renders all theme toggle buttons', () => {
      render(<AppearanceSection />);
      expect(screen.getByText('System')).toBeDefined();
      expect(screen.getByText('Light')).toBeDefined();
      expect(screen.getByText('Dark')).toBeDefined();
    });

    it('renders toggle buttons with correct aria labels', () => {
      render(<AppearanceSection />);
      expect(screen.getByRole('button', { name: 'system theme' })).toBeDefined();
      expect(screen.getByRole('button', { name: 'light theme' })).toBeDefined();
      expect(screen.getByRole('button', { name: 'dark theme' })).toBeDefined();
    });
  });

  describe('theme selection', () => {
    it('calls setMode with "light" when light button is clicked', () => {
      render(<AppearanceSection />);
      fireEvent.click(screen.getByRole('button', { name: 'light theme' }));
      expect(mockSetMode).toHaveBeenCalledWith('light');
    });

    it('calls setMode with "dark" when dark button is clicked', () => {
      render(<AppearanceSection />);
      fireEvent.click(screen.getByRole('button', { name: 'dark theme' }));
      expect(mockSetMode).toHaveBeenCalledWith('dark');
    });

    it('calls setMode with "system" when system button is clicked', () => {
      mockMode = 'dark';
      render(<AppearanceSection />);
      fireEvent.click(screen.getByRole('button', { name: 'system theme' }));
      expect(mockSetMode).toHaveBeenCalledWith('system');
    });

    it('does not call setMode when clicking already selected mode', () => {
      mockMode = 'system';
      render(<AppearanceSection />);
      // Clicking already selected button should pass null to handler, which should not call setMode
      const systemButton = screen.getByRole('button', { name: 'system theme' });
      fireEvent.click(systemButton);
      // MUI ToggleButtonGroup passes null when clicking already-selected exclusive button
      // Our handler ignores null values
      expect(mockSetMode).not.toHaveBeenCalled();
    });
  });
});
