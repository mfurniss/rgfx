import React, { useEffect } from 'react';
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
import DriverCard from './DriverCard';
import SystemStatus from './components/SystemStatus';
import { useDriverStore } from './store/driverStore';

// Create Material UI theme (default theme)
const theme = createTheme();

const App: React.FC = () => {
  // Get state from Zustand store
  const drivers = useDriverStore(state => state.drivers);
  const systemStatus = useDriverStore(state => state.systemStatus);

  // Get actions from Zustand store
  const driverConnected = useDriverStore(state => state.driverConnected);
  const driverDisconnected = useDriverStore(state => state.driverDisconnected);
  const updateSystemStatus = useDriverStore(state => state.updateSystemStatus);

  useEffect(() => {
    // Wire IPC listeners directly to Zustand actions
    window.rgfx.onDriverConnected(driverConnected);
    window.rgfx.onDriverDisconnected(driverDisconnected);
    window.rgfx.onSystemStatus(updateSystemStatus);
  }, [driverConnected, driverDisconnected, updateSystemStatus]);

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
              <SystemStatus status={systemStatus} />
            </Grid>

            {/* Drivers Section */}
            {drivers.length === 0 ? (
              <Grid size={12}>
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                  <Typography color="text.secondary">
                    No drivers discovered yet. Waiting for drivers to connect...
                  </Typography>
                </Paper>
              </Grid>
            ) : (
              drivers.map((driver) => (
                <Grid size={{ xs: 12, md: 6, lg: 4 }} key={driver.id}>
                  <DriverCard driver={driver} />
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
