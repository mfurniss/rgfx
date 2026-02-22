import log from 'electron-log/main';
import { debounce } from 'lodash-es';
import { eventBus } from '../services/event-bus';
import { getLocalIP } from './network-utils';
import { DISCOVERY_RESTART_DEBOUNCE_MS, IP_CHECK_INTERVAL_MS } from '../config/constants';

/** Interface for MQTT broker methods needed by NetworkManager */
export interface DiscoveryController {
  stopDiscovery(): void;
  restartDiscovery(newIP: string): void;
}

/**
 * Central coordinator for network state management.
 * Listens for network errors and orchestrates recovery.
 * Monitors for IP address changes to detect network switches.
 */
export class NetworkManager {
  private mqtt: DiscoveryController;
  private recoveryTimer?: NodeJS.Timeout;
  private ipCheckInterval?: NodeJS.Timeout;
  private currentIP = '127.0.0.1';

  // Debounce network unreachable handling - only process first event, ignore subsequent
  private debouncedHandleUnreachable = debounce(
    () => {
      this.doHandleNetworkUnreachable();
    },
    DISCOVERY_RESTART_DEBOUNCE_MS,
    { leading: true, trailing: false },
  );

  constructor(mqtt: DiscoveryController) {
    this.mqtt = mqtt;
    this.setupEventListeners();
    this.startIPMonitoring();

    this.initializeIP();
  }

  private initializeIP(): void {
    this.currentIP = getLocalIP();
    log.info(`NetworkManager initialized with IP: ${this.currentIP}`);
  }

  private setupEventListeners(): void {
    eventBus.on('network:error', ({ code }) => {
      if (code === 'ENETUNREACH') {
        this.handleNetworkUnreachable();
      }
    });
  }

  private startIPMonitoring(): void {
    this.ipCheckInterval = setInterval(() => {
      this.checkForIPChange();
    }, IP_CHECK_INTERVAL_MS);
  }

  private checkForIPChange(): void {
    if (this.recoveryTimer) {
      return;
    }

    const newIP = getLocalIP();

    if (newIP !== this.currentIP) {
      log.info(`IP address changed: ${this.currentIP} -> ${newIP}`);
      this.currentIP = newIP;

      if (newIP === '127.0.0.1') {
        // Network went down - handle like ENETUNREACH
        this.handleNetworkUnreachable();
      } else {
        // Network changed to a different IP - restart discovery
        log.info(`Network changed, restarting discovery with IP: ${newIP}`);
        this.mqtt.stopDiscovery();
        this.mqtt.restartDiscovery(newIP);
        eventBus.emit('network:changed', undefined);
      }
    }
  }

  private handleNetworkUnreachable(): void {
    this.debouncedHandleUnreachable();
  }

  private doHandleNetworkUnreachable(): void {
    // Stop discovery immediately to prevent stale broadcasts
    this.mqtt.stopDiscovery();
    eventBus.emit('network:changed', undefined);

    log.info(
      `Network unreachable, discovery stopped. Will check for recovery in ${DISCOVERY_RESTART_DEBOUNCE_MS / 1000}s`,
    );

    this.scheduleRecoveryCheck();
  }

  private scheduleRecoveryCheck(): void {
    this.recoveryTimer = setTimeout(() => {
      this.performRecoveryCheck();
    }, DISCOVERY_RESTART_DEBOUNCE_MS);
  }

  private performRecoveryCheck(): void {
    this.recoveryTimer = undefined;
    const newIP = getLocalIP();

    if (newIP === '127.0.0.1') {
      log.info('Network still unavailable, will retry...');
      this.scheduleRecoveryCheck();
      return;
    }

    this.currentIP = newIP;
    log.info(`Network recovered, restarting discovery with IP: ${newIP}`);
    this.mqtt.restartDiscovery(newIP);
    eventBus.emit('network:changed', undefined);
  }

  stop(): void {
    this.debouncedHandleUnreachable.cancel();

    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
      this.recoveryTimer = undefined;
    }

    if (this.ipCheckInterval) {
      clearInterval(this.ipCheckInterval);
      this.ipCheckInterval = undefined;
    }
  }
}
