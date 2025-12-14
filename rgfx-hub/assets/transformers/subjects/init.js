import { getWorldRecord } from '../utils/world-record.js';

export async function handle({ namespace, subject }, payload, { http, broadcast, log }) {
  if (subject !== 'init') return false;

  // Async fetch - don't block, fire and forget
  getWorldRecord(namespace, http, log).then((result) => {
    if (result) {
      broadcast({
        effect: 'text',
        drivers: ['rgfx-driver-0005'],
        props: {
          text: `WR:${result.score}`,
          color: '#FFD700',
        },
      });
    }
  });

  return false; // Let other handlers continue (e.g., clear effects)
}
