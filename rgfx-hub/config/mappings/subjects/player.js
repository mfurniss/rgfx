// Generic player events
export function handle({ subject, property }, _payload, { broadcast }) {
  if (subject !== 'player') return false;

  if (property === 'score') {
    return broadcast({
      effect: 'pulse',
      props: { color: '#00FF00' },
    });
  }
}
