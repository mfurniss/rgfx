import React, { useState } from 'react';
import {
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Monitor as MonitorIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useEventStore } from '../store/event-store';
import { formatNumber } from '../utils/formatters';
import { PageTitle } from '../components/layout/page-title';
import { useSortableTable } from '../hooks/use-sortable-table';
import { SortableTableHead, type SortableColumn } from '../components/common/sortable-table-head';

type SortField = 'topic' | 'count' | 'lastValue';

interface TopicEntry {
  topic: string;
  count: number;
  lastValue?: string;
}

const COLUMNS: SortableColumn<SortField>[] = [
  { field: 'topic', label: 'Event Topic', width: 0.4 },
  { field: 'count', label: 'Count', width: 0.3, align: 'right' },
  { field: 'lastValue', label: 'Last Value', width: 0.3, align: 'right', sortable: false },
];

const truncateValue = (value: string): string => {
  const maxLength = 25;

  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength)}…`;
};

const formatValue = (value: string | undefined): string => {
  if (value === undefined || value === '') {
    return '';
  }

  const numValue = Number(value);

  if (isNaN(numValue)) {
    return truncateValue(value);
  }

  if (numValue >= 0 && numValue <= 65535 && Number.isInteger(numValue)) {
    const hex = `0x${numValue.toString(16).toUpperCase().padStart(4, '0')}`;
    return `${formatNumber(numValue)} (${hex})`;
  }

  return formatNumber(numValue);
};

const EventMonitorPage: React.FC = () => {
  const topics = useEventStore((state) => state.topics);
  const reset = useEventStore((state) => state.reset);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { sortField, sortOrder, handleSort, sortData } = useSortableTable<SortField>({
    storageKey: 'eventMonitor',
    defaultField: 'topic',
  });

  const topicsArray: TopicEntry[] = Object.entries(topics)
    .filter((entry): entry is [string, NonNullable<(typeof entry)[1]>] => entry[1] !== undefined)
    .map(([topic, data]) => ({
      topic,
      count: data.count,
      lastValue: data.lastValue,
    }));

  const sortedTopics = sortData(topicsArray);

  const handleOpenDialog = () => {
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleConfirmReset = () => {
    setDialogOpen(false);
    void (async () => {
      await window.rgfx.resetEventCounts();
      reset();
    })();
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <PageTitle icon={<MonitorIcon />} title="Event Monitor" />
        <Button
          variant="outlined"
          color="error"
          size="small"
          startIcon={<RefreshIcon />}
          onClick={handleOpenDialog}
          disabled={topicsArray.length === 0}
        >
          Reset
        </Button>
      </Box>
      <TableContainer component={Paper}>
        <Table size="small">
          <SortableTableHead
            columns={COLUMNS}
            sortField={sortField}
            sortOrder={sortOrder}
            onSort={handleSort}
          />
          <TableBody>
            {sortedTopics.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} align="center">
                  <Typography variant="body2" color="text.secondary">
                    No events received yet
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              sortedTopics.map((entry) => (
                <TableRow
                  key={entry.topic}
                  onClick={() => {
                    const eventLine = entry.lastValue
                      ? `${entry.topic} ${entry.lastValue}`
                      : entry.topic;
                    void window.rgfx.simulateEvent(eventLine);
                  }}
                  sx={{
                    cursor: 'pointer',
                    '&:hover': { backgroundColor: 'action.hover' },
                  }}
                >
                  <TableCell>{entry.topic}</TableCell>
                  <TableCell align="right">{formatNumber(entry.count)}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{formatValue(entry.lastValue)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="warning" />
          Confirm Reset
        </DialogTitle>
        <DialogContent>
          <Typography>
            This will clear all event counts and reset the events processed counter.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleConfirmReset} variant="contained" color="error">
            Reset
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EventMonitorPage;
