import log from "electron-log/main";
import type { Device, DeviceSystemInfo } from "./types";

// Driver timeout threshold (35 seconds = 30s poll + 5s grace)
const DRIVER_TIMEOUT_MS = 35000;

export class DriverRegistry {
  private drivers = new Map<string, Device>();
  private onDriverConnectedCallback?: (device: Device) => void;
  private onDriverDisconnectedCallback?: (device: Device) => void;

  // Set callback for when a driver connects (new or reconnecting)
  onDriverConnected(callback: (device: Device) => void) {
    this.onDriverConnectedCallback = callback;
  }

  // Set callback for when a driver disconnects (timeout)
  onDriverDisconnected(callback: (device: Device) => void) {
    this.onDriverDisconnectedCallback = callback;
  }

  // Register or update a driver from MQTT connect message
  registerDriver(sysInfo: DeviceSystemInfo): Device {
    const deviceId = sysInfo.mac || sysInfo.ip || "unknown";
    const existingDevice = this.drivers.get(deviceId);
    const now = Date.now();

    const device: Device = {
      id: deviceId,
      name: sysInfo.hostname || sysInfo.ip || "Driver",
      type: "driver",
      connected: true,
      lastSeen: now,
      firstSeen: existingDevice?.firstSeen || now,
      ip: sysInfo.ip,
      sysInfo: sysInfo,
      stats: {
        mqttMessagesReceived:
          (existingDevice?.stats.mqttMessagesReceived || 0) + 1,
        mqttMessagesFailed: existingDevice?.stats.mqttMessagesFailed || 0,
        udpMessagesSent: existingDevice?.stats.udpMessagesSent || 0,
        udpMessagesFailed: existingDevice?.stats.udpMessagesFailed || 0,
      },
    };

    this.drivers.set(device.id, device);

    // Notify if this is a new device or was previously disconnected
    if (!existingDevice || !existingDevice.connected) {
      log.info(`Driver connected: ${device.name} (${deviceId})`);
      this.onDriverConnectedCallback?.(device);
    } else {
      // Just update lastSeen for existing connected device (heartbeat)
      log.info(`Heartbeat from ${device.name} (${deviceId})`);
    }

    return device;
  }

  // Find driver by IP address
  findByIp(ip: string): Device | undefined {
    return Array.from(this.drivers.values()).find(
      (device) => device.ip === ip
    );
  }

  // Track UDP message sent to driver
  trackUdpSent(ip: string, success: boolean): Device | undefined {
    const device = this.findByIp(ip);
    if (!device) {
      log.warn(`trackUdpSent: No driver found with IP ${ip}`);
      return undefined;
    }

    // Update stats based on success/failure
    if (success) {
      device.stats.udpMessagesSent++;
    } else {
      device.stats.udpMessagesFailed++;
    }

    const statType = success ? "sent" : "failed";
    const statCount = success
      ? device.stats.udpMessagesSent
      : device.stats.udpMessagesFailed;
    log.info(`UDP ${statType} to ${device.name}: ${statCount} total`);

    this.drivers.set(device.id, device);

    // Notify callback so main can update renderer
    this.onDriverConnectedCallback?.(device);

    return device;
  }

  // Check for timed-out drivers and mark them as disconnected
  checkTimeouts(): number {
    const now = Date.now();
    let disconnectedCount = 0;

    log.info(`Checking driver timeouts for ${this.drivers.size} drivers...`);

    this.drivers.forEach((device, deviceId) => {
      const timeSinceLastSeen = now - device.lastSeen;
      log.info(
        `Driver ${device.name}: connected=${device.connected}, lastSeen=${timeSinceLastSeen}ms ago, threshold=${DRIVER_TIMEOUT_MS}ms`,
      );

      if (device.connected && timeSinceLastSeen > DRIVER_TIMEOUT_MS) {
        log.info(
          `Driver ${device.name} (${deviceId}) timed out - marking as disconnected`,
        );

        // Mark as disconnected
        device.connected = false;
        this.drivers.set(deviceId, device);

        // Notify callback
        if (this.onDriverDisconnectedCallback) {
          this.onDriverDisconnectedCallback(device);
          log.info(`Sent driver:disconnected event`);
          disconnectedCount++;
        }
      }
    });

    return disconnectedCount;
  }

  // Get count of connected drivers only
  getConnectedCount(): number {
    return Array.from(this.drivers.values()).reduce(
      (count, device) => count + (device.connected ? 1 : 0),
      0
    );
  }

  // Get all drivers (connected and disconnected)
  getAllDrivers(): Device[] {
    return Array.from(this.drivers.values());
  }
}
