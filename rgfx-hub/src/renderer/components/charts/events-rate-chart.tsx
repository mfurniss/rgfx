/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import React, { useEffect, useMemo } from 'react';
import { Paper } from '@mui/material';
import { MultiLineChart } from './multi-line-chart';
import {
  useEventsRateHistoryStore,
  startEventsRateSampling,
  type EventsRateDataPoint,
} from '../../store/events-rate-history-store';
import { DRIVER_CHART_COLORS, CHART_HEIGHT } from '@/config/constants';

interface LineConfig {
  dataKey: string;
  name: string;
  color: string;
}

const EVENTS_RATE_CHART_HEIGHT = CHART_HEIGHT * 1.5;

export const EventsRateChart: React.FC = () => {
  const history = useEventsRateHistoryStore((state) => state.history);
  const knownDrivers = useEventsRateHistoryStore((state) => state.knownDrivers);
  const version = useEventsRateHistoryStore((state) => state.version);

  const historyArray = useMemo(() => history.toArray(), [history, version]);
  const driverIds = useMemo(() => Array.from(knownDrivers).sort(), [knownDrivers]);

  useEffect(() => {
    startEventsRateSampling();
  }, []);

  const lines: LineConfig[] = driverIds.map((id, index) => ({
    dataKey: id,
    name: id,
    color: DRIVER_CHART_COLORS[index % DRIVER_CHART_COLORS.length],
  }));

  if (driverIds.length === 0 || historyArray.length === 0) {
    return null;
  }

  return (
    <Paper sx={{ p: 2 }}>
      <MultiLineChart<EventsRateDataPoint>
        title="Events Per Second"
        data={historyArray}
        lines={lines}
        tickFormatter={(v) => v.toFixed(0)}
        tooltipFormatter={(v) => `${v.toFixed(1)} events/s`}
        height={EVENTS_RATE_CHART_HEIGHT}
      />
    </Paper>
  );
};
