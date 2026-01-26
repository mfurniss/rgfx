import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableContainer, TableRow, Paper } from '@mui/material';
import type { Driver } from '@/types';
import { useSystemStatusStore } from '@/renderer/store/system-status-store';
import { useSortableTable } from '@/renderer/hooks/use-sortable-table';
import { SortableTableHead, type SortableColumn } from '@/renderer/components/common/sortable-table-head';
import TestLedButton from './test-led-button';
import DriverState from './driver-state';

type SortField = 'id' | 'ip' | 'status';

interface DriverListTableProps {
  drivers: Driver[];
}

const COLUMNS: SortableColumn<SortField>[] = [
  { field: 'id', label: 'Driver ID' },
  { field: 'ip', label: 'IP Address' },
  { field: 'status', label: 'Status' },
];

/**
 * Driver list table component with sortable columns
 */
const DriverListTable: React.FC<DriverListTableProps> = ({ drivers }) => {
  const navigate = useNavigate();
  const firmwareVersions = useSystemStatusStore(
    (state) => state.systemStatus.firmwareVersions,
  );

  const { sortField, sortOrder, handleSort, sortData } = useSortableTable<SortField>({
    storageKey: 'driverList',
    defaultField: 'id',
  });

  // Custom comparator for driver-specific fields
  const driverComparator = useCallback((a: Driver, b: Driver, field: SortField): number => {
    switch (field) {
      case 'id':
        return a.id.localeCompare(b.id);
      case 'ip':
        return (a.ip ?? '').localeCompare(b.ip ?? '');
      case 'status': {
        // Sort order: connected (3) > updating (2) > disconnected (1) > disabled (0)
        const statusOrder = (d: Driver): number => {
          if (d.disabled) {
            return 0;
          }

          if (d.state === 'connected') {
            return 3;
          }

          if (d.state === 'updating') {
            return 2;
          }

          return 1; // disconnected
        };

        return statusOrder(a) - statusOrder(b);
      }
    }
  }, []);

  const sortedDrivers = sortData(drivers, driverComparator);

  return (
    <TableContainer component={Paper}>
      <Table>
        <SortableTableHead
          columns={COLUMNS}
          sortField={sortField}
          sortOrder={sortOrder}
          onSort={handleSort}
          extraColumns={<TableCell>Actions</TableCell>}
        />
        <TableBody>
          {sortedDrivers.map((driver: Driver) => (
            <TableRow
              key={driver.mac ?? driver.id}
              onClick={() => {
                void navigate(`/drivers/${driver.mac}`);
              }}
              sx={{
                cursor: 'pointer',
                '&:hover': { backgroundColor: 'action.hover' },
              }}
            >
              <TableCell>{driver.id}</TableCell>
              <TableCell>{driver.state === 'connected' ? driver.ip ?? '' : ''}</TableCell>
              <TableCell>
                <DriverState driver={driver} firmwareVersions={firmwareVersions} />
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
