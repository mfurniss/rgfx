import React, { useState, useCallback, useMemo } from 'react';
import { Box, Typography, Tooltip as MuiTooltip } from '@mui/material';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  type TooltipProps,
} from 'recharts';
import { format } from 'date-fns';
import { CHART_HEIGHT, DEFAULT_CHART_Y_AXIS_WIDTH } from '@/config/constants';

const formatTime = (timestamp: number): string => format(timestamp, 'h:mm:ss a');
const formatTimeWithSeconds = (timestamp: number): string => format(timestamp, 'h:mm:ss a');

interface LineConfig {
  dataKey: string;
  name: string;
  color: string;
}

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
        <Typography
          key={entry.dataKey}
          variant="body2"
          sx={{ color: entry.color, display: 'flex', gap: 1 }}
        >
          <span>{entry.name}:</span>
          <span>
            {formatter && entry.value !== undefined ? formatter(entry.value) : entry.value}
          </span>
        </Typography>
      ))}
    </Box>
  );
};

const getCssVar = (varName: string): string => {
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
};

interface MultiLineChartProps<T> {
  title: string;
  titleTooltip?: string;
  data: T[];
  lines: LineConfig[];
  tickFormatter: (value: number) => string;
  tooltipFormatter: (value: number) => string;
  height?: number;
  yAxisWidth?: number;
}

export function MultiLineChart<T extends { time: number }>({
  title,
  titleTooltip,
  data,
  lines,
  tickFormatter,
  tooltipFormatter,
  height = CHART_HEIGHT,
  yAxisWidth = DEFAULT_CHART_Y_AXIS_WIDTH,
}: MultiLineChartProps<T>): React.ReactElement {
  const axisColor = getCssVar('--mui-palette-text-primary');
  const tickStyle = { fontSize: 12, fill: axisColor };
  const [hoveredLine, setHoveredLine] = useState<string | null>(null);

  // Calculate integer ticks based on data max to avoid duplicate tick labels
  const yAxisTicks = useMemo(() => {
    if (data.length === 0) {
      return [0];
    }

    const dataKeys = lines.map((l) => l.dataKey);
    let maxValue = 0;

    for (const point of data) {
      for (const key of dataKeys) {
        const value = (point as Record<string, number>)[key];

        if (typeof value === 'number' && value > maxValue) {
          maxValue = value;
        }
      }
    }

    const maxTick = Math.max(1, Math.ceil(maxValue));
    const ticks: number[] = [];

    for (let i = 0; i <= maxTick; i++) {
      ticks.push(i);
    }

    return ticks;
  }, [data, lines]);

  const handleLegendMouseEnter = useCallback((data: unknown) => {
    const payload = data as { dataKey?: string | number };

    if (payload.dataKey !== undefined) {
      setHoveredLine(String(payload.dataKey));
    }
  }, []);

  const handleLegendMouseLeave = useCallback(() => {
    setHoveredLine(null);
  }, []);

  const getLineOpacity = (dataKey: string): number => {
    if (hoveredLine === null) {
      return 1;
    }

    return dataKey === hoveredLine ? 1 : 0.15;
  };

  const titleElement = (
    <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
      {title}
    </Typography>
  );

  return (
    <Box sx={{ bgcolor: 'background.paper', borderRadius: 1, p: 1 }}>
      {titleTooltip ? (
        <MuiTooltip title={titleTooltip} placement="top-start">
          {titleElement}
        </MuiTooltip>
      ) : (
        titleElement
      )}
      <Box
        sx={{
          isolation: 'isolate',
          '& .recharts-line-curve': {
            mixBlendMode: 'screen',
          },
        }}
      >
        <ResponsiveContainer width="100%" height={height}>
          <RechartsLineChart
            data={data}
            margin={{ top: 5, right: 10, bottom: 5, left: 0 }}
          >
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
              domain={[0, yAxisTicks[yAxisTicks.length - 1]]}
              ticks={yAxisTicks}
              tickFormatter={tickFormatter}
              width={yAxisWidth}
              tick={tickStyle}
              stroke={axisColor}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip formatter={tooltipFormatter} />} />
            <Legend
              wrapperStyle={{ fontSize: 12, cursor: 'pointer' }}
              iconType="line"
              iconSize={12}
              onMouseEnter={handleLegendMouseEnter}
              onMouseLeave={handleLegendMouseLeave}
            />
            {lines.map((line) => (
              <Line
                key={line.dataKey}
                type="monotone"
                dataKey={line.dataKey}
                name={line.name}
                stroke={line.color}
                strokeWidth={2}
                strokeOpacity={getLineOpacity(line.dataKey)}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </RechartsLineChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
}
