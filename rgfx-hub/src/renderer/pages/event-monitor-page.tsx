import React, { useState } from 'react';
import {
  Typography,
  Box,
  Table,
  TableBody,
  TableContainer,
  Paper,
  Button,
  Dialog,
  DialogContent,
  DialogActions,
  Stack,
} from '@mui/material';
import MonitorIcon from '@mui/icons-material/Monitor';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningIcon from '@mui/icons-material/Warning';
import { useEventStore } from '../store/event-store';
import { PageTitle } from '../components/layout/page-title';
import { useSortableTable } from '../hooks/use-sortable-table';
import {
  SortableTableHead,
  type SortableColumn,
} from '../components/common/sortable-table-head';
import { TableEmptyRow } from '../components/common/table-empty-row';
import { DialogTitleWithIcon } from '../components/common/dialog-title-with-icon';
import { EventRow } from '../components/event-monitor/event-row';

type SortField = 'topic' | 'count' | 'lastValue';

interface TopicEntry {
  topic: string;
  count: number;
  lastValue?: string;
}

const COLUMNS: SortableColumn<SortField>[] = [
  { field: 'topic', label: 'Event Topic', width: 0.4 },
  { field: 'count', label: 'Count', width: 0.3, align: 'right' },
  {
    field: 'lastValue',
    label: 'Last Value',
    width: 0.3,
    align: 'right',
    sortable: false,
  },
];

const EventMonitorPage: React.FC = () => {
  const topics = useEventStore((state) => state.topics);
  const reset = useEventStore((state) => state.reset);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { sortField, sortOrder, handleSort, sortData } =
    useSortableTable<SortField>({
      storageKey: 'eventMonitor',
      defaultField: 'topic',
    });

  const topicsArray: TopicEntry[] = Object.entries(topics)
    .filter(
      (entry): entry is [string, NonNullable<(typeof entry)[1]>] =>
        entry[1] !== undefined,
    )
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
    void window.rgfx.resetEventCounts().then(() => {
      reset();
    });
  };

  return (
    <Box>
      <Stack spacing={2}>
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
        }}>
          <PageTitle
            icon={<MonitorIcon />}
            title="Event Monitor"
            noGutters
          />
          <Button
            variant="outlined"
            color="error"
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
                <TableEmptyRow
                  colSpan={3}
                  message="No events received yet"
                />
              ) : (
                sortedTopics.map((entry) => (
                  <EventRow
                    key={entry.topic}
                    topic={entry.topic}
                    count={entry.count}
                    lastValue={entry.lastValue}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Stack>

      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitleWithIcon
          icon={<WarningIcon />}
          title="Confirm Reset"
          iconColor="warning"
        />
        <DialogContent>
          <Typography>
            This will clear all event counts and reset the
            events processed counter.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleConfirmReset}
            variant="contained"
            color="error"
          >
            Reset
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EventMonitorPage;
