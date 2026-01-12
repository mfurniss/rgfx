// Generic player events
export function transform({ subject, property, payload: _payload }, { broadcast }) {
  return false;
  if (subject !== 'player') return false;

  if (property === 'score') {
    return broadcast({
      effect: 'pulse',
      props: { color: 'random', duration: 100, fade: true },
    });
  }
}
