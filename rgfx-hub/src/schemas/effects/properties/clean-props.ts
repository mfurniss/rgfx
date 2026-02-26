type PropsMap = Record<string, unknown>;

/**
 * Remove props that match their default "disabled/off" value.
 * Used by per-effect cleanCodeProps transforms to strip no-op props
 * from generated code (e.g. gravity: 0, reset: false, accentColor: null).
 */
export function removeDefaultNoOps(props: PropsMap, noOps: PropsMap): PropsMap {
  return Object.fromEntries(
    Object.entries(props).filter(
      ([key, value]) => !(key in noOps && value === noOps[key]),
    ),
  );
}

/** Create a cleanCodeProps transform that removes the given no-op defaults. */
export function createNoOpCleaner(noOps: PropsMap): (props: PropsMap) => PropsMap {
  return (props) => removeDefaultNoOps(props, noOps);
}
