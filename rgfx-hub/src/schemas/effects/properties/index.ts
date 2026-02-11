import { z } from 'zod';

export { default as baseEffect } from './base';
export { default as easing } from './easing';

export const centerX = z.union([z.literal('random'), z.number()]).optional().describe('Horizontal center position (0-100)');
export const centerY = z.union([z.literal('random'), z.number()]).optional().describe('Vertical center position (0-100)');
