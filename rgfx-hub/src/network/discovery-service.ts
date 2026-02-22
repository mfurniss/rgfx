/**
 * Configuration passed to discovery services when starting.
 */
export interface DiscoveryServiceConfig {
  /** The port the MQTT broker is listening on */
  mqttPort: number;
  /** The local IP address to advertise */
  localIP: string;
}

/**
 * Interface for broker discovery services.
 * Discovery services advertise the MQTT broker to ESP32 drivers.
 */
export interface DiscoveryService {
  /**
   * Start the discovery service with the given configuration.
   */
  start(config: DiscoveryServiceConfig): void;

  /**
   * Stop the discovery service and clean up resources.
   */
  stop(): void;
}
