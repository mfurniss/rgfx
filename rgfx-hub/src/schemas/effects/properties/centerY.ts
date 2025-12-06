import { z } from 'zod';

export default z.union([z.literal('random'), z.number()]).optional().default(50).describe('Vertical center position (0-100)');
