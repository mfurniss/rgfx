/**
 * Galaga 88 game-specific mapper
 *
 * Handles Galaga 88 specific events:
 * - galaga88/player/fire - Player shooting
 * - galaga88/enemy/destroy - Enemy destroyed
 * - galaga88/sound/music_start - Music started
 * - galaga88/sound/effect - Sound effect (payload = effect number 1-3)
 *
 * Note: rgfx/audio/fft events are handled by subjects/audio.js
 */

export function transform({ subject, property, payload }, { broadcast }) {
  if (subject === "player" && property === "fire") {
    return broadcast({
      effect: "projectile",
      drivers: ["rgfx-driver-0003", "rgfx-driver-0006"],
      props: {
        color: "#56006e",
        direction: "right",
        velocity: 1800,
        friction: 0.5,
        trail: 0.3,
        width: 16,
        lifespan: 2000,
      },
    });
  }

  // Enemy destroyed - particle explosion
  if (subject === "enemy" && property === "destroy") {
    return broadcast({
      effect: "explode",
      drivers: ["*", "*"],
      props: {
        color: "#FF4400",
        particleCount: 80,
        power: 120,
        lifespan: 380,
        powerSpread: 40,
        particleSize: 4,
        hueSpread: 40,
        friction: 3,
        lifespanSpread: 40,
      },
    });
  }

  // Music start - rainbow pulse
  if (subject === "sound" && property === "music_start") {
    return broadcast({
      effect: "pulse",
      props: {
        color: "rainbow",
        duration: 1000,
      },
    });
  }

  // Sound effects - color based on effect number in payload
  if (subject === "sound" && property === "effect") {
    const effectNum = parseInt(payload);
    // const color = EFFECT_COLORS[effectNum] || "#FFFFFF";
    // return broadcast({
    //   effect: "pulse",
    //   props: {
    //     color,
    //     duration: 150,
    //   },
    // });
  }
}
