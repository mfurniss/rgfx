import React from 'react';
import {
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Typography,
} from '@mui/material';
import type { SystemError } from '@/types';
import { useSortableTable } from '@/renderer/hooks/use-sortable-table';
import { SortableTableHead, type SortableColumn } from '@/renderer/components/common/sortable-table-head';

type SortField = 'timestamp' | 'errorType' | 'message';

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString();
}

const COLUMNS: SortableColumn<SortField>[] = [
  { field: 'timestamp', label: 'Time', width: 0.15 },
  { field: 'errorType', label: 'Error Type', width: 0.2 },
  { field: 'message', label: 'Message' },
];

interface SystemErrorsProps {
  errors: readonly SystemError[];
}

export const SystemErrors: React.FC<SystemErrorsProps> = ({ errors }) => {
  const { sortField, sortOrder, handleSort, sortData } = useSortableTable<SortField>({
    storageKey: 'systemErrors',
    defaultField: 'timestamp',
    defaultOrder: 'desc',
    defaultDescFields: ['timestamp'],
  });

  const sortedErrors = sortData([...errors] as SystemError[]);

  if (errors.length === 0) {
    return (
      <Alert variant="outlined" severity="success" sx={{ mb: 3 }}>
        No system errors
      </Alert>
    );
  }

  return (
    <>
      <Typography variant="h6" sx={{ mb: 1 }}>
        System Errors
      </Typography>
      <TableContainer
        component={Paper}
        sx={{ mb: 3, border: 1, borderColor: 'error.main' }}
      >
        <Table size="small">
          <SortableTableHead
            columns={COLUMNS}
            sortField={sortField}
            sortOrder={sortOrder}
            onSort={handleSort}
          />
          <TableBody>
            {sortedErrors.map((err, i) => (
              <TableRow key={i} sx={{ verticalAlign: 'top' }}>
                <TableCell sx={{ verticalAlign: 'top' }}>
                  {formatTimestamp(err.timestamp)}
                </TableCell>
                <TableCell sx={{ verticalAlign: 'top' }}>{err.errorType}</TableCell>
                <TableCell sx={{ verticalAlign: 'top' }}>
                  <Typography
                    variant="body2"
                    sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                  >
                    {err.message}
                  </Typography>
                  {err.filePath && (
                    <Typography
                      variant="caption"
                      sx={{ fontFamily: 'monospace', color: 'text.secondary', display: 'block', mt: 0.5 }}
                    >
                      {err.filePath}
                    </Typography>
                  )}
                  {err.details && (
                    <Typography
                      variant="caption"
                      component="pre"
                      sx={{
                        fontFamily: 'monospace',
                        color: 'text.secondary',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        mt: 0.5,
                      }}
                    >
                      {err.details}
                    </Typography>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
};
