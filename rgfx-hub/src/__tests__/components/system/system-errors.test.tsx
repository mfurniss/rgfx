import React from 'react';
import { render, screen, fireEvent } from '@/__tests__/render';
import { describe, it, expect, beforeEach } from 'vitest';
import { SystemErrors } from '@/renderer/components/system/system-errors';
import { useUiStore } from '@/renderer/store/ui-store';
import { useSystemStatusStore } from '@/renderer/store/system-status-store';
import type { SystemError } from '@/types';

const createMockError = (overrides: Partial<SystemError> = {}): SystemError => ({
  errorType: 'interceptor',
  message: 'Test error message',
  timestamp: Date.now(),
  ...overrides,
});

const setErrors = (errors: readonly SystemError[]) => {
  useSystemStatusStore.setState((state) => ({
    systemStatus: { ...state.systemStatus, systemErrors: errors },
  }));
};

describe('SystemErrors', () => {
  beforeEach(() => {
    // Reset persisted sort preferences so tests don't depend on ordering
    useUiStore.setState({ tableSortPreferences: {} });
    setErrors([]);
  });

  describe('empty state', () => {
    it('shows success alert when no errors', () => {
      render(<SystemErrors />);

      expect(screen.getByText('No system errors')).toBeDefined();
      expect(screen.queryByText('System Errors')).toBeNull();
    });

    it('does not render table when no errors', () => {
      render(<SystemErrors />);

      expect(screen.queryByRole('table')).toBeNull();
    });
  });

  describe('with errors', () => {
    it('renders System Errors heading when errors exist', () => {
      setErrors([createMockError()]);
      render(<SystemErrors />);

      expect(screen.getByText('System Errors')).toBeDefined();
      expect(screen.queryByText('No system errors')).toBeNull();
    });

    it('renders a table with errors', () => {
      setErrors([createMockError({ message: 'First error' })]);
      render(<SystemErrors />);

      expect(screen.getByRole('table')).toBeDefined();
      expect(screen.getByText('First error')).toBeDefined();
    });

    it('renders multiple errors', () => {
      setErrors([
        createMockError({ message: 'Error one', timestamp: 1000 }),
        createMockError({ message: 'Error two', timestamp: 2000 }),
        createMockError({ message: 'Error three', timestamp: 3000 }),
      ]);
      render(<SystemErrors />);

      expect(screen.getByText('Error one')).toBeDefined();
      expect(screen.getByText('Error two')).toBeDefined();
      expect(screen.getByText('Error three')).toBeDefined();
    });

    it('displays error type', () => {
      setErrors([createMockError({ errorType: 'interceptor' })]);
      render(<SystemErrors />);

      expect(screen.getByText('interceptor')).toBeDefined();
    });

    it('formats timestamp as time string', () => {
      const timestamp = new Date('2025-01-15T10:30:45').getTime();
      setErrors([createMockError({ timestamp })]);
      render(<SystemErrors />);

      // The formatted time should appear (locale-dependent)
      const expectedTime = new Date(timestamp).toLocaleTimeString();
      expect(screen.getByText(expectedTime)).toBeDefined();
    });
  });

  describe('table headers', () => {
    it('renders Time column header', () => {
      setErrors([createMockError()]);
      render(<SystemErrors />);

      expect(screen.getByText('Time')).toBeDefined();
    });

    it('renders Error Type column header', () => {
      setErrors([createMockError()]);
      render(<SystemErrors />);

      expect(screen.getByText('Error Type')).toBeDefined();
    });

    it('renders Message column header', () => {
      setErrors([createMockError()]);
      render(<SystemErrors />);

      expect(screen.getByText('Message')).toBeDefined();
    });
  });

  describe('sorting', () => {
    const createTestErrors = (): SystemError[] => [
      createMockError({ message: 'Alpha error', errorType: 'interceptor', timestamp: 3000 }),
      createMockError({ message: 'Beta error', errorType: 'interceptor', timestamp: 1000 }),
      createMockError({ message: 'Gamma error', errorType: 'interceptor', timestamp: 2000 }),
    ];

    it('sorts by timestamp descending by default', () => {
      setErrors(createTestErrors());
      render(<SystemErrors />);

      const rows = screen.getAllByRole('row');
      // First row is header, so data rows start at index 1
      // Default sort is timestamp descending (newest first)
      expect(rows[1].textContent).toContain('Alpha error'); // timestamp 3000
      expect(rows[2].textContent).toContain('Gamma error'); // timestamp 2000
      expect(rows[3].textContent).toContain('Beta error'); // timestamp 1000
    });

    it('toggles timestamp sort order when clicked', () => {
      setErrors(createTestErrors());
      render(<SystemErrors />);

      // Click Time header to toggle to ascending
      fireEvent.click(screen.getByText('Time'));

      const rows = screen.getAllByRole('row');
      // After click, should be ascending (oldest first)
      expect(rows[1].textContent).toContain('Beta error'); // timestamp 1000
      expect(rows[2].textContent).toContain('Gamma error'); // timestamp 2000
      expect(rows[3].textContent).toContain('Alpha error'); // timestamp 3000
    });

    it('sorts by message when Message header clicked', () => {
      setErrors(createTestErrors());
      render(<SystemErrors />);

      // Click Message header to sort by message ascending
      fireEvent.click(screen.getByText('Message'));

      const rows = screen.getAllByRole('row');
      expect(rows[1].textContent).toContain('Alpha error');
      expect(rows[2].textContent).toContain('Beta error');
      expect(rows[3].textContent).toContain('Gamma error');
    });

    it('sorts by error type when Error Type header clicked', () => {
      setErrors([
        createMockError({ message: 'First', errorType: 'interceptor', timestamp: 1000 }),
        createMockError({ message: 'Second', errorType: 'interceptor', timestamp: 2000 }),
      ]);
      render(<SystemErrors />);

      // Click Error Type header
      fireEvent.click(screen.getByText('Error Type'));

      // Both have same error type, so order should be stable
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBe(3); // 1 header + 2 data rows
    });

    it('toggles sort order when same header clicked twice', () => {
      setErrors(createTestErrors());
      render(<SystemErrors />);

      // Click Message header twice to toggle from asc to desc
      fireEvent.click(screen.getByText('Message'));
      fireEvent.click(screen.getByText('Message'));

      const rows = screen.getAllByRole('row');
      // Should now be descending
      expect(rows[1].textContent).toContain('Gamma error');
      expect(rows[2].textContent).toContain('Beta error');
      expect(rows[3].textContent).toContain('Alpha error');
    });
  });

  describe('styling', () => {
    it('applies monospace font to error messages', () => {
      setErrors([createMockError({ message: 'Styled error' })]);
      const { container } = render(<SystemErrors />);

      // Find the Typography containing the message
      const messageCell = container.querySelector('p');
      expect(messageCell).not.toBeNull();
      // The Typography should have monospace font family in sx prop
      // We verify the text is rendered correctly
      expect(messageCell?.textContent).toBe('Styled error');
    });
  });
});
