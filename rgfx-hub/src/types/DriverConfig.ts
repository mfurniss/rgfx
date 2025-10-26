/**
 * Driver hardware configuration types
 * These define the structure of driver config JSON files
 */

export type LEDChipset = 'WS2812B' | 'WS2811' | 'APA102' | 'SK6812' | 'SK9822';
export type ColorOrder = 'RGB' | 'GRB' | 'BGR' | 'RBG' | 'GBR' | 'BRG';
export type DeviceType = 'strip' | 'matrix';

/**
 * FastLED color correction presets
 * Compensates for LED strip color imbalances
 */
export type ColorCorrection =
  | 'TypicalLEDStrip'      // TypicalSMD5050 (default for most strips)
  | 'Typical8mmPixel'      // TypicalPixelString (for 8mm pixel strings)
  | 'UncorrectedColor';    // No correction

/**
 * FastLED color temperature presets
 * Black body radiators (Kelvin temperatures)
 */
export type ColorTemperature =
  // Black body radiators
  | 'Candle'              // 1900K
  | 'Tungsten40W'         // 2600K
  | 'Tungsten100W'        // 2850K
  | 'Halogen'             // 3200K
  | 'CarbonArc'           // 5200K
  | 'HighNoonSun'         // 5400K
  | 'DirectSunlight'      // 6000K
  | 'OvercastSky'         // 7000K
  | 'ClearBlueSky'        // 20000K
  // Gaseous light sources
  | 'WarmFluorescent'
  | 'StandardFluorescent'
  | 'CoolWhiteFluorescent'
  | 'FullSpectrumFluorescent'
  | 'GrowLightFluorescent'
  | 'BlackLightFluorescent'
  | 'MercuryVapor'
  | 'SodiumVapor'
  | 'MetalHalide'
  | 'HighPressureSodium'
  | 'UncorrectedTemperature'; // No temperature adjustment

/**
 * LED device configuration
 */
export interface LEDDevice {
  /** Unique device identifier (lowercase, alphanumeric + underscore) */
  id: string;

  /** Human-readable device name */
  name: string;

  /** GPIO pin number (0-39) */
  pin: number;

  /** Device type */
  type: DeviceType;

  /** Total number of LEDs in this device */
  count: number;

  /** Starting LED index on the data pin (default: 0) */
  offset?: number;

  /** LED chipset type (default: WS2812B) */
  chipset?: LEDChipset;

  /** Color channel order (default: GRB) */
  color_order?: ColorOrder;

  /** Maximum brightness limit 0-255 (default: 255) */
  max_brightness?: number;

  /** Color correction preset (default: TypicalLEDStrip) */
  color_correction?: ColorCorrection;

  /** Color temperature preset (optional) */
  color_temperature?: ColorTemperature;

  /** SPI data rate in MHz for SPI chipsets like APA102/SK9822 (1-40, default: 24) */
  data_rate_mhz?: number;

  /** Matrix width in pixels (required if type=matrix) */
  width?: number;

  /** Matrix height in pixels (required if type=matrix) */
  height?: number;

  /** Serpentine wiring pattern for matrices (default: false) */
  serpentine?: boolean;
}

/**
 * Global driver settings
 */
export interface DriverSettings {
  /** Global maximum brightness across all devices (0-255) */
  global_brightness_limit?: number;

  /** Gamma correction value (1.0-3.0, default: 2.2) */
  gamma_correction?: number;

  /** Enable temporal dithering (default: true) */
  dithering?: boolean;

  /** LED refresh rate in Hz (30-120, default: 60) */
  update_rate?: number;

  /** Power supply voltage in volts (default: 5) */
  power_supply_volts?: number;

  /** Maximum current draw in milliamps (e.g., 1000 for 1A power supply) */
  max_power_milliamps?: number;
}

/**
 * Complete driver hardware configuration
 */
export interface DriverConfig {
  /** Unique driver identifier (MAC address) */
  driver_id: string;

  /** Human-readable name for this driver */
  friendly_name?: string;

  /** Optional description */
  description?: string;

  /** Configuration schema version */
  version: string;

  /** LED devices connected to this driver */
  led_devices: LEDDevice[];

  /** Global driver settings */
  settings?: DriverSettings;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}
