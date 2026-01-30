export const MATRIX_DRIVERS = [
  'rgfx-driver-0001',
  'rgfx-driver-0002',
  'rgfx-driver-0005',
];

export const STRIP_DRIVERS = [
  'rgfx-driver-0003',
  'rgfx-driver-0004',
  'rgfx-driver-0006',
];

export const ALL_DRIVERS = [...MATRIX_DRIVERS, ...STRIP_DRIVERS];

export const NAMED_DRIVERS = {
  frontStrip: 'rgfx-driver-0004',
  leftStrip: 'rgfx-driver-0006',
  rightStrip: 'rgfx-driver-0003',
  primaryMatrix: 'rgfx-driver-0005',
  leftMatrix: 'rgfx-driver-0001',
  rightMatrix: 'rgfx-driver-0002',
};

export const AMBILIGHT_CONFIG = {
  mode: 'multi', // 'multi' or 'single'

  // Multi-driver mode: each edge to separate driver
  multiDriver: {
    top: 'rgfx-driver-0004',
    left: 'rgfx-driver-0006',
    right: 'rgfx-driver-0003',
  },

  // Single-driver mode: all edges to one driver
  singleDriver: {
    drivers: ['rgfx-driver-0004'],
    startCorner: 'bottom-left', // 'bottom-left', 'top-left', 'top-right', 'bottom-right'
    aspectRatio: [16, 10], // [width, height]
  },
};
