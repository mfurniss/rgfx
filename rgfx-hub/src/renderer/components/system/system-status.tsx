import React, { useState, useEffect } from 'react';
import { Paper, Grid } from '@mui/material';
import type { SystemStatus as SystemStatusType } from '@/types';
import SystemStatusItem from './system-status-item';
import { formatNumber, formatUptime } from '../../utils/formatters';
import { UI_TIMESTAMP_UPDATE_INTERVAL_MS } from '@/config/constants';
import { useAppInfoStore } from '../../store/app-info-store';

interface SystemStatusProps {
  status: SystemStatusType;
}

/**
 * Displays the overall system status including MQTT broker, UDP server,
 * event reader, and connected drivers count
 */
const SystemStatus: React.FC<SystemStatusProps> = ({ status }) => {
  const appInfo = useAppInfoStore((state) => state.appInfo);
  const [now, setNow] = useState(Date.now());
  const [eventCount, setEventCount] = useState(status.eventsProcessed);

  // Update every second for live uptime
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, UI_TIMESTAMP_UPDATE_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // Listen for real-time event count updates
  useEffect(() => {
    const unsubscribe = window.rgfx.onEventCount((count) => {
      setEventCount(count);
    });

    return unsubscribe;
  }, []);

  const currentUptime = now - status.hubStartTime;

  const statusItems = [
    { name: 'Version', value: appInfo?.version ?? '...' },
    { name: 'IP Address', value: status.hubIp },
    { name: 'Uptime', value: formatUptime(currentUptime) },
    { name: 'MQTT Broker', value: status.mqttBroker },
    { name: 'UDP Server', value: status.udpServer },
    { name: 'Event Reader', value: status.eventReader },
    {
      name: 'Drivers Connected',
      value: `${formatNumber(status.driversConnected)} of ${formatNumber(status.driversTotal)}`,
    },
    { name: 'Events Processed', value: formatNumber(eventCount) },
  ];

  return (
    <Paper sx={{ p: 2 }}>
      <Grid container spacing={2}>
        {statusItems.map((item) => (
          <SystemStatusItem key={item.name} name={item.name} value={item.value} />
        ))}
      </Grid>
    </Paper>
  );
};

export default SystemStatus;
