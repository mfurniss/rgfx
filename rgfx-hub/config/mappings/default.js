// Default catch-all handler
export function handle({ raw }, _payload, { log }) {
  log.debug(`Unmatched event: ${raw} = ${_payload}`);
  // Don't broadcast anything for unhandled events
}
