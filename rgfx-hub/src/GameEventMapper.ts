import type { Udp } from "./udp";

// Maps game events to LED effects
export class GameEventMapper {
  private udp: Udp;

  constructor(udp: Udp) {
    this.udp = udp;
  }

  // Handle incoming game event and map to LED effect
  handleEvent(topic: string, message: string) {
    // Power pill state change
    if (topic === "player/pill/state") {
      const state = parseInt(message);
      // Power pill active - blue pulse, otherwise red pulse
      const color = state > 0 ? "0x0000FF" : "0xFF0000";
      this.udp.send("pulse", color);
    }
    // Score changes - quick flash
    else if (topic.startsWith("player/score/")) {
      this.udp.send("pulse", "0xFFFF00");
    }
  }
}
