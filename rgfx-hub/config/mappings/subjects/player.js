// Generic player events
export function handle({ subject, property }, _payload, { broadcast }) {
  if (subject !== 'player') return false;

  if (property === 'score') {
    return broadcast({
      effect: 'pulse',
      props: { color: 'random', duration: 100, fade: true },
    });
  }
}
