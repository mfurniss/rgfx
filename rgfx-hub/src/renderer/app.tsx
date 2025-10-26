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
