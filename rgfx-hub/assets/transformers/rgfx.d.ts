/**
 * RGFX Transformer Type Declarations
 *
 * Provides IntelliSense for transformer function arguments.
 * This file is auto-installed and always overwritten by the hub.
 *
 * Usage in transformer files:
 *   /** @type {import('../rgfx').TransformerHandler} *\/
 *   export async function transform({ subject, property, qualifier, payload }, { broadcast, utils }) {
 */

export interface GifBitmapResult {
  /** Array of frames, each frame is array of row strings using hex chars (0-F) */
  images: string[][];
  /** Array of up to 16 hex color strings */
  palette?: string[];
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
  /** Number of frames */
  frameCount: number;
  /** Frames per second (only when frameCount > 1) */
  frameRate?: number;
  /** File path (only when loaded via dialog) */
  filePath?: string;
}

export interface EffectPayload extends Record<string, unknown> {
  /** LED effect type (e.g., "pulse", "wipe", "explode", "plasma") */
  effect: string;
  /** Optional array of driver IDs to target. If undefined, broadcasts to all. */
  drivers?: string[];
}

export interface RgfxTopic {
  /** Original raw topic string */
  raw: string;
  /** Namespace (first segment) — game name or system namespace */
  namespace?: string;
  /** Subject (second segment) — entity or concept */
  subject?: string;
  /** Property (third segment) — attribute or state */
  property?: string;
  /** Qualifier (fourth segment) — optional context */
  qualifier?: string;
  /** All topic segments */
  parts: string[];
  /** Event payload string */
  payload: string;
}

export interface StateStore {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
  has(key: string): boolean;
  delete(key: string): void;
  clear(): void;
}

export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

export interface AmbilightGradient {
  /** Array of 24-bit hex colors (e.g., "#FF0000") */
  colors: string[];
  /** Gradient orientation */
  orientation: 'horizontal' | 'vertical';
}

export interface UdpClient {
  broadcast(payload: EffectPayload): boolean;
  setDriverFallbackEnabled(enabled: boolean): void;
  stop(): void;
}

export interface MqttClient {
  publish(topic: string, payload: unknown, qos?: 0 | 1 | 2): Promise<void>;
}

interface HttpClient {
  get(url: string, options?: RequestInit): Promise<Response>;
  post(url: string, body: unknown, options?: RequestInit): Promise<Response>;
  put(url: string, body: unknown, options?: RequestInit): Promise<Response>;
  delete(url: string, options?: RequestInit): Promise<Response>;
}

export interface DriverRegistry {
  getDriver(driverId: string): unknown;
  getAllDrivers(): unknown[];
  getConnectedDrivers(): unknown[];
  getConnectedCount(): number;
}

export interface TransformerUtils {
  sleep(ms: number): Promise<void>;
  trackedTimeout(fn: () => void, ms: number): ReturnType<typeof setTimeout>;
  trackedInterval(fn: () => void, ms: number): ReturnType<typeof setInterval>;
  debounce<T extends (...args: unknown[]) => void>(
    fn: T, ms: number
  ): (...args: Parameters<T>) => void;
  throttleLatest<T extends (...args: unknown[]) => void>(
    fn: T, ms: number
  ): (...args: Parameters<T>) => void;
  exclusive<T extends unknown[]>(
    fn: (cancelled: () => boolean, ...args: T) => Promise<void>
  ): (...args: T) => Promise<void>;
  scaleLinear(
    domainMin: number, domainMax: number,
    rangeMin: number, rangeMax: number
  ): (value: number) => number;
  randomInt(a: number, b?: number): number;
  randomElement<T>(array: T[]): T;
  hslToRgb(h: number, s: number, l: number): string;
  formatNumber(value: number | string): string;
  pick<T>(array: T[], count: number): T[];
}

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
  /** Load a JSON sprite file extracted from ROM data */
  loadSprite(path: string): Promise<GifBitmapResult>;
  /** Parse ambilight payload (12-bit colors) to background effect gradient props */
  parseAmbilight(
    payload: string,
    orientation?: 'horizontal' | 'vertical',
  ): AmbilightGradient;
  /** Convert HSL color to hex string */
  hslToHex(h: number, s: number, l: number): string;
  /** Utility functions for transformers */
  utils: TransformerUtils;
}

/** Transformer handler function signature */
export type TransformerHandler = (
  topic: RgfxTopic,
  context: TransformerContext,
) => boolean | Promise<boolean>;
