import { scaleLinear } from '../utils.js';

const shipPositionScale = scaleLinear(17, 225, 13, 88);

// Galaga mapper - see pacman.js for format example
export function handle({ subject, property }, payload, { broadcast }) {
  // if (subject === "player" && property === "score") {
  //   return broadcast({
  //     effect: "pulse",
  //     props: { color: "#FFFF00" },
  //   });
  // }

  if (subject === 'player' && property === 'fire') {
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

  // Player ship movement - blue pulse (17 to 225)
  if (subject === 'player' && property === 'ship' && payload >= 17) {
    return broadcast({
      effect: 'bitmap',
      drivers: ['rgfx-driver-0003'],
      props: {
        color: '#0000FF',
        reset: true,
        centerY: Math.floor(shipPositionScale(Number(payload))),
        duration: 400,
        images: [[
          '   AA   ',
          '   AA   ',
          '   AA   ',
          'A AAAA A',
          'A AAAA A',
          'AAAAAAAA',
          'A AAAA A',
          'A  AA  A',
        ]],
      },
    });
  }

  if (subject === 'enemy' && property === 'destroy') {
    return broadcast({
      effect: 'explode',
      drivers: ['*', '*'],
      props: {
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
}
