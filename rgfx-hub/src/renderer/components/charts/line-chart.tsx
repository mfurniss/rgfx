import React from 'react';
import { Box, Typography } from '@mui/material';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { CHART_HEIGHT, DEFAULT_CHART_Y_AXIS_WIDTH } from '@/config/constants';
import { formatTime, getCssVar } from './chart-utils';
import { CustomTooltip } from './chart-tooltip';

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
            width={DEFAULT_CHART_Y_AXIS_WIDTH}
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
