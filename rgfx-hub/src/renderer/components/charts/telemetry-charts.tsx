import React from 'react';
import { Box, Typography, Divider, Stack, useColorScheme } from '@mui/material';
import { Timeline as TimelineIcon } from '@mui/icons-material';
import { useTelemetryHistoryStore } from '@/renderer/store/telemetry-history-store';
import { formatBytes } from '@/renderer/utils/formatters';
import { LineChart } from './line-chart';
import { getCssVar } from './chart-utils';

interface TelemetryChartsProps {
  driverId: string;
}

interface ChartData {
  time: number;
  usedHeap: number;
  heapSize: number;
  maxAllocHeap: number;
  fps: number;
  fragmentation: number;
}

const TelemetryCharts: React.FC<TelemetryChartsProps> = ({ driverId }) => {
  useColorScheme(); // Ensures component re-renders when color scheme changes

  // Subscribe to version to trigger re-renders when data changes
  const version = useTelemetryHistoryStore((state) => state.version);
  const getHistory = useTelemetryHistoryStore((state) => state.getHistory);

  // Get fresh data on each render (triggered by version changes)
  const dataPoints = getHistory(driverId);

  // Silence unused variable warning - version subscription triggers re-renders
  void version;

  if (dataPoints.length < 2) {
    return null;
  }

  const chartData: ChartData[] = dataPoints.map((dp) => {
    // Fragmentation: percentage of free heap that is NOT in the largest contiguous block
    // 0% = no fragmentation (all free memory is contiguous)
    // Higher % = more fragmented
    // Clamp to 0 if maxAllocHeap > freeHeap (can happen with timing differences)
    const fragmentation =
      dp.freeHeap > 0 && dp.maxAllocHeap <= dp.freeHeap
        ? Math.round((1 - dp.maxAllocHeap / dp.freeHeap) * 100)
        : 0;
    return {
      time: dp.timestamp,
      usedHeap: dp.heapSize - dp.freeHeap,
      heapSize: dp.heapSize,
      maxAllocHeap: dp.maxAllocHeap,
      fps: dp.fps,
      fragmentation,
    };
  });

  // Get max heap size for Y-axis domain (use the most recent value, rounded up to nearest 64KB)
  const rawHeapSize = dataPoints[dataPoints.length - 1]?.heapSize ?? 0;
  const maxHeapSize = Math.ceil(rawHeapSize / 65536) * 65536;

  // Get colors by reading the computed CSS variables (Recharts SVG needs actual values)
  const memoryColor = getCssVar('--mui-palette-info-main');
  const fpsColor = getCssVar('--mui-palette-success-main');
  const fragmentationColor = getCssVar('--mui-palette-warning-main');

  return (
    <>
      <Divider sx={{ my: 2 }} />
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <TimelineIcon fontSize="small" color="action" />
          <Typography variant="subtitle2" fontWeight="bold">
            Telemetry History
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
            {dataPoints.length} samples
          </Typography>
        </Box>

        <Stack spacing={2}>
          <LineChart<ChartData>
            title="Frame Rate (FPS)"
            data={chartData}
            dataKey="fps"
            color={fpsColor}
            domain={['dataMin - 5', 'dataMax + 5']}
            tickFormatter={(v) => Math.round(v).toString()}
            tooltipFormatter={(v) => `${v.toFixed(1)} FPS`}
          />

          <LineChart<ChartData>
            title="Memory Used"
            data={chartData}
            dataKey="usedHeap"
            color={memoryColor}
            domain={[0, maxHeapSize]}
            tickFormatter={(v) => formatBytes(v)}
            tooltipFormatter={formatBytes}
          />

          <LineChart<ChartData>
            title="Heap Fragmentation"
            data={chartData}
            dataKey="fragmentation"
            color={fragmentationColor}
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            tooltipFormatter={(v) => `${v}%`}
          />
        </Stack>
      </Box>
    </>
  );
};

export default TelemetryCharts;
