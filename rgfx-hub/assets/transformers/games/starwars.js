/**
 * Star Wars (Atari 1983) Transformer
 * Converts game events to LED effects
 */

// 13 space
// 21 trench
// 29 attract mode crawl
// 31 instructions
// 33 scoring
// 35 high scores
// 37 crawl
// 49 space
// 57 trench
// 56 game over
// 38 going in

import { sleep, randomInt, formatNumber } from "../utils.js";

let laserIndex = 0;
let gameState;

const matrices = ["rgfx-driver-0001", "rgfx-driver-0005"];

export async function transform(
  { subject, property, qualifier, payload },
  { broadcast }
) {
  if (subject === "game" && property === "state") {
    gameState = payload;

    if (payload == 12 || payload == 6) {
      // Attract mode logo and 3D crawl
      broadcast({
        effect: "particle_field",
        props: {
          direction: "left",
          density: 16,
          speed: 60,
          size: 5,
          color: "707070",
          enabled: "fadeIn",
        },
      });
    }

    // going in
    if (payload == 38) {
      const commonProps = {
        density: 102,
        speed: 320,
        size: 16,
        color: "808080",
        enabled: "fadeIn",
      };

      broadcast({
        effect: "particle_field",
        drivers: ["rgfx-driver-0003"],
        props: {
          direction: "right",
          ...commonProps,
        },
      });

      broadcast({
        effect: "particle_field",
        drivers: ["rgfx-driver-0006"],
        props: {
          direction: "left",
          ...commonProps,
        },
      });

      await sleep(500);

      broadcast({
        effect: "text",
        drivers: ["rgfx-driver-0005"],
        props: {
          color: "#A00000",
          reset: true,
          text: "I'm going in",
          accentColor: "#000080",
          x: 0,
          y: 0,
          duration: 2000,
          align: "center",
        },
      });

      await sleep(3500);

      broadcast({
        effect: "particle_field",
        drivers: ["rgfx-driver-0003", "rgfx-driver-0006"],
        props: {
          enabled: "fadeOut",
        },
      });
    }

    if (payload == 56) {
      // game over
      broadcast({
        effect: "pulse",
        props: {
          color: "#C00000",
          reset: true,
          duration: 3000,
          easing: "quinticInOut",
          fade: true,
          collapse: "horizontal",
        },
      });
    }

    if (payload == 14) {
      // Select difficulty
      broadcast({
        effect: "particle_field",
        props: {
          direction: "left",
          density: 25,
          speed: 60,
          size: 7,
          color: "808080",
          enabled: "fadeOut",
        },
      });

      broadcast({
        effect: "text",
        drivers: ["rgfx-driver-0005"],
        props: {
          color: "#A00000",
          reset: true,
          text: "Red Five",
          accentColor: "#000080",
          x: 0,
          y: 0,
          duration: 1000,
          align: "center",
        },
      });

      await sleep(800);

      broadcast({
        effect: "text",
        drivers: ["rgfx-driver-0005"],
        props: {
          color: "#A00000",
          reset: true,
          text: "Standing By",
          accentColor: "#000080",
          x: 0,
          y: 0,
          duration: 1000,
          align: "center",
        },
      });
    }
  }
  // Score change - display score on matrix
  if (subject === "player" && property === "score") {
    broadcast({
      effect: "text",
      props: {
        text: formatNumber(payload),
        color: "#008000",
        accentColor: "#000000",
        duration: 6000,
        reset: true,
        align: "center",
      },
      drivers: ["rgfx-driver-0005"], // 96x8 matrix
    });
    broadcast({
      effect: "text",
      props: {
        text: formatNumber(payload),
        color: "#80FF80",
        duration: 200,
        align: "center",
      },
      drivers: ["rgfx-driver-0005"], // 96x8 matrix
    });
  }

  // Player fires X-wing laser
  if (gameState !== 14 && subject === "player" && property === "fire") {
    // rgfx-driver-0006 left strip
    // rgfx-driver-0003 right strip

    const direction = laserIndex++ & 1 ? "left" : "right";
    const drivers =
      direction === "right" ? ["rgfx-driver-0006"] : ["rgfx-driver-0003"];

    for (var i = 0; i < 2; i++) {
      broadcast({
        effect: "projectile",
        drivers,
        props: {
          color: "#008080",
          reset: false,
          direction,
          velocity: 3000,
          friction: 0.5,
          trail: 0.1,
          width: 64,
          height: 6,
          lifespan: 1000,
        },
      });

      await sleep(100);

      broadcast({
        effect: "projectile",
        drivers,
        props: {
          color: "#000060",
          reset: false,
          direction,
          velocity: 3000,
          friction: 0.5,
          trail: 0.2,
          width: 64,
          height: 6,
          lifespan: 1000,
        },
      });

      await sleep(100);
    }

    // return broadcast({
    //   effect: "projectile",
    //   props: {
    //     color: laserIndex++ ? "#009090" : "#0000B0",
    //     reset: false,
    //     direction: "right",
    //     velocity: 5000,
    //     friction: 0,
    //     trail: 0.3,
    //     width: 16,
    //     height: 6,
    //     lifespan: 5000,
    //   },
    // });
  }

  // TIE fighter destroyed
  if (subject === "enemy" && property === "destroy" && qualifier === "tie") {
    const centerX = randomInt(0, 100);
    const centerY = randomInt(0, 100);

    broadcast({
      effect: "explode",
      drivers: matrices,
      props: {
        color: "green",
        reset: false,
        centerX,
        centerY,
        friction: 1,
        hueSpread: 30,
        lifespan: 1500,
        lifespanSpread: 2,
        particleCount: 40,
        particleSize: 8,
        power: 80,
        powerSpread: 50,
      },
    });

    broadcast({
      effect: "explode",
      drivers: matrices,
      props: {
        color: "white",
        reset: false,
        centerX,
        centerY,
        friction: 3,
        hueSpread: 30,
        lifespan: 500,
        lifespanSpread: 2,
        particleCount: 70,
        particleSize: 3,
        power: 160,
        powerSpread: 50,
      },
    });
  }

  // Fireball destroyed
  if (
    subject === "enemy" &&
    property === "destroy" &&
    qualifier === "fireball"
  ) {
    broadcast({
      effect: "explode",
      drivers: matrices,
      props: {
        color: "#600060",
        reset: false,
        centerX: randomInt(0, 100),
        centerY: randomInt(0, 100),
        friction: 3,
        hueSpread: 30,
        lifespan: 1000,
        lifespanSpread: 1,
        particleCount: 25,
        particleSize: 8,
        power: 100,
        powerSpread: 50,
      },
    });
  }

  if (
    subject === "enemy" &&
    property === "destroy" &&
    (qualifier === "turret" || qualifier === "laser-bunker")
  ) {
    return broadcast({
      effect: "explode",
      drivers: matrices,
      props: {
        color: "red",
        reset: false,
        centerX: randomInt(0, 100),
        centerY: randomInt(0, 100),
        friction: 4,
        hueSpread: 0,
        lifespan: 1200,
        lifespanSpread: 60,
        particleCount: 60,
        particleSize: 6,
        power: 120,
        powerSpread: 70,
      },
    });
  }

  if (
    subject === "enemy" &&
    property === "destroy" &&
    qualifier === "laser-tower"
  ) {
    return broadcast({
      effect: "pulse",
      props: {
        color: "#A0A000",
        reset: false,
        duration: 2500,
        easing: "quinticInOut",
        fade: true,
        collapse: "horizontal",
      },
    });
  }

  // Vader hit - purple pulse
  // if (subject === "enemy" && property === "destroy" && qualifier === "vader") {
  //   return broadcast({
  //     effect: "pulse",
  //     props: {
  //       color: "#8800FF",
  //       duration: 200,
  //     },
  //   });
  // }

  // Death Star destroyed
  if (
    subject === "enemy" &&
    property === "destroy" &&
    qualifier === "death-star"
  ) {
    for (var i = 0; i < 10; i++) {
      broadcast({
        effect: "explode",
        props: {
          color: "#800000",
          hueSpread: 0,
          reset: false,
          centerX: 50,
          centerY: 50,
          friction: 2,
          lifespan: 1000,
          lifespanSpread: 0,
          particleCount: 40,
          particleSize: 4,
          power: 200,
          powerSpread: 20,
          scalePower: true,
        },
      });

      await sleep(150);
    }

    await sleep(200);

    for (var i = 0; i < 7; i++) {
      broadcast({
        effect: "explode",
        props: {
          color: "#0000D0",
          reset: false,
          centerX: 50,
          centerY: 50,
          friction: 2,
          hueSpread: 0,
          lifespan: 1000,
          lifespanSpread: 0,
          particleCount: 40,
          particleSize: 4,
          power: 200,
          powerSpread: 20,
          scalePower: true,
        },
      });

      await sleep(150);
    }

    await sleep(450);

    broadcast({
      effect: "explode",
      props: {
        color: "white",
        reset: false,
        centerX: 50,
        centerY: 50,
        friction: 30,
        lifespan: 2000,
        lifespanSpread: 50,
        particleCount: 10,
        particleSize: 6,
        power: 150,
        powerSpread: 50,
      },
    });

    await sleep(150);

    broadcast({
      effect: "explode",
      props: {
        reset: true,
        color: "white",
        centerX: 50,
        centerY: 50,
        friction: 1.5,
        hueSpread: 40,
        lifespan: 4000,
        lifespanSpread: 50,
        particleCount: 500,
        particleSize: 5,
        power: 150,
        powerSpread: 100,
        scalePower: true,
      },
    });
  }

  // // Wave/Force bonus - green wipe
  // if (subject === "bonus" && (property === "wave" || property === "force")) {
  //   return broadcast({
  //     effect: "wipe",
  //     props: {
  //       color: "#00FF00",
  //       direction: "right",
  //     },
  //   });
  // }

  // Shield reduced
  if (subject === "player" && property === "shield-reduced") {
    (async () => {
      for (var i = 0; i < 7; i++) {
        broadcast({
          effect: "pulse",
          props: {
            color: "random",
            reset: false,
            duration: 800,
            easing: "quinticOut",
            fade: true,
            collapse: i & 1 ? "horizontal" : "vertical",
          },
        });
        await sleep(150);
      }
    })();

    return true;
  }
}
