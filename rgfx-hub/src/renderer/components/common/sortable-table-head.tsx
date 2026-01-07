import React from 'react';
import { TableCell, TableHead, TableRow, TableSortLabel } from '@mui/material';
import type { SortOrder } from '@/renderer/hooks/use-sortable-table';

export interface SortableColumn<T extends string> {
  /** Field name used for sorting */
  field: T;
  /** Display label for the column header */
  label: string;
  /** Column width (CSS value or MUI fraction) */
  width?: number | string;
  /** Text alignment */
  align?: 'left' | 'right' | 'center';
  /** Whether column is sortable (default: true) */
  sortable?: boolean;
}

interface SortableTableHeadProps<T extends string> {
  /** Column definitions */
  columns: SortableColumn<T>[];
  /** Current sort field */
  sortField: T;
  /** Current sort order */
  sortOrder: SortOrder;
  /** Callback when sort is requested */
  onSort: (field: T) => void;
  /** Additional columns to render after sortable columns (e.g., Actions) */
  extraColumns?: React.ReactNode;
}

/**
 * Table header component with sortable columns.
 * Renders TableSortLabel for sortable columns and plain text for non-sortable ones.
 *
 * @example
 * ```tsx
 * const columns: SortableColumn<'name' | 'date'>[] = [
 *   { field: 'name', label: 'Name', width: 0.4 },
 *   { field: 'date', label: 'Date', width: 0.3, align: 'right' },
 * ];
 *
 * <SortableTableHead
 *   columns={columns}
 *   sortField={sortField}
 *   sortOrder={sortOrder}
 *   onSort={handleSort}
 *   extraColumns={<TableCell>Actions</TableCell>}
 * />
 * ```
 */
export function SortableTableHead<T extends string>({
  columns,
  sortField,
  sortOrder,
  onSort,
  extraColumns,
}: SortableTableHeadProps<T>): React.ReactElement {
  return (
    <TableHead>
      <TableRow>
        {columns.map((column) => {
          const isSortable = column.sortable !== false;
          const isActive = sortField === column.field;

          return (
            <TableCell
              key={column.field}
              sx={{ width: column.width }}
              align={column.align}
              sortDirection={isSortable && isActive ? sortOrder : false}
            >
              {isSortable ? (
                <TableSortLabel
                  active={isActive}
                  direction={isActive ? sortOrder : 'asc'}
                  onClick={() => {
                    onSort(column.field);
                  }}
                >
                  {column.label}
                </TableSortLabel>
              ) : (
                column.label
              )}
            </TableCell>
          );
        })}
        {extraColumns}
      </TableRow>
    </TableHead>
  );
}
