import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { CssBaseline, ThemeProvider, Box } from '@mui/material';
import { AnimatePresence } from 'framer-motion';
import { AppLayout } from './components/app-layout';
import { NotificationStack } from './components/notification-stack';
import { PageTransition } from './components/page-transition';
import SystemStatusPage from './pages/system-status-page';
import DriverDetailPage from './pages/driver-detail-page';
import DriverConfigPage from './pages/driver-config-page';
import EventMonitorPage from './pages/event-monitor-page';
import FirmwarePage from './pages/firmware-page';
import EffectsPlaygroundPage from './pages/effects-playground-page';
import SimulatorPage from './pages/simulator-page';
import GamesPage from './pages/games-page';
import SettingsPage from './pages/settings-page';
import AboutPage from './pages/about-page';
import SupportPage from './pages/support-page';
import { useDriverStore } from './store/driver-store';
import { useEventStore } from './store/event-store';
import { useAppInfoStore } from './store/app-info-store';
import { useSimulatorAutoTrigger } from './hooks/use-simulator-auto-trigger';
import { theme } from './theme';

// Flag to ensure rendererReady is only called once per app lifecycle
let rendererReadyCalled = false;

// Animated routes component - must be inside HashRouter to use useLocation
const AnimatedRoutes: React.FC = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><SystemStatusPage /></PageTransition>} />
        <Route path="/driver/:mac" element={<PageTransition><DriverDetailPage /></PageTransition>} />
        <Route path="/driver/:mac/config" element={<PageTransition><DriverConfigPage /></PageTransition>} />
        <Route path="/games" element={<PageTransition><GamesPage /></PageTransition>} />
        <Route path="/events" element={<PageTransition><EventMonitorPage /></PageTransition>} />
        <Route path="/firmware" element={<PageTransition><FirmwarePage /></PageTransition>} />
        <Route path="/effects-playground" element={<PageTransition><EffectsPlaygroundPage /></PageTransition>} />
        <Route path="/simulator" element={<PageTransition><SimulatorPage /></PageTransition>} />
        <Route path="/settings" element={<PageTransition><SettingsPage /></PageTransition>} />
        <Route path="/support" element={<PageTransition><SupportPage /></PageTransition>} />
        <Route path="/about" element={<PageTransition><AboutPage /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
};

const App: React.FC = () => {
  // Get actions from Zustand stores
  const onDriverConnected = useDriverStore((state) => state.onDriverConnected);

  // Run simulator auto-trigger at app level so it persists across navigation
  useSimulatorAutoTrigger();
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
  }, [
    onDriverConnected, onDriverDisconnected, onDriverUpdated, onSystemStatusUpdate, onEventTopic,
  ]);

  // Signal renderer ready and get app info only once per app lifecycle (not per mount)
  const getAppInfo = useAppInfoStore((state) => state.getAppInfo);

  useEffect(() => {
    if (!rendererReadyCalled) {
      console.log('[APP] Signaling renderer ready');
      window.rgfx.rendererReady();
      void getAppInfo();
      rendererReadyCalled = true;
    } else {
      console.log('[APP] Skipping rendererReady - already called');
    }
  }, [getAppInfo]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <HashRouter>
        <Box sx={{ height: '100vh' }}>
          <AppLayout>
            <AnimatedRoutes />
          </AppLayout>
        </Box>
        <NotificationStack />
      </HashRouter>
    </ThemeProvider>
  );
};

export default App;
