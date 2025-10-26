import type { Udp } from "./udp";
import log from "electron-log/main";

// Maps game events to LED effects
export class GameEventMapper {
  private udp: Udp;

  constructor(udp: Udp) {
    this.udp = udp;
  }

  // Handle incoming game event and map to LED effect
  handleEvent(topic: string, message: string) {
    log.info(`Event received: ${topic} = ${message}`);
    // Pac-Man: Power pill state change
    if (topic === "player/pill/state") {
      const state = parseInt(message);
      // Power pill active - blue pulse, otherwise red pulse
      const color = state > 0 ? "0x0000FF" : "0xFF0000";
      this.udp.send("pulse", color);
    }
    // Pac-Man: Score changes (with /p1 or /p2 suffix)
    else if (topic.startsWith("player/score/")) {
      this.udp.send("pulse", "0xFFFF00");
    }
    // Super Mario Bros: Score changes (no suffix)
    else if (topic === "player/score") {
      this.udp.send("pulse", "0xFFFF00");
    }
    // Super Mario Bros: Jump
    else if (topic === "player/jump") {
      this.udp.send("pulse", "0x00FF00"); // Green pulse
    }
    // Super Mario Bros: Coin pickup
    else if (topic === "player/coin") {
      this.udp.send("pulse", "0xFFFF00"); // Yellow pulse
    }
    // Super Mario Bros: Music track change
    else if (topic === "game/music") {
      this.udp.send("pulse", "0xFF00FF"); // Purple pulse
    }
    // Super Mario Bros: Fireball shot
    else if (topic === "player/fireball") {
      this.udp.send("pulse", "0xFF8000"); // Orange pulse
    }
  }
}
