/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { Table, TableCell } from '@mui/material';
import { SortableTableHead, type SortableColumn } from '../sortable-table-head';

type TestField = 'name' | 'date' | 'count';

const defaultColumns: SortableColumn<TestField>[] = [
  { field: 'name', label: 'Name', width: 0.4 },
  { field: 'date', label: 'Date', width: 0.3, align: 'right' },
  { field: 'count', label: 'Count', width: 0.3, align: 'center' },
];

const noop = vi.fn();

const renderWithTable = (ui: React.ReactElement) => {
  return render(<Table>{ui}</Table>);
};

describe('SortableTableHead', () => {
  afterEach(() => {
    cleanup();
  });

  describe('rendering', () => {
    it('renders all column labels', () => {
      renderWithTable(
        <SortableTableHead
          columns={defaultColumns}
          sortField="name"
          sortOrder="asc"
          onSort={noop}
        />,
      );

      expect(screen.getByText('Name')).toBeDefined();
      expect(screen.getByText('Date')).toBeDefined();
      expect(screen.getByText('Count')).toBeDefined();
    });

    it('renders TableSortLabel for sortable columns', () => {
      renderWithTable(
        <SortableTableHead
          columns={defaultColumns}
          sortField="name"
          sortOrder="asc"
          onSort={noop}
        />,
      );

      // All columns should have sort buttons
      const sortLabels = screen.getAllByRole('button');
      expect(sortLabels).toHaveLength(3);
    });

    it('renders plain text for non-sortable columns (sortable: false)', () => {
      const columnsWithNonSortable: SortableColumn<TestField>[] = [
        { field: 'name', label: 'Name' },
        { field: 'date', label: 'Date', sortable: false },
        { field: 'count', label: 'Count' },
      ];

      renderWithTable(
        <SortableTableHead
          columns={columnsWithNonSortable}
          sortField="name"
          sortOrder="asc"
          onSort={noop}
        />,
      );

      // Only 2 sortable columns should have buttons
      const sortLabels = screen.getAllByRole('button');
      expect(sortLabels).toHaveLength(2);

      // Date should still be visible but not as a button
      expect(screen.getByText('Date')).toBeDefined();
    });

    it('renders extraColumns after sortable columns', () => {
      renderWithTable(
        <SortableTableHead
          columns={defaultColumns}
          sortField="name"
          sortOrder="asc"
          onSort={noop}
          extraColumns={<TableCell>Actions</TableCell>}
        />,
      );

      expect(screen.getByText('Actions')).toBeDefined();

      // Actions should come after the other columns
      const headerCells = screen.getAllByRole('columnheader');
      expect(headerCells).toHaveLength(4);
      expect(headerCells[3].textContent).toBe('Actions');
    });
  });

  describe('sort indicators', () => {
    it('shows active state on current sort field', () => {
      const { container } = renderWithTable(
        <SortableTableHead
          columns={defaultColumns}
          sortField="name"
          sortOrder="asc"
          onSort={noop}
        />,
      );

      // MUI TableSortLabel adds Mui-active class when active
      const activeLabel = container.querySelector('.Mui-active');
      expect(activeLabel).not.toBeNull();
      expect(activeLabel?.textContent).toBe('Name');
    });

    it('shows correct direction arrow for asc', () => {
      renderWithTable(
        <SortableTableHead
          columns={defaultColumns}
          sortField="name"
          sortOrder="asc"
          onSort={noop}
        />,
      );

      // MUI TableSortLabel puts aria-sort on the th element
      const nameHeader = screen.getByRole('columnheader', { name: /name/i });
      expect(nameHeader.getAttribute('aria-sort')).toBe('ascending');
    });

    it('shows correct direction arrow for desc', () => {
      renderWithTable(
        <SortableTableHead
          columns={defaultColumns}
          sortField="name"
          sortOrder="desc"
          onSort={noop}
        />,
      );

      const nameHeader = screen.getByRole('columnheader', { name: /name/i });
      expect(nameHeader.getAttribute('aria-sort')).toBe('descending');
    });

    it('shows inactive state on non-sorted columns', () => {
      const { container } = renderWithTable(
        <SortableTableHead
          columns={defaultColumns}
          sortField="name"
          sortOrder="asc"
          onSort={noop}
        />,
      );

      // Only one column should be active
      const activeLabels = container.querySelectorAll('.Mui-active');
      expect(activeLabels).toHaveLength(1);
    });
  });

  describe('interaction', () => {
    it('calls onSort with field when column header clicked', () => {
      const onSort = vi.fn();

      renderWithTable(
        <SortableTableHead
          columns={defaultColumns}
          sortField="name"
          sortOrder="asc"
          onSort={onSort}
        />,
      );

      fireEvent.click(screen.getByText('Date'));

      expect(onSort).toHaveBeenCalledTimes(1);
      expect(onSort).toHaveBeenCalledWith('date');
    });

    it('calls onSort when clicking already active column', () => {
      const onSort = vi.fn();

      renderWithTable(
        <SortableTableHead
          columns={defaultColumns}
          sortField="name"
          sortOrder="asc"
          onSort={onSort}
        />,
      );

      fireEvent.click(screen.getByText('Name'));

      expect(onSort).toHaveBeenCalledTimes(1);
      expect(onSort).toHaveBeenCalledWith('name');
    });

    it('does not call onSort for non-sortable columns', () => {
      const onSort = vi.fn();
      const columnsWithNonSortable: SortableColumn<TestField>[] = [
        { field: 'name', label: 'Name' },
        { field: 'date', label: 'Date', sortable: false },
      ];

      renderWithTable(
        <SortableTableHead
          columns={columnsWithNonSortable}
          sortField="name"
          sortOrder="asc"
          onSort={onSort}
        />,
      );

      // Click on the non-sortable Date text
      fireEvent.click(screen.getByText('Date'));

      expect(onSort).not.toHaveBeenCalled();
    });
  });
});
