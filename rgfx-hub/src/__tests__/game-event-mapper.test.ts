import { describe, it, expect, beforeEach, vi } from "vitest";
import { GameEventMapper } from "../game-event-mapper";
import type { DriverRegistry } from "../driver-registry";
import type { Driver } from "../types";
import { Udp } from "../udp";

// Mock the Udp class to track send calls
const mockSend = vi.fn();
vi.mock("../udp", () => ({
  Udp: vi.fn().mockImplementation(() => ({
    send: mockSend,
    stop: vi.fn(),
  })),
}));

describe("GameEventMapper", () => {
  let mockDriverRegistry: DriverRegistry;
  let mapper: GameEventMapper;

  beforeEach(() => {
    // Reset all mocks
    mockSend.mockClear();
    vi.mocked(Udp).mockClear();

    // Create mock drivers
    const mockDriver1: Driver = {
      id: "AA:BB:CC:DD:EE:01",
      name: "Driver 1",
      type: "driver",
      connected: true,
      lastSeen: Date.now(),
      firstSeen: Date.now(),
      ip: "192.168.1.100",
      stats: {
        mqttMessagesReceived: 0,
        mqttMessagesFailed: 0,
        udpMessagesSent: 0,
        udpMessagesFailed: 0,
      },
    };

    const mockDriver2: Driver = {
      id: "AA:BB:CC:DD:EE:02",
      name: "Driver 2",
      type: "driver",
      connected: true,
      lastSeen: Date.now(),
      firstSeen: Date.now(),
      ip: "192.168.1.101",
      stats: {
        mqttMessagesReceived: 0,
        mqttMessagesFailed: 0,
        udpMessagesSent: 0,
        udpMessagesFailed: 0,
      },
    };

    // Create a mock DriverRegistry
    mockDriverRegistry = {
      getAllDrivers: vi.fn().mockReturnValue([mockDriver1, mockDriver2]),
      onDriverConnected: vi.fn(),
      onDriverDisconnected: vi.fn(),
      registerDriver: vi.fn(),
      updateHeartbeat: vi.fn(),
      findByIp: vi.fn(),
      trackUdpSent: vi.fn(),
      checkTimeouts: vi.fn(),
      getConnectedCount: vi.fn().mockReturnValue(2),
    } as unknown as DriverRegistry;

    mapper = new GameEventMapper(mockDriverRegistry);
  });

  describe("power pill events", () => {
    it("should send blue pulse when power pill is active", () => {
      mapper.handleEvent("player/pill/state", "1");

      // Should send to both drivers (2 calls)
      expect(mockSend).toHaveBeenCalledTimes(2);
      expect(mockSend).toHaveBeenCalledWith({ effect: "pulse", color: "0x0000FF" });
    });

    it("should send blue pulse for any positive state value", () => {
      mapper.handleEvent("player/pill/state", "42");

      expect(mockSend).toHaveBeenCalledTimes(2);
      expect(mockSend).toHaveBeenCalledWith({ effect: "pulse", color: "0x0000FF" });
    });

    it("should send red pulse when power pill is inactive", () => {
      mapper.handleEvent("player/pill/state", "0");

      expect(mockSend).toHaveBeenCalledTimes(2);
      expect(mockSend).toHaveBeenCalledWith({ effect: "pulse", color: "0xFF0000" });
    });

    it("should send red pulse for negative state values", () => {
      mapper.handleEvent("player/pill/state", "-1");

      expect(mockSend).toHaveBeenCalledTimes(2);
      expect(mockSend).toHaveBeenCalledWith({ effect: "pulse", color: "0xFF0000" });
    });
  });

  describe("score events", () => {
    it("should send yellow pulse for player 1 score change", () => {
      mapper.handleEvent("player/score/p1", "100");

      expect(mockSend).toHaveBeenCalledTimes(2);
      expect(mockSend).toHaveBeenCalledWith({ effect: "pulse", color: "0xFFFF00" });
    });

    it("should send yellow pulse for player 2 score change", () => {
      mapper.handleEvent("player/score/p2", "200");

      expect(mockSend).toHaveBeenCalledTimes(2);
      expect(mockSend).toHaveBeenCalledWith({ effect: "pulse", color: "0xFFFF00" });
    });

    it("should send yellow pulse for any score topic", () => {
      mapper.handleEvent("player/score/p3", "300");

      expect(mockSend).toHaveBeenCalledTimes(2);
      expect(mockSend).toHaveBeenCalledWith({ effect: "pulse", color: "0xFFFF00" });
    });
  });

  describe("catch-all handler", () => {
    it("should send blue pulse for unrecognized topic", () => {
      mapper.handleEvent("unknown/topic", "value");

      expect(mockSend).toHaveBeenCalledWith({ effect: "pulse", color: "0x0000FF" });
      expect(mockSend).toHaveBeenCalledTimes(2); // Once per driver
    });

    it("should send blue pulse for game topic", () => {
      mapper.handleEvent("game", "pacman");

      expect(mockSend).toHaveBeenCalledWith({ effect: "pulse", color: "0x0000FF" });
      expect(mockSend).toHaveBeenCalledTimes(2); // Once per driver
    });

    it("should send blue pulse for empty topic", () => {
      mapper.handleEvent("", "value");

      expect(mockSend).toHaveBeenCalledWith({ effect: "pulse", color: "0x0000FF" });
      expect(mockSend).toHaveBeenCalledTimes(2); // Once per driver
    });
  });

  describe("multiple events", () => {
    it("should handle sequence of different events", () => {
      mapper.handleEvent("player/pill/state", "1");
      mapper.handleEvent("player/score/p1", "100");
      mapper.handleEvent("player/pill/state", "0");

      // Each event broadcasts to 2 drivers = 6 total calls
      expect(mockSend).toHaveBeenCalledTimes(6);
      // First two calls for first event (blue pulse to both drivers)
      expect(mockSend).toHaveBeenNthCalledWith(1, { effect: "pulse", color: "0x0000FF" });
      expect(mockSend).toHaveBeenNthCalledWith(2, { effect: "pulse", color: "0x0000FF" });
      // Next two calls for second event (yellow pulse to both drivers)
      expect(mockSend).toHaveBeenNthCalledWith(3, { effect: "pulse", color: "0xFFFF00" });
      expect(mockSend).toHaveBeenNthCalledWith(4, { effect: "pulse", color: "0xFFFF00" });
      // Last two calls for third event (red pulse to both drivers)
      expect(mockSend).toHaveBeenNthCalledWith(5, { effect: "pulse", color: "0xFF0000" });
      expect(mockSend).toHaveBeenNthCalledWith(6, { effect: "pulse", color: "0xFF0000" });
    });
  });
});
