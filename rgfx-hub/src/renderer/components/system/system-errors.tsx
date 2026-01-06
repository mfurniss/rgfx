import React, { useState } from 'react';
import {
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Typography,
} from '@mui/material';
import type { SystemError } from '@/types';

type SortField = 'timestamp' | 'errorType' | 'message';
type SortOrder = 'asc' | 'desc';

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString();
}

interface SystemErrorsProps {
  errors: readonly SystemError[];
}

export const SystemErrors: React.FC<SystemErrorsProps> = ({ errors }) => {
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'timestamp' ? 'desc' : 'asc');
    }
  };

  const sortedErrors = [...errors].sort((a: SystemError, b: SystemError) => {
    const aValue = a[sortField];
    const bValue = b[sortField];

    if (sortOrder === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    }

    return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
  });

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
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 0.15 }}>
                <TableSortLabel
                  active={sortField === 'timestamp'}
                  direction={sortField === 'timestamp' ? sortOrder : 'desc'}
                  onClick={() => {
                    handleSort('timestamp');
                  }}
                >
                  Time
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ width: 0.2 }}>
                <TableSortLabel
                  active={sortField === 'errorType'}
                  direction={sortField === 'errorType' ? sortOrder : 'asc'}
                  onClick={() => {
                    handleSort('errorType');
                  }}
                >
                  Error Type
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'message'}
                  direction={sortField === 'message' ? sortOrder : 'asc'}
                  onClick={() => {
                    handleSort('message');
                  }}
                >
                  Message
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
};
