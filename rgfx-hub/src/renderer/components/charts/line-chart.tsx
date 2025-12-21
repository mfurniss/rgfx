/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import React from 'react';
import { Box, Typography } from '@mui/material';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  type TooltipProps,
} from 'recharts';
import { format } from 'date-fns';

const formatTime = (timestamp: number): string => format(timestamp, 'h:mm a');
const formatTimeWithSeconds = (timestamp: number): string => format(timestamp, 'h:mm:ss a');

interface CustomTooltipProps extends TooltipProps<number, string> {
  formatter?: (value: number) => string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label, formatter }) => {
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
        <Typography key={entry.dataKey} variant="body2" sx={{ color: entry.color }}>
          {formatter && entry.value !== undefined ? formatter(entry.value) : entry.value}
        </Typography>
      ))}
    </Box>
  );
};

const getCssVar = (varName: string): string => {
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
};

const CHART_HEIGHT = 144;
const AXIS_WIDTH = 65;

interface LineChartProps<T> {
  title: string;
  data: T[];
  dataKey: keyof T & string;
  color: string;
  domain: [number | string, number | string];
  tickFormatter: (value: number) => string;
  tooltipFormatter: (value: number) => string;
}

export function LineChart<T extends { time: number }>({
  title,
  data,
  dataKey,
  color,
  domain,
  tickFormatter,
  tooltipFormatter,
}: LineChartProps<T>): React.ReactElement {
  const axisColor = getCssVar('--mui-palette-text-primary');
  const tickStyle = { fontSize: 12, fill: axisColor };

  return (
    <Box sx={{ bgcolor: 'background.paper', borderRadius: 1, p: 1 }}>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
        {title}
      </Typography>
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <RechartsLineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
          <XAxis
            dataKey="time"
            tickFormatter={formatTime}
            tick={tickStyle}
            stroke={axisColor}
            tickLine={false}
            axisLine={false}
            minTickGap={50}
            padding={{ left: 0, right: 0 }}
          />
          <YAxis
            domain={domain}
            tickFormatter={tickFormatter}
            width={AXIS_WIDTH}
            tick={tickStyle}
            stroke={axisColor}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip formatter={tooltipFormatter} />} />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={true}
            animationDuration={300}
            animationEasing="ease-out"
          />
        </RechartsLineChart>
      </ResponsiveContainer>
    </Box>
  );
}
