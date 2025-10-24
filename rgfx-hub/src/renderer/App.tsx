import React, { useState, useEffect } from 'react';
import {
  CssBaseline,
  ThemeProvider,
  createTheme,
  Container,
  AppBar,
  Toolbar,
  Typography,
  Box,
  Paper,
  Grid,
  Chip,
} from '@mui/material';
import type { Device, SystemStatus } from '../types';
import DeviceCard from './DeviceCard';

// Create Material UI theme (default theme)
const theme = createTheme();

const App: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    mqttBroker: 'stopped',
    udpServer: 'inactive',
    eventReader: 'stopped',
    devicesConnected: 0,
    hubIp: 'Unknown',
  });

  useEffect(() => {
    // Set up IPC listeners
    window.rgfx.onDeviceConnected((device: Device) => {
      setDevices((prev) => {
        // Check if device already exists
        const exists = prev.find((d) => d.id === device.id);
        if (exists) {
          // Update existing device
          return prev.map((d) => (d.id === device.id ? device : d));
        }
        // Add new device
        return [...prev, device];
      });
    });

    window.rgfx.onDeviceDisconnected((device: Device) => {
      setDevices((prev) =>
        prev.map((d) => (d.id === device.id ? device : d))
      );
    });

    window.rgfx.onSystemStatus((status: SystemStatus) => {
      setSystemStatus(status);
    });
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        {/* App Bar */}
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              RGFX Hub
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                {systemStatus.hubIp}
              </Typography>
              <Chip
                label={systemStatus.mqttBroker === 'running' ? 'Hub Connected' : 'Hub Disconnected'}
                color={systemStatus.mqttBroker === 'running' ? 'success' : 'error'}
                size="small"
              />
            </Box>
          </Toolbar>
        </AppBar>

        {/* Main Content */}
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4, flex: 1, overflow: 'auto' }}>
          <Grid container spacing={3}>
            {/* System Status Section */}
            <Grid size={12}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  System Status
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Typography variant="body2" color="text.secondary">
                      MQTT Broker
                    </Typography>
                    <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>
                      {systemStatus.mqttBroker}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Typography variant="body2" color="text.secondary">
                      UDP Server
                    </Typography>
                    <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>
                      {systemStatus.udpServer}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Typography variant="body2" color="text.secondary">
                      Event Reader
                    </Typography>
                    <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>
                      {systemStatus.eventReader}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Typography variant="body2" color="text.secondary">
                      Devices Connected
                    </Typography>
                    <Typography variant="h6">{systemStatus.devicesConnected}</Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* Devices Section */}
            {devices.length === 0 ? (
              <Grid size={12}>
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                  <Typography color="text.secondary">
                    No devices discovered yet. Waiting for drivers to connect...
                  </Typography>
                </Paper>
              </Grid>
            ) : (
              devices.map((device) => (
                <Grid size={{ xs: 12, md: 6, lg: 4 }} key={device.id}>
                  <DeviceCard device={device} />
                </Grid>
              ))
            )}

          </Grid>
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default App;
