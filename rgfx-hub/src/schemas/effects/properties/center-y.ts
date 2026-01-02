import { z } from 'zod';

export default z.union([z.literal('random'), z.number()]).optional().describe('Vertical center position (0-100)');
