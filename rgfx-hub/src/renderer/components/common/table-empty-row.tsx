import React from 'react';
import { TableRow, TableCell, Typography } from '@mui/material';

interface TableEmptyRowProps {
  colSpan: number;
  message: string;
}

export const TableEmptyRow: React.FC<TableEmptyRowProps> = ({ colSpan, message }) => (
  <TableRow>
    <TableCell colSpan={colSpan} align="center">
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
    </TableCell>
  </TableRow>
);
