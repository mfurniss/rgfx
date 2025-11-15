import React, { useState, useEffect } from "react";
import { Paper, Typography, Box, Chip, Button, Tooltip } from "@mui/material";
import {
  Memory as MemoryIcon,
  Router as RouterIcon,
  Lightbulb as LightbulbIcon,
  Speed as SpeedIcon,
  QueryStats as QueryStatsIcon,
  Science as ScienceIcon,
} from "@mui/icons-material";
import type { Driver } from "~/src/types";
import InfoSection, { type InfoRowData } from "./components/info-section";
import { formatBytes, formatUptime, formatTimestamp } from "./utils/formatters";
import { UI_TIMESTAMP_UPDATE_INTERVAL_MS } from "~/src/config/constants";

interface DriverCardProps {
  driver: Driver;
}

const DriverCard: React.FC<DriverCardProps> = ({ driver }) => {
  const { sysInfo } = driver;
  const [now, setNow] = useState(Date.now());
  const [testRequestPending, setTestRequestPending] = useState(false);

  // Update every second for live timestamps and uptime
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, UI_TIMESTAMP_UPDATE_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // Clear pending state when driver's testActive state changes
  useEffect(() => {
    setTestRequestPending(false);
  }, [driver.testActive]);

  const handleTestToggle = () => {
    // Prevent rapid clicks while request is in flight
    if (testRequestPending) {
      return;
    }

    // Toggle based on current state - if undefined, default to false (turning on)
    const newTestMode = !(driver.testActive ?? false);

    // Mark request as pending (UI will reconcile when driver confirms)
    setTestRequestPending(true);

    // Send command - UI will update when driver publishes state change
    void window.rgfx.testDriverLEDs(driver.id, newTestMode);
  };

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
    {
      label: "Display Connected",
      value: sysInfo.hasDisplay ? "Yes (OLED)" : "No",
    },
    ...(sysInfo.firmwareVersion
      ? [{ label: "Firmware Version", value: sysInfo.firmwareVersion }]
      : []),
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

  // LED configuration from Hub's resolved hardware + driver settings
  const hardware = driver.resolvedHardware;
  const ledConfig = driver.ledConfig;
  const ledRows: InfoRowData[] = hardware
    ? [
        { label: "Hardware", value: hardware.name },
        { label: "Description", value: hardware.description ?? "Not set" },
        { label: "SKU", value: hardware.sku ?? "Not set" },
        ...(hardware.asin ? [{ label: "ASIN", value: hardware.asin }] : []),
        { label: "Layout", value: hardware.layout },
        { label: "LED Count", value: hardware.count },
        {
          label: "Matrix Size",
          value: hardware.layout !== "strip"
            ? `${hardware.width ?? 0} × ${hardware.height ?? 0}`
            : "N/A",
        },
        ...(ledConfig ? [{ label: "Data Pin", value: ledConfig.pin }] : []),
        { label: "Chipset", value: hardware.chipset ?? "Unknown" },
        { label: "Color Order", value: hardware.colorOrder ?? "Unknown" },
        ...(ledConfig
          ? [
              {
                label: "Max Brightness",
                value: ledConfig.maxBrightness ?? "Not set",
              },
              {
                label: "Brightness Limit",
                value: ledConfig.globalBrightnessLimit ?? "Not set",
              },
              { label: "Dithering", value: ledConfig.dithering ? "Yes" : "No" },
            ]
          : []),
      ]
    : [];

  const statsRows: InfoRowData[] = [
    { label: "Driver Uptime", value: formatUptime(currentUptime) },
    { label: "Hub First Seen", value: formatTimestamp(driver.firstSeen, now) },
    { label: "Hub Last Seen", value: formatTimestamp(driver.lastSeen, now) },
    { label: "MQTT Messages", value: driver.stats.mqttMessagesReceived },
    { label: "MQTT Errors", value: driver.stats.mqttMessagesFailed },
    { label: "UDP Packets Sent", value: driver.stats.udpMessagesSent },
    { label: "UDP Send Errors", value: driver.stats.udpMessagesFailed },
  ];

  // Generate tooltip text based on layout type
  const getTestTooltip = () => {
    if (!hardware) {
      return "Displays a test pattern to validate LED hardware and wiring";
    }

    if (hardware.layout === "strip") {
      return "Strip: 4 segments in Red, Green, Blue, Yellow (25% each)";
    } else {
      return "Matrix: 4 quadrants - Top-Left: Red, Top-Right: Green, Bottom-Left: Blue, Bottom-Right: Yellow";
    }
  };

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
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <Tooltip title={getTestTooltip()} arrow>
            <span>
              <Button
                variant={driver.testActive ? "contained" : "outlined"}
                color={driver.testActive ? "warning" : "primary"}
                size="small"
                startIcon={<ScienceIcon />}
                onClick={handleTestToggle}
                disabled={!driver.connected || testRequestPending}
              >
                {testRequestPending
                  ? "Processing..."
                  : `Test LEDs ${driver.testActive ? "ON" : "OFF"}`}
              </Button>
            </span>
          </Tooltip>
          <Chip
            label={driver.connected ? "Connected" : "Disconnected"}
            color={driver.connected ? "success" : "error"}
            size="small"
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

      {driver.resolvedHardware && ledRows.length > 0 && (
        <InfoSection
          title="LED Configuration"
          icon={<LightbulbIcon fontSize="small" color="action" />}
          rows={ledRows}
          showDivider
        />
      )}

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
