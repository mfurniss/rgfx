import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TableSortLabel,
} from '@mui/material';
import type { Driver } from '@/types';
import { useUiStore, type SortField } from '../store/ui-store';
import { useDriverStore } from '../store/driver-store';
import TestLedButton from './test-led-button';
import DriverState from './driver-state';

interface DriverListTableProps {
  drivers: Driver[];
}

const SORT_COLUMNS: { field: SortField; label: string }[] = [
  { field: 'id', label: 'Driver ID' },
  { field: 'ip', label: 'IP Address' },
  { field: 'status', label: 'Status' },
];

/**
 * Driver list table component with sortable columns
 */
const DriverListTable: React.FC<DriverListTableProps> = ({ drivers }) => {
  const navigate = useNavigate();
  const sortField = useUiStore((state) => state.driverTableSortField);
  const sortOrder = useUiStore((state) => state.driverTableSortOrder);
  const setDriverTableSort = useUiStore((state) => state.setDriverTableSort);
  const currentFirmwareVersion =
    useDriverStore((state) => state.systemStatus.currentFirmwareVersion);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setDriverTableSort(field, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setDriverTableSort(field, 'asc');
    }
  };

  const sortedDrivers = [...drivers].sort((a: Driver, b: Driver) => {
    let compareValue = 0;

    switch (sortField) {
      case 'id':
        compareValue = a.id.localeCompare(b.id);
        break;
      case 'ip':
        compareValue = (a.ip ?? '').localeCompare(b.ip ?? '');
        break;
      case 'status':
        compareValue = (a.state === 'connected' ? 1 : 0) - (b.state === 'connected' ? 1 : 0);
        break;
    }

    return sortOrder === 'asc' ? compareValue : -compareValue;
  });

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            {SORT_COLUMNS.map((column) => (
              <TableCell key={column.field}>
                <TableSortLabel
                  active={sortField === column.field}
                  direction={sortField === column.field ? sortOrder : 'asc'}
                  onClick={() => {
                    handleSort(column.field);
                  }}
                >
                  {column.label}
                </TableSortLabel>
              </TableCell>
            ))}
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedDrivers.map((driver: Driver) => (
            <TableRow
              key={driver.mac ?? driver.id}
              onClick={() => {
                void navigate(`/driver/${driver.mac}`);
              }}
              sx={{
                cursor: 'pointer',
                '&:hover': { backgroundColor: 'action.hover' },
              }}
            >
              <TableCell>{driver.id}</TableCell>
              <TableCell>{driver.ip ?? ''}</TableCell>
              <TableCell>
                <DriverState driver={driver} currentFirmwareVersion={currentFirmwareVersion} />
              </TableCell>
              <TableCell
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <TestLedButton driver={driver} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default DriverListTable;
