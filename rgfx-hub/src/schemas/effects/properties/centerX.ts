import { z } from 'zod';

export default z.union([z.literal('random'), z.number()]).optional().describe('Horizontal center position (0-100)');
