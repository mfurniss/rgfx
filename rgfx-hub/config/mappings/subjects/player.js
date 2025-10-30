// Generic player events
export function handle(topic, _payload, { broadcast }) {
  const [, subject, property] = topic.split('/');
  if (subject !== 'player') return false;

  if (property === 'score') {
    return broadcast({
      effect: 'pulse',
      props: { color: '#00FF00' },
    });
  }
}
