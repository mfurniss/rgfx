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
} from '@mui/material';
import { useEventStore } from '../store/event-store';
import { formatNumber } from '../utils/formatters';

type SortField = 'topic' | 'count';
type SortOrder = 'asc' | 'desc';

const EventMonitorPage: React.FC = () => {
  const topics = useEventStore((state) => state.topics);
  const [sortField, setSortField] = useState<SortField>('topic');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const topicsArray = Array.from(topics.values());

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

  return (
    <Box>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>
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
              <TableCell align="right">
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
              <TableCell align="right">Last Value</TableCell>
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
              sortedTopics.map((eventTopic) => (
                <TableRow key={eventTopic.topic}>
                  <TableCell>{eventTopic.topic}</TableCell>
                  <TableCell align="right">{formatNumber(eventTopic.count)}</TableCell>
                  <TableCell align="right">
                    {eventTopic.lastValue ? formatNumber(Number(eventTopic.lastValue)) : ''}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default EventMonitorPage;
