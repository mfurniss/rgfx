import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { Table, TableBody } from '@mui/material';
import { TableEmptyRow } from '../table-empty-row';

const renderWithTable = (ui: React.ReactElement) => {
  return render(
    <Table>
      <TableBody>{ui}</TableBody>
    </Table>,
  );
};

describe('TableEmptyRow', () => {
  afterEach(() => {
    cleanup();
  });

  describe('rendering', () => {
    it('renders the message text', () => {
      renderWithTable(<TableEmptyRow colSpan={3} message="No items found" />);

      expect(screen.getByText('No items found')).toBeDefined();
    });

    it('renders with correct colSpan', () => {
      const { container } = renderWithTable(
        <TableEmptyRow colSpan={5} message="Empty" />,
      );

      const cell = container.querySelector('td');
      expect(cell?.getAttribute('colspan')).toBe('5');
    });

    it('renders a TableRow element', () => {
      const { container } = renderWithTable(
        <TableEmptyRow colSpan={3} message="Row test" />,
      );

      const row = container.querySelector('tr');
      expect(row).not.toBeNull();
    });

    it('renders a TableCell element', () => {
      const { container } = renderWithTable(
        <TableEmptyRow colSpan={3} message="Cell test" />,
      );

      const cell = container.querySelector('td');
      expect(cell).not.toBeNull();
    });

    it('applies MUI Typography styling', () => {
      renderWithTable(<TableEmptyRow colSpan={3} message="Styled text" />);

      const typography = screen.getByText('Styled text');
      expect(typography.className).toContain('MuiTypography');
    });

    it('uses body2 variant for typography', () => {
      renderWithTable(<TableEmptyRow colSpan={3} message="Body2 text" />);

      const typography = screen.getByText('Body2 text');
      expect(typography.className).toContain('MuiTypography-body2');
    });
  });

  describe('different messages', () => {
    it('renders custom empty state messages', () => {
      renderWithTable(
        <TableEmptyRow colSpan={2} message="No events received yet" />,
      );

      expect(screen.getByText('No events received yet')).toBeDefined();
    });

    it('renders another custom message', () => {
      renderWithTable(
        <TableEmptyRow colSpan={4} message="No drivers configured" />,
      );

      expect(screen.getByText('No drivers configured')).toBeDefined();
    });

    it('renders empty table message for games', () => {
      renderWithTable(
        <TableEmptyRow colSpan={3} message="No games configured" />,
      );

      expect(screen.getByText('No games configured')).toBeDefined();
    });
  });

  describe('different colSpan values', () => {
    it('handles colSpan of 1', () => {
      const { container } = renderWithTable(
        <TableEmptyRow colSpan={1} message="Single column" />,
      );

      const cell = container.querySelector('td');
      expect(cell?.getAttribute('colspan')).toBe('1');
    });

    it('handles colSpan of 10', () => {
      const { container } = renderWithTable(
        <TableEmptyRow colSpan={10} message="Many columns" />,
      );

      const cell = container.querySelector('td');
      expect(cell?.getAttribute('colspan')).toBe('10');
    });
  });
});
