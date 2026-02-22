import React from 'react';
import { TableRow, TableCell } from '@mui/material';
import { formatNumber } from '../../utils/formatters';

interface EventRowProps {
  topic: string;
  count: number;
  lastValue?: string;
}

const MAX_VALUE_LENGTH = 25;

const truncateValue = (value: string): string => {
  if (value.length <= MAX_VALUE_LENGTH) {
    return value;
  }
  return `${value.slice(0, MAX_VALUE_LENGTH)}…`;
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

export const EventRow = React.memo(function EventRow({
  topic,
  count,
  lastValue,
}: EventRowProps) {
  const handleClick = () => {
    const eventLine = lastValue
      ? `${topic} ${lastValue}`
      : topic;
    void window.rgfx.simulateEvent(eventLine);
  };

  return (
    <TableRow
      onClick={handleClick}
      sx={{
        cursor: 'pointer',
        '&:hover': { backgroundColor: 'action.hover' },
      }}
    >
      <TableCell>{topic}</TableCell>
      <TableCell align="right">{formatNumber(count)}</TableCell>
      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
        {formatValue(lastValue)}
      </TableCell>
    </TableRow>
  );
});
