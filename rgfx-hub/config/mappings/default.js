// Default catch-all handler
export function handle(_topic, _payload, { broadcast, log }) {
  log.debug(`Unmatched event: ${_topic} = ${_payload}`);

  return broadcast({
    effect: 'pulse',
    props: { color: '#FFFFFF' },
  });
}
