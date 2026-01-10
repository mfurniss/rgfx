// Default catch-all handler
export function transform({ raw, payload: _payload }, { log }) {
  log.debug(`Unmatched event: ${raw} = ${_payload}`);
  // Don't broadcast anything for unhandled events
}
