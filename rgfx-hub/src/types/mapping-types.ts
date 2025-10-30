/**
 * Type definitions for the RGFX event mapping system
 *
 * The mapping system transforms raw game events into semantic LED effects
 * using a cascading precedence system: game → subject → pattern → default
 */

import type { DriverRegistry } from '../driver-registry';

/**
 * Effect payload sent to LED drivers via UDP
 *
 * Contains semantic effect name plus effect-specific data and optional hints
 * for visual rendering (color, duration, pattern, etc.)
 */
export interface EffectPayload {
  /** Semantic effect name (e.g., "score", "player_death", "powerup") */
  effect: string;

  /** Effect-specific data (flexible schema per effect type) */
  [key: string]: unknown;

  /** Optional properties for effect rendering */
  props?: {
    /** Color in hex format (e.g., "#FF0000") */
    color?: string;
    /** Duration in milliseconds */
    duration?: number;
    /** Additional effect properties */
    [key: string]: unknown;
  };
}

/**
 * UDP client interface for broadcasting effects to LED drivers
 */
export interface UdpClient {
  /**
   * Broadcast effect to all connected drivers
   * @param payload Effect payload with semantic data
   * @returns true (for mapper return convenience)
   */
  broadcast(payload: EffectPayload): boolean;

  /**
   * Send effect to a specific driver by ID
   * @param driverId Driver MAC address or ID
   * @param payload Effect payload
   * @returns true (for mapper return convenience)
   */
  send(driverId: string, payload: EffectPayload): boolean;

  /**
   * Send effect to multiple specific drivers
   * @param driverIds Array of driver IDs
   * @param payload Effect payload
   * @returns true (for mapper return convenience)
   */
  sendToDrivers(driverIds: string[], payload: EffectPayload): boolean;
}

/**
 * MQTT client interface for publishing to smart home or other MQTT clients
 */
export interface MqttClient {
  /**
   * Publish message to MQTT topic
   * @param topic MQTT topic path
   * @param payload Any JSON-serializable payload
   * @param qos Quality of Service level (0, 1, or 2)
   */
  publish(topic: string, payload: unknown, qos?: 0 | 1 | 2): Promise<void>;
}

/**
 * HTTP client interface for calling external REST APIs
 */
export interface HttpClient {
  /**
   * HTTP GET request
   * @param url Target URL
   * @param options Optional fetch options
   */
  get(url: string, options?: RequestInit): Promise<Response>;

  /**
   * HTTP POST request
   * @param url Target URL
   * @param body Request body (will be JSON serialized)
   * @param options Optional fetch options
   */
  post(url: string, body: unknown, options?: RequestInit): Promise<Response>;

  /**
   * HTTP PUT request
   * @param url Target URL
   * @param body Request body (will be JSON serialized)
   * @param options Optional fetch options
   */
  put(url: string, body: unknown, options?: RequestInit): Promise<Response>;

  /**
   * HTTP DELETE request
   * @param url Target URL
   * @param options Optional fetch options
   */
  delete(url: string, options?: RequestInit): Promise<Response>;
}

/**
 * State store interface for mappers to persist data across events
 *
 * Useful for tracking game state, debouncing, rate limiting, etc.
 */
export interface StateStore {
  /**
   * Get value by key
   * @param key Storage key
   * @returns Stored value or undefined if not found
   */
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
  get<T>(key: string): T | undefined;

  /**
   * Set value for key
   * @param key Storage key
   * @param value Value to store
   */
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
  set<T>(key: string, value: T): void;

  /**
   * Check if key exists
   * @param key Storage key
   */
  has(key: string): boolean;

  /**
   * Delete key
   * @param key Storage key
   */
  delete(key: string): void;

  /**
   * Clear all stored data
   */
  clear(): void;
}

/**
 * Logger interface for mappers to log debug/info/warnings/errors
 */
export interface Logger {
  /**
   * Log debug message (verbose, development only)
   */
  debug(message: string, ...args: unknown[]): void;

  /**
   * Log informational message
   */
  info(message: string, ...args: unknown[]): void;

  /**
   * Log warning message
   */
  warn(message: string, ...args: unknown[]): void;

  /**
   * Log error message
   */
  error(message: string, ...args: unknown[]): void;
}

/**
 * Context provided to all mapping handlers
 *
 * Contains all services and utilities mappers can use to interact with
 * the system (send effects, publish MQTT, store state, log messages)
 *
 * Note: UDP broadcast methods are flattened for convenience (most common operations)
 */
export interface MappingContext {
  /** Broadcast effect to all connected drivers (returns true for mapper convenience) */
  broadcast(payload: EffectPayload): boolean;

  /** Send effect to specific driver (returns true for mapper convenience) */
  send(driverId: string, payload: EffectPayload): boolean;

  /** Send effect to multiple drivers (returns true for mapper convenience) */
  sendToDrivers(driverIds: string[], payload: EffectPayload): boolean;

  /** UDP client for sending effects to LED drivers (still available for advanced use) */
  udp: UdpClient;

  /** MQTT client for publishing to smart home or other clients */
  mqtt: MqttClient;

  /** HTTP client for calling external REST APIs */
  http: HttpClient;

  /** State store for persisting data across events */
  state: StateStore;

  /** Logger for debug/info/warn/error messages */
  log: Logger;

  /** Driver registry for querying connected drivers */
  drivers: DriverRegistry;
}

/**
 * Mapping handler function signature
 *
 * @param topic Event topic (e.g., "pacman/player/score/p1")
 * @param payload Event payload (e.g., "12450" or JSON string)
 * @param context Mapping context with services
 * @returns true if event was handled (stops cascade), false to continue
 */
export type MappingHandler = (
  topic: string,
  payload: string,
  context: MappingContext
) => boolean | Promise<boolean>;

/**
 * Mapping file export structure
 *
 * Each mapper file must export a default object or a named "handle" function
 */
export interface MappingFile {
  /** Handler function */
  handle: MappingHandler;

  /** Optional priority (higher = earlier in cascade) */
  priority?: number;

  /** Optional enable/disable flag */
  enabled?: boolean;
}
