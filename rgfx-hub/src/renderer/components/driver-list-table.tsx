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
  Chip,
  TableSortLabel,
  Tooltip,
} from '@mui/material';
import type { Driver } from '@/types';
import { useUiStore, type SortField } from '../store/ui-store';
import { useDriverStore } from '../store/driver-store';

interface DriverListTableProps {
  drivers: Driver[];
}

const SORT_COLUMNS: { field: SortField; label: string }[] = [
  { field: 'id', label: 'Device ID' },
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
  const currentFirmwareVersion = useDriverStore((state) => state.systemStatus.currentFirmwareVersion);

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
        compareValue = (a.connected ? 1 : 0) - (b.connected ? 1 : 0);
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
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedDrivers.map((driver: Driver) => (
            <TableRow
              key={driver.id}
              onClick={() => {
                void navigate(`/driver/${driver.id}`);
              }}
              sx={{
                cursor: 'pointer',
                '&:hover': { backgroundColor: 'action.hover' },
                opacity: driver.connected ? 1 : 0.6,
              }}
            >
              <TableCell>{driver.id}</TableCell>
              <TableCell>{driver.ip ?? ''}</TableCell>
              <TableCell>
                {!driver.connected ? (
                  <Chip label="Disconnected" color="error" size="small" />
                ) : !driver.telemetry?.firmwareVersion ? (
                  <Tooltip
                    title="Driver firmware version unknown - update required"
                    arrow
                  >
                    <Chip label="Update Required" color="error" size="small" />
                  </Tooltip>
                ) : currentFirmwareVersion &&
                  driver.telemetry.firmwareVersion !== currentFirmwareVersion ? (
                    <Tooltip
                      title={`Driver: ${driver.telemetry.firmwareVersion}, Hub: ${currentFirmwareVersion}`}
                      arrow
                    >
                      <Chip label="Update Available" color="warning" size="small" />
                    </Tooltip>
                  ) : !driver.ledConfig ? (
                    <Tooltip title="Needs LED configuration" arrow>
                      <Chip label="Needs Configuration" color="warning" size="small" />
                    </Tooltip>
                  ) : driver.failedHeartbeats > 0 ? (
                    <Chip
                      label={`Connected (${driver.failedHeartbeats} missed)`}
                      color="warning"
                      size="small"
                    />
                  ) : (
                    <Chip label="Connected" color="success" size="small" />
                  )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default DriverListTable;
