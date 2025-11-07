import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import {
  CssBaseline,
  ThemeProvider,
  createTheme,
  Container,
  AppBar,
  Toolbar,
  Typography,
  Box,
  Chip,
} from '@mui/material';
import SystemStatus from './components/system-status';
import DriverListPage from './pages/driver-list-page';
import DriverDetailPage from './pages/driver-detail-page';
import { useDriverStore } from './store/driver-store';

// Create Material UI theme (default theme)
const theme = createTheme();

const App: React.FC = () => {
  // Get state from Zustand store
  const systemStatus = useDriverStore(state => state.systemStatus);

  // Get actions from Zustand store
  const onDriverConnected = useDriverStore(state => state.onDriverConnected);
  const onDriverDisconnected = useDriverStore(state => state.onDriverDisconnected);
  const onDriverUpdated = useDriverStore(state => state.onDriverUpdated);
  const onSystemStatusUpdate = useDriverStore(state => state.onSystemStatusUpdate);

  useEffect(() => {
    console.log('[APP] Registering IPC listeners');

    // Wire IPC listeners directly to Zustand actions with debug logging
    const unsubConnected = window.rgfx.onDriverConnected((driver) => {
      const ipcReceiveTime = Date.now();
      console.log(`[DEBUG] IPC driver:connected received in renderer for ${driver.id} at ${ipcReceiveTime}`);
      onDriverConnected(driver);
      console.log(`[DEBUG] onDriverConnected action called for ${driver.id} (elapsed: ${Date.now() - ipcReceiveTime}ms)`);
    });

    const unsubDisconnected = window.rgfx.onDriverDisconnected((driver) => {
      const ipcReceiveTime = Date.now();
      console.log(`[DEBUG] IPC driver:disconnected received in renderer for ${driver.id} at ${ipcReceiveTime}`);
      onDriverDisconnected(driver);
      console.log(`[DEBUG] onDriverDisconnected action called for ${driver.id} (elapsed: ${Date.now() - ipcReceiveTime}ms)`);
    });

    const unsubUpdated = window.rgfx.onDriverUpdated((driver) => {
      console.log(`[DEBUG] IPC driver:updated received in renderer for ${driver.id}`);
      onDriverUpdated(driver);
    });

    const unsubSystemStatus = window.rgfx.onSystemStatus(onSystemStatusUpdate);

    // Signal to main process that renderer is ready to receive initial state
    window.rgfx.rendererReady();

    // Cleanup function to remove listeners
    return () => {
      console.log('[APP] Cleaning up IPC listeners');
      unsubConnected();
      unsubDisconnected();
      unsubUpdated();
      unsubSystemStatus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run once on mount, Zustand actions are stable enough

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
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
            {/* System Status Section - visible on all pages */}
            <Box sx={{ mb: 3 }}>
              <SystemStatus status={systemStatus} />
            </Box>

            {/* Routes */}
            <Routes>
              <Route path="/" element={<DriverListPage />} />
              <Route path="/driver/:id" element={<DriverDetailPage />} />
            </Routes>
          </Container>
        </Box>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;
