import { create } from 'zustand';
import { type SystemStatus } from '@/types';
import { notify } from './notification-store';
import { useEventsRateHistoryStore } from './events-rate-history-store';
import { useDriverStore } from './driver-store';

interface SystemStatusStoreState {
  systemStatus: SystemStatus;
  onSystemStatusUpdate: (newStatus: SystemStatus) => void;
}

export const useSystemStatusStore = create<SystemStatusStoreState>()((set, get) => ({
  systemStatus: {
    mqttBroker: 'stopped',
    discovery: 'inactive',
    eventReader: 'stopped',
    driversConnected: 0,
    driversTotal: 0,
    hubIp: 'Unknown',
    eventsProcessed: 0,
    eventLogSizeBytes: 0,
    hubStartTime: 0,
    udpMessagesSent: 0,
    udpMessagesFailed: 0,
    udpStatsByDriver: {},
    systemErrors: [],
    ffmpegAvailable: false,
  },

  onSystemStatusUpdate: (newStatus) => {
    const prevStatus = get().systemStatus;

    // Notify on IP change (skip initial load and transient 'Unknown' states)
    const ipChanged = prevStatus.hubIp !== newStatus.hubIp;
    const bothKnown = prevStatus.hubIp !== 'Unknown' && newStatus.hubIp !== 'Unknown';

    if (ipChanged && bothKnown) {
      notify(`Hub IP address changed to: ${newStatus.hubIp}`, 'info');
    }

    // Notify on new system errors
    if (newStatus.systemErrors.length > prevStatus.systemErrors.length) {
      notify('New system error detected. View details on System Status page.', 'error');
    }

    // Update events rate tracking with per-driver UDP stats
    const connectedDriverIds = useDriverStore.getState()
      .drivers
      .filter((d) => d.state === 'connected')
      .map((d) => d.id);

    useEventsRateHistoryStore.getState().updateFromStatus(
      newStatus.udpStatsByDriver,
      connectedDriverIds,
    );

    set({ systemStatus: newStatus });
  },
}));
