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
 * Flexible record structure with required effect name and arbitrary effect-specific properties.
 * The `drivers` property is reserved for selective driver targeting.
 *
 * Examples:
 * - { effect: 'pulse', color: '#FF0000', duration: 300 }
 * - { effect: 'score', value: 12450, player: 'p1', drivers: ['rgfx-driver-0001'] }
 * - { effect: 'wipe', direction: 'left', speed: 200 }
 */
export interface EffectPayload extends Record<string, unknown> {
  /** Semantic effect name (e.g., "score", "player_death", "powerup") */
  effect: string;

  /**
   * Optional array of driver IDs to target (reserved property, not sent via UDP).
   * Driver IDs use sequential format (e.g., "rgfx-driver-0001", "rgfx-driver-0002").
   * If undefined, broadcasts to all connected drivers.
   * If defined, only sends to drivers with matching IDs.
   */
  drivers?: string[];
}

/**
 * Parsed topic structure with pre-split parts
 *
 * Topics follow the format: namespace/subject/property/qualifier
 *
 * Examples:
 * - "pacman/player/score/p1" → { namespace: "pacman", subject: "player", property: "score", qualifier: "p1" }
 * - "galaga/enemy/destroyed" → { namespace: "galaga", subject: "enemy", property: "destroyed", qualifier: undefined }
 * - "rgfx/driver/connected" → { namespace: "rgfx", subject: "driver", property: "connected", qualifier: undefined }
 */
export interface RgfxTopic {
  /** Original raw topic string */
  raw: string;

  /** Namespace (first segment) - Either game name (pacman, galaga) or system namespace (rgfx) */
  namespace?: string;

  /** Subject (second segment) - The entity or concept (player, ghost, enemy, driver) */
  subject?: string;

  /** Property (third segment) - The attribute or state being tracked (score, state, position) */
  property?: string;

  /** Qualifier (fourth segment) - Optional additional context (p1, p2, color name) */
  qualifier?: string;

  /** All topic segments (for custom parsing or advanced use) */
  parts: string[];
}

/**
 * UDP client interface for broadcasting effects to LED drivers
 */
export interface UdpClient {
  /**
   * Broadcast effect to all connected drivers or selective drivers if specified
   * @param payload Effect payload with semantic data. Use payload.drivers to target specific drivers.
   * @returns true (for mapper return convenience)
   */
  broadcast(payload: EffectPayload): boolean;
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
 */
export interface MappingContext {
  /** Broadcast effect to all connected drivers or selective drivers via payload.drivers */
  broadcast(payload: EffectPayload): boolean;

  /** UDP client for sending effects to LED drivers */
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
 * @param topic Parsed topic with pre-split segments
 * @param payload Event payload (e.g., "12450" or JSON string)
 * @param context Mapping context with services
 * @returns true if event was handled (stops cascade), false to continue
 */
export type MappingHandler = (
  topic: RgfxTopic,
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
