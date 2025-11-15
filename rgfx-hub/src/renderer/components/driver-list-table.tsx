import React, { useState, useEffect } from 'react';
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
  IconButton,
  TableSortLabel,
  Tooltip,
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import type { Driver } from '~/src/types';
import { UI_TIMESTAMP_UPDATE_INTERVAL_MS } from '~/src/config/constants';

interface DriverListTableProps {
  drivers: Driver[];
}

type SortField = 'id' | 'name' | 'ip' | 'status' | 'firstSeen';
type SortOrder = 'asc' | 'desc';

/**
 * Formats a timestamp as relative time (e.g., "2 minutes ago")
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
  if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }
  if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  }
  return `${seconds} second${seconds !== 1 ? 's' : ''} ago`;
}

/**
 * Driver list table component with sortable columns
 */
const DriverListTable: React.FC<DriverListTableProps> = ({ drivers }) => {
  const navigate = useNavigate();
  const [sortField, setSortField] = useState<SortField>('firstSeen');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [, setCurrentTime] = useState(Date.now());

  // DEBUG: Log when drivers prop changes
  useEffect(() => {
    const renderTime = Date.now();
    console.log(`[DEBUG] DriverListTable re-rendered at ${renderTime}, drivers count=${drivers.length}`);
    drivers.forEach(d => {
      console.log(`[DEBUG] Driver ${d.id}: connected=${d.connected}, lastSeen=${d.lastSeen}`);
    });
  }, [drivers]);

  // Update current time every second for live relative timestamps
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, UI_TIMESTAMP_UPDATE_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedDrivers = [...drivers].sort((a: Driver, b: Driver) => {
    let compareValue = 0;

    switch (sortField) {
      case 'id':
        compareValue = a.id.localeCompare(b.id);
        break;
      case 'name':
        compareValue = a.name.localeCompare(b.name);
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

  const handleMoreInfo = (driverId: string) => {
    void navigate(`/driver/${driverId}`);
  };

  if (drivers.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <p>No drivers discovered yet. Waiting for drivers to connect...</p>
      </Paper>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>
              <TableSortLabel
                active={sortField === 'id'}
                direction={sortField === 'id' ? sortOrder : 'asc'}
                onClick={() => {
                  handleSort('id');
                }}
              >
                Device ID
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={sortField === 'ip'}
                direction={sortField === 'ip' ? sortOrder : 'asc'}
                onClick={() => {
                  handleSort('ip');
                }}
              >
                IP Address
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={sortField === 'status'}
                direction={sortField === 'status' ? sortOrder : 'asc'}
                onClick={() => {
                  handleSort('status');
                }}
              >
                Status
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={sortField === 'firstSeen'}
                direction={sortField === 'firstSeen' ? sortOrder : 'asc'}
                onClick={() => {
                  handleSort('firstSeen');
                }}
              >
                First Seen
              </TableSortLabel>
            </TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedDrivers.map((driver: Driver) => (
            <TableRow
              key={driver.id}
              sx={{
                '&:hover': { backgroundColor: 'action.hover' },
                opacity: driver.connected ? 1 : 0.6,
              }}
            >
              <TableCell>{driver.id}</TableCell>
              <TableCell>{driver.ip ?? 'Unknown'}</TableCell>
              <TableCell>
                <Chip
                  label={
                    driver.connected
                      ? driver.failedHeartbeats > 0
                        ? `Connected (${driver.failedHeartbeats} missed)`
                        : 'Connected'
                      : 'Disconnected'
                  }
                  color={
                    driver.connected
                      ? driver.failedHeartbeats > 0
                        ? 'warning'
                        : 'success'
                      : 'error'
                  }
                  size="small"
                />
              </TableCell>
              <TableCell>
                <Tooltip title={new Date(driver.firstSeen).toLocaleString()}>
                  <span>{formatRelativeTime(driver.firstSeen)}</span>
                </Tooltip>
              </TableCell>
              <TableCell align="right">
                <Tooltip title="View Details">
                  <IconButton
                    size="small"
                    onClick={() => {
                      handleMoreInfo(driver.id);
                    }}
                    aria-label="more info"
                  >
                    <InfoIcon />
                  </IconButton>
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
