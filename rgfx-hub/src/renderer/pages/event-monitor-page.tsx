import React, { useState } from 'react';
import {
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
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

type SortField = 'topic' | 'count';
type SortOrder = 'asc' | 'desc';

interface TopicEntry {
  topic: string;
  count: number;
  lastValue?: string;
}

const formatValue = (value: string | undefined): string => {
  if (value === undefined || value === '') {
    return '';
  }

  const numValue = Number(value);

  if (isNaN(numValue)) {
    return value;
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
  const [sortField, setSortField] = useState<SortField>('topic');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [dialogOpen, setDialogOpen] = useState(false);

  const topicsArray: TopicEntry[] = Object.entries(topics)
    .filter((entry): entry is [string, NonNullable<typeof entry[1]>] => entry[1] !== undefined)
    .map(([topic, data]) => ({
      topic,
      count: data.count,
      lastValue: data.lastValue,
    }));

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedTopics = [...topicsArray].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];

    if (sortOrder === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    }
    return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
  });

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
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 0.4 }}>
                <TableSortLabel
                  active={sortField === 'topic'}
                  direction={sortField === 'topic' ? sortOrder : 'asc'}
                  onClick={() => {
                    handleSort('topic');
                  }}
                >
                  Event Topic
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ width: 0.3 }} align="right">
                <TableSortLabel
                  active={sortField === 'count'}
                  direction={sortField === 'count' ? sortOrder : 'asc'}
                  onClick={() => {
                    handleSort('count');
                  }}
                >
                  Count
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ width: 0.3 }} align="right">Last Value</TableCell>
            </TableRow>
          </TableHead>
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
                <TableRow key={entry.topic}>
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
