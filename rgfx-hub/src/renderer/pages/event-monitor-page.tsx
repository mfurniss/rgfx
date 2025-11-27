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

const formatValue = (value: string | number | undefined): string => {
  if (value === undefined) return '';

  const numValue = Number(value);

  if (isNaN(numValue)) {
    return String(value);
  }

  if (numValue >= 0 && numValue <= 65535 && Number.isInteger(numValue)) {
    const hex = `0x${numValue.toString(16).toUpperCase().padStart(4, '0')}`;
    return `${formatNumber(numValue)} (${hex})`;
  }

  return formatNumber(numValue);
};

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
                  <TableCell align="right">{formatValue(eventTopic.lastValue)}</TableCell>
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
