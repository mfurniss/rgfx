import { describe, it, expect, beforeEach, vi } from "vitest";
import { GameEventMapper } from "../GameEventMapper";
import type { Udp } from "../udp";

describe("GameEventMapper", () => {
  let mockUdp: Udp;
  let mapper: GameEventMapper;

  beforeEach(() => {
    // Create a mock UDP object
    mockUdp = {
      send: vi.fn(),
      stop: vi.fn(),
      ip: "192.168.1.100",
      setErrorCallback: vi.fn(),
      setSentCallback: vi.fn(),
    } as unknown as Udp;

    mapper = new GameEventMapper(mockUdp);
  });

  describe("power pill events", () => {
    it("should send blue pulse when power pill is active", () => {
      mapper.handleEvent("player/pill/state", "1");

      expect(mockUdp.send).toHaveBeenCalledWith("pulse", "0x0000FF");
    });

    it("should send blue pulse for any positive state value", () => {
      mapper.handleEvent("player/pill/state", "42");

      expect(mockUdp.send).toHaveBeenCalledWith("pulse", "0x0000FF");
    });

    it("should send red pulse when power pill is inactive", () => {
      mapper.handleEvent("player/pill/state", "0");

      expect(mockUdp.send).toHaveBeenCalledWith("pulse", "0xFF0000");
    });

    it("should send red pulse for negative state values", () => {
      mapper.handleEvent("player/pill/state", "-1");

      expect(mockUdp.send).toHaveBeenCalledWith("pulse", "0xFF0000");
    });
  });

  describe("score events", () => {
    it("should send yellow pulse for player 1 score change", () => {
      mapper.handleEvent("player/score/p1", "100");

      expect(mockUdp.send).toHaveBeenCalledWith("pulse", "0xFFFF00");
    });

    it("should send yellow pulse for player 2 score change", () => {
      mapper.handleEvent("player/score/p2", "200");

      expect(mockUdp.send).toHaveBeenCalledWith("pulse", "0xFFFF00");
    });

    it("should send yellow pulse for any score topic", () => {
      mapper.handleEvent("player/score/p3", "300");

      expect(mockUdp.send).toHaveBeenCalledWith("pulse", "0xFFFF00");
    });
  });

  describe("unhandled events", () => {
    it("should not send UDP message for unrecognized topic", () => {
      mapper.handleEvent("unknown/topic", "value");

      expect(mockUdp.send).not.toHaveBeenCalled();
    });

    it("should not send UDP message for game topic", () => {
      mapper.handleEvent("game", "pacman");

      expect(mockUdp.send).not.toHaveBeenCalled();
    });

    it("should not send UDP message for empty topic", () => {
      mapper.handleEvent("", "value");

      expect(mockUdp.send).not.toHaveBeenCalled();
    });
  });

  describe("multiple events", () => {
    it("should handle sequence of different events", () => {
      mapper.handleEvent("player/pill/state", "1");
      mapper.handleEvent("player/score/p1", "100");
      mapper.handleEvent("player/pill/state", "0");

      expect(mockUdp.send).toHaveBeenCalledTimes(3);
      expect(mockUdp.send).toHaveBeenNthCalledWith(1, "pulse", "0x0000FF");
      expect(mockUdp.send).toHaveBeenNthCalledWith(2, "pulse", "0xFFFF00");
      expect(mockUdp.send).toHaveBeenNthCalledWith(3, "pulse", "0xFF0000");
    });
  });
});
