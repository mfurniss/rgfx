import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { CssBaseline, ThemeProvider, Box } from '@mui/material';
import { AnimatePresence } from 'framer-motion';
import { AppLayout } from './components/layout/app-layout';
import { NotificationStack } from './components/common/notification-stack';
import { CriticalErrorModal } from './components/common/critical-error-modal';
import { PageTransition } from './components/layout/page-transition';
import SystemStatusPage from './pages/system-status-page';
import DriversPage from './pages/drivers-page';
import DriverDetailPage from './pages/driver-detail-page';
import DriverConfigPage from './pages/driver-config-page';
import EventMonitorPage from './pages/event-monitor-page';
import FirmwarePage from './pages/firmware-page';
import EffectsPlaygroundPage from './pages/effects-playground-page';
import SimulatorPage from './pages/simulator-page';
import GamesPage from './pages/games-page';
import SettingsPage from './pages/settings-page';
import AboutPage from './pages/about-page';
import HelpPage from './pages/help-page';
import { useDriverStore } from './store/driver-store';
import { useSystemStatusStore } from './store/system-status-store';
import { useEventStore } from './store/event-store';
import { useAppInfoStore } from './store/app-info-store';
import { useUiStore } from './store/ui-store';
import { useSimulatorAutoTrigger } from './hooks/use-simulator-auto-trigger';
import { theme } from './theme';

// Import serial-wifi utility to expose sendWifiCommand to DevTools console
import './utils/serial-wifi';

// Flag to ensure rendererReady is only called once per app lifecycle
let rendererReadyCalled = false;

// Animated routes component - must be inside HashRouter to use useLocation
const AnimatedRoutes: React.FC = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><SystemStatusPage /></PageTransition>} />
        <Route path="/drivers" element={<PageTransition><DriversPage /></PageTransition>} />
        <Route path="/drivers/:mac" element={<PageTransition><DriverDetailPage /></PageTransition>} />
        <Route path="/drivers/:mac/config" element={<PageTransition><DriverConfigPage /></PageTransition>} />
        <Route path="/games" element={<PageTransition><GamesPage /></PageTransition>} />
        <Route path="/events" element={<PageTransition><EventMonitorPage /></PageTransition>} />
        <Route path="/firmware" element={<PageTransition><FirmwarePage /></PageTransition>} />
        <Route path="/effects-playground" element={<PageTransition><EffectsPlaygroundPage /></PageTransition>} />
        <Route path="/simulator" element={<PageTransition><SimulatorPage /></PageTransition>} />
        <Route path="/settings" element={<PageTransition><SettingsPage /></PageTransition>} />
        <Route path="/help" element={<PageTransition><HelpPage /></PageTransition>} />
        <Route path="/about" element={<PageTransition><AboutPage /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
};

// Isolated component that only mounts when a config error exists.
// Subscribes to the error details without burdening the main App render cycle.
const ConfigErrorContent: React.FC = () => {
  const configError = useSystemStatusStore(
    (state) => state.systemStatus.systemErrors.find((e) => e.errorType === 'config'),
  );
  return configError ? <CriticalErrorModal error={configError} /> : null;
};

const App: React.FC = () => {
  // Get actions from Zustand stores (stable references — no re-renders)
  const onDriverConnected = useDriverStore((state) => state.onDriverConnected);
  const onDriverDisconnected = useDriverStore((state) => state.onDriverDisconnected);
  const onDriverUpdated = useDriverStore((state) => state.onDriverUpdated);
  const onDriverRestarting = useDriverStore((state) => state.onDriverRestarting);
  const onDriverDeleted = useDriverStore((state) => state.onDriverDeleted);
  const onSystemStatusUpdate = useSystemStatusStore((state) => state.onSystemStatusUpdate);
  const onEvent = useEventStore((state) => state.onEvent);

  // Boolean selector — only re-renders when a config error appears/disappears
  const hasConfigError = useSystemStatusStore(
    (state) => state.systemStatus.systemErrors.some((e) => e.errorType === 'config'),
  );

  // Run simulator auto-trigger at app level so it persists across navigation
  useSimulatorAutoTrigger();

  useEffect(() => {
    const unsubConnected = window.rgfx.onDriverConnected(onDriverConnected);
    const unsubDisconnected = window.rgfx.onDriverDisconnected(onDriverDisconnected);
    const unsubUpdated = window.rgfx.onDriverUpdated(onDriverUpdated);
    const unsubRestarting = window.rgfx.onDriverRestarting(onDriverRestarting);
    const unsubDeleted = window.rgfx.onDriverDeleted(onDriverDeleted);
    const unsubSystemStatus = window.rgfx.onSystemStatus(onSystemStatusUpdate);
    const unsubEvent = window.rgfx.onEvent(onEvent);

    return () => {
      unsubConnected();
      unsubDisconnected();
      unsubUpdated();
      unsubRestarting();
      unsubDeleted();
      unsubSystemStatus();
      unsubEvent();
    };
  }, [
    onDriverConnected, onDriverDisconnected, onDriverUpdated, onDriverRestarting,
    onDriverDeleted, onSystemStatusUpdate, onEvent,
  ]);

  // Signal renderer ready and get app info only once per app lifecycle (not per mount)
  const getAppInfo = useAppInfoStore((state) => state.getAppInfo);

  useEffect(() => {
    if (!rendererReadyCalled) {
      window.rgfx.rendererReady();
      void getAppInfo();

      // Sync persisted settings to main process
      const { driverFallbackEnabled } = useUiStore.getState();
      void window.rgfx.setDriverFallbackEnabled(driverFallbackEnabled);

      rendererReadyCalled = true;
    }
  }, [getAppInfo]);

  if (hasConfigError) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ConfigErrorContent />
      </ThemeProvider>
    );
  }

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
