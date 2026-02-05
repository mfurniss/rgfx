/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

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
