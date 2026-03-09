/**
 * Factory that isolates the tasmota-webserial-esptool unsafe type boundary.
 * The library's ESPLoader has `any[]` typed properties that cascade
 * ESLint no-unsafe-* errors. This module contains the only point of
 * contact with those types — callers get clean interfaces.
 */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { connectWithPort } from 'tasmota-webserial-esptool';

export interface EspStub {
  eraseFlash(): Promise<void>;
  flashData(
    data: ArrayBuffer,
    updateProgress: (
      bytesWritten: number,
      totalBytes: number,
    ) => void,
    offset?: number,
    compress?: boolean,
  ): Promise<void>;
}

export interface EspLoaderApi {
  initialize(): Promise<void>;
  chipName: string | null;
  runStub(): Promise<EspStub>;
  disconnect(): Promise<void>;
  hardResetToFirmware(): Promise<void>;
}

export interface FlashLogger {
  log(msg: string): void;
  error(msg: string): void;
  debug(msg: string): void;
}

/**
 * Opens the serial port at ROM baud rate and creates an ESPLoader.
 * Uses the library's connectWithPort which handles port opening.
 */
export async function createEspLoader(
  port: SerialPort,
  logger: FlashLogger,
): Promise<EspLoaderApi> {
  const loader = await connectWithPort(port, logger);
  return loader as unknown as EspLoaderApi;
}
