import { scaleLinear } from 'd3-scale';

const shipPositionScale = scaleLinear().domain([17, 225]).range([13, 88]);

// Galaga mapper - see pacman.js for format example
export function handle({ subject, property }, payload, { broadcast }) {
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
        image: [
          '   XX   ',
          '   XX   ',
          '   XX   ',
          'X XXXX X',
          'X XXXX X',
          'XXXXXXXX',
          'X XXXX X',
          'X  XX  X',
        ],
      },
    });
  }

  if (subject === 'enemy' && property === 'destroyed') {
    return broadcast({
      effect: 'explode',
      drivers: ['*', '*'],
      props: {
        particleCount: 80,
        power: 120,
        lifespan: 380,
        powerSpread: 1.4,
        particleSize: 4,
        hueSpread: 40,
        friction: 3,
        lifespanSpread: 1.4,
      },
    });
  }
}
