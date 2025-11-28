import React, { useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { CssBaseline, ThemeProvider, Box } from '@mui/material';
import { AppLayout } from './components/app-layout';
import { NotificationStack } from './components/notification-stack';
import SystemStatusPage from './pages/system-status-page';
import DriverDetailPage from './pages/driver-detail-page';
import EventMonitorPage from './pages/event-monitor-page';
import FirmwarePage from './pages/firmware-page';
import TestEffectsPage from './pages/test-effects-page';
import AboutPage from './pages/about-page';
import { useDriverStore } from './store/driver-store';
import { useEventStore } from './store/event-store';
import { theme } from './theme';

// Flag to ensure rendererReady is only called once per app lifecycle
let rendererReadyCalled = false;

const App: React.FC = () => {
  // Get actions from Zustand stores
  const onDriverConnected = useDriverStore((state) => state.onDriverConnected);
  const onDriverDisconnected = useDriverStore((state) => state.onDriverDisconnected);
  const onDriverUpdated = useDriverStore((state) => state.onDriverUpdated);
  const onSystemStatusUpdate = useDriverStore((state) => state.onSystemStatusUpdate);
  const onEventTopic = useEventStore((state) => state.onEventTopic);

  useEffect(() => {
    console.log('[APP] Registering IPC listeners');

    // Wire IPC listeners directly to Zustand actions with debug logging
    const unsubConnected = window.rgfx.onDriverConnected((driver) => {
      const ipcReceiveTime = Date.now();
      console.log(
        `[DEBUG] IPC driver:connected received in renderer for ${driver.id} at ${ipcReceiveTime}`,
      );
      onDriverConnected(driver);
      console.log(
        `[DEBUG] onDriverConnected action called for ${driver.id} (elapsed: ${Date.now() - ipcReceiveTime}ms)`,
      );
    });

    const unsubDisconnected = window.rgfx.onDriverDisconnected((driver) => {
      const ipcReceiveTime = Date.now();
      console.log(
        `[DEBUG] IPC driver:disconnected received in renderer for ${driver.id} at ${ipcReceiveTime}`,
      );
      onDriverDisconnected(driver);
      console.log(
        `[DEBUG] onDriverDisconnected action called for ${driver.id} (elapsed: ${Date.now() - ipcReceiveTime}ms)`,
      );
    });

    const unsubUpdated = window.rgfx.onDriverUpdated((driver) => {
      console.log(`[DEBUG] IPC driver:updated received in renderer for ${driver.id}`);
      onDriverUpdated(driver);
    });

    const unsubSystemStatus = window.rgfx.onSystemStatus(onSystemStatusUpdate);

    const unsubEventTopic = window.rgfx.onEventTopic((data) => {
      onEventTopic(data.topic, data.count, data.lastValue);
    });

    // Cleanup function to remove listeners
    return () => {
      console.log('[APP] Cleaning up IPC listeners');
      unsubConnected();
      unsubDisconnected();
      unsubUpdated();
      unsubSystemStatus();
      unsubEventTopic();
    };
  }, [onDriverConnected, onDriverDisconnected, onDriverUpdated, onSystemStatusUpdate, onEventTopic]);

  // Signal renderer ready only once per app lifecycle (not per mount)
  useEffect(() => {
    if (!rendererReadyCalled) {
      console.log('[APP] Signaling renderer ready');
      window.rgfx.rendererReady();
      rendererReadyCalled = true;
    } else {
      console.log('[APP] Skipping rendererReady - already called');
    }
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <HashRouter>
        <Box sx={{ height: '100vh' }}>
          <AppLayout>
            <Routes>
              <Route path="/" element={<SystemStatusPage />} />
              <Route path="/driver/:id" element={<DriverDetailPage />} />
              <Route path="/events" element={<EventMonitorPage />} />
              <Route path="/firmware" element={<FirmwarePage />} />
              <Route path="/test-effects" element={<TestEffectsPage />} />
              <Route path="/about" element={<AboutPage />} />
            </Routes>
          </AppLayout>
        </Box>
        <NotificationStack />
      </HashRouter>
    </ThemeProvider>
  );
};

export default App;
