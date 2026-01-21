/**
 * Type definitions for the RGFX event transformer system
 *
 * The transformer system transforms raw game events into semantic LED effects
 * using a cascading precedence system: game → subject → pattern → default
 */

import type { DriverRegistry } from '../driver-registry';

/**
 * Result from loading an animated GIF for use with bitmap effects
 */
export interface GifBitmapResult {
  /** Array of frames, each frame is array of row strings using hex chars (0-F) */
  images: string[][];

  /** Array of up to 16 hex color strings extracted from the GIF */
  palette: string[];

  /** Width of the GIF in pixels */
  width: number;

  /** Height of the GIF in pixels */
  height: number;

  /** Number of frames in the GIF */
  frameCount: number;

  /** Frames per second from GIF delay timing (only present when frameCount > 1) */
  frameRate?: number;

  /** File path (only present when loaded via dialog) */
  filePath?: string;
}

/**
 * Effect payload sent to LED drivers via UDP
 *
 * Flexible record structure with required effect name and arbitrary effect-specific properties.
 * The `drivers` property is reserved for selective driver targeting.
 *
 * Examples:
 * - { effect: 'pulse', props: { color: '#FF0000', duration: 300 } }
 * - { effect: 'wipe', props: { direction: 'left' }, drivers: ['rgfx-driver-0001'] }
 * - { effect: 'explode', props: { centerX: 50, centerY: 50 } }
 */
export interface EffectPayload extends Record<string, unknown> {
  /** LED effect type (e.g., "pulse", "wipe", "explode", "plasma") */
  effect: string;

  /**
   * Optional array of driver IDs to target (stripped before sending via UDP).
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
 * - "pacman/player/score/p1" →
 *   { namespace: "pacman", subject: "player", property: "score", qualifier: "p1" }
 * - "galaga/enemy/destroyed" →
 *   { namespace: "galaga", subject: "enemy", property: "destroyed", qualifier: undefined }
 * - "rgfx/driver/connected" →
 *   { namespace: "rgfx", subject: "driver", property: "connected", qualifier: undefined }
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

  /** Event payload string */
  payload: string;
}

/**
 * UDP client interface for broadcasting effects to LED drivers
 */
export interface UdpClient {
  /**
   * Broadcast effect to all connected drivers or selective drivers if specified
   * @param payload Effect payload with semantic data.
   *   Use payload.drivers to target specific drivers.
   * @returns true (for transformer return convenience)
   */
  broadcast(payload: EffectPayload): boolean;

  /**
   * Stop the UDP client and release resources
   */
  stop(): void;
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
interface HttpClient {
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
 * State store interface for transformers to persist data across events
 *
 * Useful for tracking game state, debouncing, rate limiting, etc.
 */
export interface StateStore {
  /**
   * Get value by key
   * @param key Storage key
   * @returns Stored value or undefined if not found
   */
  get(key: string): unknown;

  /**
   * Set value for key
   * @param key Storage key
   * @param value Value to store
   */
  set(key: string, value: unknown): void;

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
 * Logger interface for transformers to log debug/info/warnings/errors
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
 * Result from parsing ambilight payload for background effect
 */
export interface AmbilightGradient {
  /** Array of 24-bit hex colors (e.g., "#FF0000") */
  colors: string[];
  /** Gradient orientation */
  orientation: 'horizontal' | 'vertical';
}

/**
 * Context provided to all transformer handlers
 *
 * Contains all services and utilities transformers can use to interact with
 * the system (send effects, publish MQTT, store state, log messages)
 */
export interface TransformerContext {
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

  /** Load an animated GIF and convert to bitmap effect format */
  loadGif(path: string): Promise<GifBitmapResult>;

  /**
   * Parse ambilight payload (12-bit colors) to background effect gradient props
   * @param payload Comma-separated 12-bit hex colors (e.g., "F00,0F0,00F")
   * @param orientation Gradient orientation ('horizontal' or 'vertical')
   * @returns Gradient object for background effect props
   */
  parseAmbilight(
    payload: string,
    orientation?: 'horizontal' | 'vertical',
  ): AmbilightGradient;

  /**
   * Convert HSL color to hex string
   * @param h Hue (0-360)
   * @param s Saturation (0-100)
   * @param l Lightness (0-100)
   * @returns Hex color string (e.g., "#FF77A8")
   */
  hslToHex(h: number, s: number, l: number): string;
}

/**
 * Transformer handler function signature
 *
 * @param topic Parsed topic with pre-split segments and payload
 * @param context Transformer context with services
 * @returns true if event was handled (stops cascade), false to continue
 */
export type TransformerHandler = (
  topic: RgfxTopic,
  context: TransformerContext,
) => boolean | Promise<boolean>;
