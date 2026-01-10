import { scaleLinear, formatNumber } from "../utils.js";

const shipPositionScale = scaleLinear(17, 225, 13, 88);

// Galaga mapper - see pacman.js for format example
export function transform({ subject, property, payload }, { broadcast }) {
  // Score display on driver 0005
  if (subject === "player" && property === "score") {
    return broadcast({
      effect: "text",
      drivers: ["rgfx-driver-0005"],
      props: {
        align: "center",
        text: formatNumber(payload),
        color: "#808060",
        accentColor: "#603000",
        duration: 3000,
        reset: true,
      },
    });
  }

  if (subject === "player" && property === "fire") {
    broadcast({
      effect: "projectile",
      drivers: ["rgfx-driver-0003"],
      props: {
        color: "#56006e",
        direction: "left",
        velocity: 1800,
        friction: 0.5,
        trail: 0.3,
        width: 16,
        lifespan: 2000,
      },
    });
    return broadcast({
      effect: "projectile",
      drivers: ["rgfx-driver-0006"],
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

  // Player ship movement - blue pulse (17 to 225)
  if (subject === "player" && property === "ship" && payload >= 17) {
    return true;
    return broadcast({
      effect: "bitmap",
      drivers: ["rgfx-driver-0003"],
      props: {
        color: "#0000FF",
        reset: true,
        centerY: Math.floor(shipPositionScale(Number(payload))),
        duration: 400,
        images: [
          [
            "   AA   ",
            "   AA   ",
            "   AA   ",
            "A AAAA A",
            "A AAAA A",
            "AAAAAAAA",
            "A AAAA A",
            "A  AA  A",
          ],
        ],
      },
    });
  }

  if (subject === "enemy" && property === "destroy") {
    return broadcast({
      effect: "explode",
      drivers: ["*", "*"],
      props: {
        color: "random",
        centerX: "random",
        centerY: "random",
        particleCount: 80,
        power: 200,
        lifespan: 500,
        powerSpread: 60,
        particleSize: 6,
        hueSpread: 40,
        friction: 3,
        lifespanSpread: 1.4,
      },
    });
  }
}
