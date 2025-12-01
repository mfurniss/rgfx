// Galaga mapper - see pacman.js for format example
export function handle({ subject, property }, _payload, { broadcast }) {
  // if (subject === "player" && property === "score") {
  //   return broadcast({
  //     effect: "pulse",
  //     props: { color: "#FFFF00" },
  //   });
  // }

  if (subject === 'player' && property === 'fired') {
    return broadcast({
      effect: 'wipe',
      drivers: ['rgfx-driver-0002', 'rgfx-driver-0006'],
      props: {
        color: '#000020',
        duration: 400,
        direction: 'right',
      },
    });
  }

  // Player ship movement - blue pulse
  // if (subject === "player" && property === "ship") {
  //   return broadcast({
  //     effect: "pulse",
  //     props: { color: "#0000FF" },
  //   });
  // }

  if (subject === 'enemy' && property === 'destroyed') {
    return broadcast({
      effect: 'explode',
      drivers: ['*', '*'],
      props: {
        // color: "random",
        particleCount: 80,
        power: 120,
        lifespan: 400,
        powerSpread: 1.4,
        particleSize: 4,
        hueSpread: 40,
        friction: 3,
        lifespanSpread: 1.2,
        // centerX: 50,
        // centerY: 50
      },
    });
  }
}
