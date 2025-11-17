// Default catch-all handler
export function handle({ raw }, _payload, { broadcast, log }) {
  log.debug(`Unmatched event: ${raw} = ${_payload}`);

  return broadcast({
    effect: 'pulse',
    props: {
      color: '#0000FF', // Blue for unmatched events
      duration: 300, // 300ms pulse
      fade: true, // Fade out over duration
    },
  });
}
