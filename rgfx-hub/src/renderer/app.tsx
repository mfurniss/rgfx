import React, { useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { CssBaseline, ThemeProvider, Container, Box } from '@mui/material';
import SystemStatus from './components/system-status';
import DriverListPage from './pages/driver-list-page';
import DriverDetailPage from './pages/driver-detail-page';
import { useDriverStore } from './store/driver-store';
import { theme } from './theme';
import styles from './app.module.css';

const App: React.FC = () => {
  const randomHue = Math.floor(Math.random() * 360);

  // Get state from Zustand store
  const systemStatus = useDriverStore((state) => state.systemStatus);

  // Get actions from Zustand store
  const onDriverConnected = useDriverStore((state) => state.onDriverConnected);
  const onDriverDisconnected = useDriverStore((state) => state.onDriverDisconnected);
  const onDriverUpdated = useDriverStore((state) => state.onDriverUpdated);
  const onSystemStatusUpdate = useDriverStore((state) => state.onSystemStatusUpdate);

  useEffect(() => {
    console.log('[APP] Registering IPC listeners');

    // Wire IPC listeners directly to Zustand actions with debug logging
    const unsubConnected = window.rgfx.onDriverConnected((driver) => {
      const ipcReceiveTime = Date.now();
      console.log(
        `[DEBUG] IPC driver:connected received in renderer for ${driver.id} at ${ipcReceiveTime}`
      );
      onDriverConnected(driver);
      console.log(
        `[DEBUG] onDriverConnected action called for ${driver.id} (elapsed: ${Date.now() - ipcReceiveTime}ms)`
      );
    });

    const unsubDisconnected = window.rgfx.onDriverDisconnected((driver) => {
      const ipcReceiveTime = Date.now();
      console.log(
        `[DEBUG] IPC driver:disconnected received in renderer for ${driver.id} at ${ipcReceiveTime}`
      );
      onDriverDisconnected(driver);
      console.log(
        `[DEBUG] onDriverDisconnected action called for ${driver.id} (elapsed: ${Date.now() - ipcReceiveTime}ms)`
      );
    });

    const unsubUpdated = window.rgfx.onDriverUpdated((driver) => {
      console.log(`[DEBUG] IPC driver:updated received in renderer for ${driver.id}`);
      onDriverUpdated(driver);
    });

    const unsubSystemStatus = window.rgfx.onSystemStatus(onSystemStatusUpdate);

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

  // Signal renderer ready in separate effect that doesn't cleanup
  useEffect(() => {
    console.log('[APP] Signaling renderer ready');
    window.rgfx.rendererReady();
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <HashRouter>
        <Box
          className={styles.container}
          style={{ '--hue': randomHue } as React.CSSProperties}
          sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}
        >
          {/* Main Content */}
          <Container maxWidth="md" disableGutters sx={{ flex: 1, overflow: 'auto', p: 2 }}>
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
      </HashRouter>
    </ThemeProvider>
  );
};

export default App;
