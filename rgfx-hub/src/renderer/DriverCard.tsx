import React, { useState, useEffect } from "react";
import { Paper, Typography, Box, Chip } from "@mui/material";
import {
  Memory as MemoryIcon,
  Router as RouterIcon,
  Lightbulb as LightbulbIcon,
  Speed as SpeedIcon,
  QueryStats as QueryStatsIcon,
} from "@mui/icons-material";
import type { Driver } from "../types";
import InfoSection, { type InfoRowData } from "./components/InfoSection";
import { formatBytes, formatUptime, formatTimestamp } from "./utils/formatters";

interface DriverCardProps {
  driver: Driver;
}

const DriverCard: React.FC<DriverCardProps> = ({ driver }) => {
  const { sysInfo } = driver;
  const [now, setNow] = useState(Date.now());

  // Update every second for live timestamps and uptime
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  if (!sysInfo) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">{driver.name}</Typography>
        <Typography color="text.secondary">No system info available</Typography>
      </Paper>
    );
  }

  // Calculate current uptime based on initial uptimeMs from driver
  const driverUptimeAtSnapshot = sysInfo.uptimeMs;
  const timeOfSnapshot = driver.lastSeen;
  const timeSinceSnapshot = now - timeOfSnapshot;
  const currentUptime = driver.connected
    ? driverUptimeAtSnapshot + timeSinceSnapshot
    : driverUptimeAtSnapshot;

  // Prepare data arrays for InfoSection components
  const networkRows: InfoRowData[] = [
    { label: "IP Address", value: sysInfo.ip },
    { label: "MAC Address", value: sysInfo.mac },
    { label: "Hostname", value: sysInfo.hostname },
    { label: "SSID", value: sysInfo.ssid },
    { label: "Signal (RSSI)", value: `${sysInfo.rssi} dBm` },
  ];

  const hardwareRows: InfoRowData[] = [
    { label: "Chip Model", value: sysInfo.chipModel },
    { label: "Chip Revision", value: sysInfo.chipRevision },
    { label: "CPU Cores", value: sysInfo.chipCores },
    { label: "CPU Frequency", value: `${sysInfo.cpuFreqMHz} MHz` },
    { label: "Flash Size", value: formatBytes(sysInfo.flashSize) },
    { label: "Flash Speed", value: `${sysInfo.flashSpeed / 1000000} MHz` },
  ];

  const memoryRows: InfoRowData[] = [
    {
      label: "Free Heap",
      value: `${formatBytes(sysInfo.freeHeap)} / ${formatBytes(sysInfo.heapSize)}`,
    },
    ...(sysInfo.psramSize > 0
      ? [
          {
            label: "Free PSRAM",
            value: `${formatBytes(sysInfo.freePsram)} / ${formatBytes(sysInfo.psramSize)}`,
          },
        ]
      : []),
    {
      label: "Free Sketch Space",
      value: formatBytes(sysInfo.freeSketchSpace),
    },
    { label: "SDK Version", value: sysInfo.sdkVersion },
  ];

  const ledRows: InfoRowData[] = [
    { label: "LED Count", value: sysInfo.ledCount },
    {
      label: "Matrix Size",
      value: `${sysInfo.matrixWidth} × ${sysInfo.matrixHeight}`,
    },
    { label: "Data Pin", value: sysInfo.ledDataPin },
    {
      label: "Brightness",
      value: `${sysInfo.ledBrightness} / ${sysInfo.ledMaxBrightness}`,
    },
    { label: "Chipset", value: sysInfo.ledChipset },
    { label: "Color Order", value: sysInfo.ledColorOrder },
  ];

  const statsRows: InfoRowData[] = [
    { label: "Driver Uptime", value: formatUptime(currentUptime) },
    { label: "Hub First Seen", value: formatTimestamp(driver.firstSeen, now) },
    { label: "Hub Last Seen", value: formatTimestamp(driver.lastSeen, now) },
    { label: "MQTT Messages", value: driver.stats.mqttMessagesReceived },
    { label: "MQTT Errors", value: driver.stats.mqttMessagesFailed },
    { label: "UDP Packets Sent", value: driver.stats.udpMessagesSent },
    { label: "UDP Send Errors", value: driver.stats.udpMessagesFailed },
  ];

  return (
    <Paper sx={{ p: 2 }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
        }}
      >
        <Typography variant="h6">{driver.name}</Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Chip
            label={driver.connected ? "Connected" : "Disconnected"}
            color={driver.connected ? "success" : "error"}
            size="small"
          />
          <Chip
            label={driver.type}
            size="small"
            color="primary"
            variant="outlined"
          />
        </Box>
      </Box>

      {/* Information Sections */}
      <InfoSection
        title="Network"
        icon={<RouterIcon fontSize="small" color="action" />}
        rows={networkRows}
      />

      <InfoSection
        title="Hardware"
        icon={<SpeedIcon fontSize="small" color="action" />}
        rows={hardwareRows}
        showDivider
      />

      <InfoSection
        title="Memory"
        icon={<MemoryIcon fontSize="small" color="action" />}
        rows={memoryRows}
        showDivider
      />

      <InfoSection
        title="LED Configuration"
        icon={<LightbulbIcon fontSize="small" color="action" />}
        rows={ledRows}
        showDivider
      />

      <InfoSection
        title="Statistics"
        icon={<QueryStatsIcon fontSize="small" color="action" />}
        rows={statsRows}
        showDivider
      />
    </Paper>
  );
};

export default DriverCard;
