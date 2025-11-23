import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
import { formatDistanceToNow, format } from 'date-fns';
import type { Driver } from '~/src/types';
import { UI_TIMESTAMP_UPDATE_INTERVAL_MS } from '~/src/config/constants';
import { useUiStore, type SortField } from '../store/ui-store';
import { useDriverStore } from '../store/driver-store';

interface DriverListTableProps {
  drivers: Driver[];
}

const SORT_COLUMNS: { field: SortField; label: string }[] = [
  { field: 'id', label: 'Device ID' },
  { field: 'ip', label: 'IP Address' },
  { field: 'status', label: 'Status' },
  { field: 'firstSeen', label: 'First Seen' },
];

/**
 * Driver list table component with sortable columns
 */
const DriverListTable: React.FC<DriverListTableProps> = ({ drivers }) => {
  const location = useLocation();
  const sortField = useUiStore((state) => state.driverTableSortField);
  const sortOrder = useUiStore((state) => state.driverTableSortOrder);
  const setDriverTableSort = useUiStore((state) => state.setDriverTableSort);
  const currentFirmwareVersion = useDriverStore((state) => state.systemStatus.currentFirmwareVersion);
  const [, setCurrentTime] = useState(Date.now());

  // Update current time every second for live relative timestamps - only when component is visible
  useEffect(() => {
    // Check if we're on the drivers list page (/drivers)
    const isVisible = location.pathname === '/drivers';

    if (isVisible) {
      // Immediate update when page becomes visible
      setCurrentTime(Date.now());

      // Then start interval
      const interval = setInterval(() => {
        setCurrentTime(Date.now());
      }, UI_TIMESTAMP_UPDATE_INTERVAL_MS);

      return () => {
        clearInterval(interval);
      };
    }
  }, [location.pathname]);

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
      case 'firstSeen':
        compareValue = a.firstSeen - b.firstSeen;
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
              component={Link}
              to={`/driver/${driver.id}`}
              sx={{
                '&:hover': { backgroundColor: 'action.hover' },
                opacity: driver.connected ? 1 : 0.6,
              }}
            >
              <TableCell>{driver.id}</TableCell>
              <TableCell>{driver.ip ?? ''}</TableCell>
              <TableCell>
                {!driver.connected ? (
                  <Chip label="Disconnected" color="error" size="small" />
                ) : currentFirmwareVersion &&
                  driver.telemetry?.firmwareVersion !== currentFirmwareVersion ? (
                  <Tooltip
                    title={`Driver: ${driver.telemetry?.firmwareVersion ?? 'unknown'}, Hub: ${currentFirmwareVersion}`}
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
              <TableCell>
                <Tooltip title={format(driver.firstSeen, 'PPpp')}>
                  <span>{formatDistanceToNow(driver.firstSeen, { addSuffix: true })}</span>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default DriverListTable;
