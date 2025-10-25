import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Chip,
  Divider,
  Stack,
} from '@mui/material';
import {
  Memory as MemoryIcon,
  Router as RouterIcon,
  Lightbulb as LightbulbIcon,
  Speed as SpeedIcon,
  QueryStats as QueryStatsIcon,
} from '@mui/icons-material';
import type { Device } from '../types';

interface DeviceCardProps {
  device: Device;
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
};

const formatUptime = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
};

const formatTimestamp = (timestamp: number, currentTime: number): string => {
  const diff = currentTime - timestamp;
  const seconds = Math.floor(diff / 1000);

  if (seconds < 60) {
    return `${seconds}s ago`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const InfoRow: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
    <Typography variant="body2" color="text.secondary">
      {label}:
    </Typography>
    <Typography variant="body2" fontWeight="medium">
      {value}
    </Typography>
  </Box>
);

const DeviceCard: React.FC<DeviceCardProps> = ({ device }) => {
  const { sysInfo } = device;
  const [now, setNow] = useState(Date.now());

  // Update every second for live timestamps and uptime
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => { clearInterval(interval); };
  }, []);

  if (!sysInfo) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">{device.name}</Typography>
        <Typography color="text.secondary">No system info available</Typography>
      </Paper>
    );
  }

  // Calculate current uptime based on initial uptimeMs from device
  const deviceUptimeAtSnapshot = sysInfo.uptimeMs;
  const timeOfSnapshot = device.lastSeen;
  const timeSinceSnapshot = now - timeOfSnapshot;
  const currentUptime = device.connected
    ? deviceUptimeAtSnapshot + timeSinceSnapshot
    : deviceUptimeAtSnapshot;

  return (
    <Paper sx={{ p: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">{device.name}</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip
            label={device.connected ? 'Connected' : 'Disconnected'}
            color={device.connected ? 'success' : 'error'}
            size="small"
          />
          <Chip label={device.type} size="small" color="primary" variant="outlined" />
        </Box>
      </Box>

      {/* Network Information */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <RouterIcon fontSize="small" color="action" />
          <Typography variant="subtitle2" fontWeight="bold">
            Network
          </Typography>
        </Box>
        <Stack spacing={0.5}>
          <InfoRow label="IP Address" value={sysInfo.ip} />
          <InfoRow label="MAC Address" value={sysInfo.mac} />
          <InfoRow label="Hostname" value={sysInfo.hostname} />
          <InfoRow label="SSID" value={sysInfo.ssid} />
          <InfoRow label="Signal (RSSI)" value={`${sysInfo.rssi} dBm`} />
        </Stack>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Chip Information */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <SpeedIcon fontSize="small" color="action" />
          <Typography variant="subtitle2" fontWeight="bold">
            Hardware
          </Typography>
        </Box>
        <Stack spacing={0.5}>
          <InfoRow label="Chip Model" value={sysInfo.chipModel} />
          <InfoRow label="Chip Revision" value={sysInfo.chipRevision} />
          <InfoRow label="CPU Cores" value={sysInfo.chipCores} />
          <InfoRow label="CPU Frequency" value={`${sysInfo.cpuFreqMHz} MHz`} />
          <InfoRow label="Flash Size" value={formatBytes(sysInfo.flashSize)} />
          <InfoRow label="Flash Speed" value={`${sysInfo.flashSpeed / 1000000} MHz`} />
        </Stack>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Memory Information */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <MemoryIcon fontSize="small" color="action" />
          <Typography variant="subtitle2" fontWeight="bold">
            Memory
          </Typography>
        </Box>
        <Stack spacing={0.5}>
          <InfoRow
            label="Free Heap"
            value={`${formatBytes(sysInfo.freeHeap)} / ${formatBytes(sysInfo.heapSize)}`}
          />
          {sysInfo.psramSize > 0 && (
            <InfoRow
              label="Free PSRAM"
              value={`${formatBytes(sysInfo.freePsram)} / ${formatBytes(sysInfo.psramSize)}`}
            />
          )}
          <InfoRow
            label="Free Sketch Space"
            value={formatBytes(sysInfo.freeSketchSpace)}
          />
          <InfoRow label="SDK Version" value={sysInfo.sdkVersion} />
        </Stack>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* LED Configuration */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <LightbulbIcon fontSize="small" color="action" />
          <Typography variant="subtitle2" fontWeight="bold">
            LED Configuration
          </Typography>
        </Box>
        <Stack spacing={0.5}>
          <InfoRow label="LED Count" value={sysInfo.ledCount} />
          <InfoRow label="Matrix Size" value={`${sysInfo.matrixWidth} × ${sysInfo.matrixHeight}`} />
          <InfoRow label="Data Pin" value={sysInfo.ledDataPin} />
          <InfoRow
            label="Brightness"
            value={`${sysInfo.ledBrightness} / ${sysInfo.ledMaxBrightness}`}
          />
          <InfoRow label="Chipset" value={sysInfo.ledChipset} />
          <InfoRow label="Color Order" value={sysInfo.ledColorOrder} />
        </Stack>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Statistics */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <QueryStatsIcon fontSize="small" color="action" />
          <Typography variant="subtitle2" fontWeight="bold">
            Statistics
          </Typography>
        </Box>
        <Stack spacing={0.5}>
          <InfoRow label="Device Uptime" value={formatUptime(currentUptime)} />
          <InfoRow label="Hub First Seen" value={formatTimestamp(device.firstSeen, now)} />
          <InfoRow label="Hub Last Seen" value={formatTimestamp(device.lastSeen, now)} />
          <InfoRow label="MQTT Messages" value={device.stats.mqttMessagesReceived} />
          <InfoRow label="MQTT Errors" value={device.stats.mqttMessagesFailed} />
          <InfoRow label="UDP Packets Sent" value={device.stats.udpMessagesSent} />
          <InfoRow label="UDP Send Errors" value={device.stats.udpMessagesFailed} />
        </Stack>
      </Box>
    </Paper>
  );
};

export default DeviceCard;
