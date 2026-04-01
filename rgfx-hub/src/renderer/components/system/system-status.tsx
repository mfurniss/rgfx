import React, { useState, useEffect } from 'react';
import { Paper, Grid } from '@mui/material';
import SystemStatusItem from './system-status-item';
import { formatBytes, formatNumber, formatUptime } from '@/renderer/utils/formatters';
import { UI_TIMESTAMP_UPDATE_INTERVAL_MS } from '@/config/constants';
import { useAppInfoStore } from '@/renderer/store/app-info-store';
import { useSystemStatusStore } from '@/renderer/store/system-status-store';

/**
 * Displays the overall system status including MQTT broker, UDP server,
 * event reader, and connected drivers count
 */
const SystemStatus: React.FC = () => {
  const status = useSystemStatusStore((state) => state.systemStatus);
  const appInfo = useAppInfoStore((state) => state.appInfo);
  const [now, setNow] = useState(Date.now());

  // Update every second for live uptime
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, UI_TIMESTAMP_UPDATE_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const currentUptime = now - status.hubStartTime;

  const statusItems = [
    { name: 'Version', value: appInfo?.version ?? '...' },
    { name: 'IP Address', value: status.hubIp },
    { name: 'Uptime', value: formatUptime(currentUptime) },
    { name: 'MQTT Broker', value: status.mqttBroker },
    { name: 'Discovery', value: status.discovery },
    { name: 'Event Reader', value: status.eventReader },
    { name: 'Event Log', value: formatBytes(status.eventLogSizeBytes) },
    {
      name: 'Drivers Connected',
      value: `${formatNumber(status.driversConnected)} of ${formatNumber(status.driversTotal)}`,
    },
    { name: 'Events Processed', value: formatNumber(status.eventsProcessed) },
    { name: 'UDP Messages Sent', value: formatNumber(status.udpMessagesSent) },
    { name: 'UDP Errors', value: formatNumber(status.udpMessagesFailed) },
    { name: 'MAME Version', value: status.mameVersion ?? 'not detected' },
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
