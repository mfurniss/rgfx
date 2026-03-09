import React from 'react';
import { Box, Typography } from '@mui/material';
import { type TooltipProps } from 'recharts';
import { formatTimeWithSeconds } from './chart-utils';

interface CustomTooltipProps extends TooltipProps<number, string> {
  formatter?: (value: number) => string;
  multiLine?: boolean;
}

export const CustomTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  label,
  formatter,
  multiLine,
}) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        px: 1.5,
        py: 0.75,
        boxShadow: 2,
      }}
    >
      <Typography variant="caption" color="text.secondary" display="block">
        {formatTimeWithSeconds(label as number)}
      </Typography>
      {payload.map((entry) => (
        <Typography
          key={entry.dataKey}
          variant="body2"
          sx={{
            color: entry.color,
            ...(multiLine && { display: 'flex', gap: 1 }),
          }}
        >
          {multiLine ? (
            <>
              <Box component="span">{entry.name}:</Box>
              <Box component="span">
                {formatter && entry.value !== undefined ? formatter(entry.value) : entry.value}
              </Box>
            </>
          ) : (
            formatter && entry.value !== undefined ? formatter(entry.value) : entry.value
          )}
        </Typography>
      ))}
    </Box>
  );
};
