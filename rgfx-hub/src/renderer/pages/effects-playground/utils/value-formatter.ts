export type ValueFormatter = (value: unknown, indent: number) => string;

export function createValueFormatter(): ValueFormatter {
  const formatValue: ValueFormatter = (value: unknown, indent: number): string => {
    const spaces = '  '.repeat(indent);

    if (value === null) {
      return 'null';
    }

    if (typeof value === 'string') {
      return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return '[]';
      }

      // Format short arrays inline, longer arrays on multiple lines
      if (value.length <= 3) {
        const items = value.map((v) => formatValue(v, indent)).join(', ');

        return `[${items}]`;
      }

      const items = value.map((v) => `${spaces}  ${formatValue(v, indent + 1)},`);

      return `[\n${items.join('\n')}\n${spaces}]`;
    }

    if (typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>);

      if (entries.length === 0) {
        return '{}';
      }

      const lines = entries.map(([k, v]) => `${spaces}  ${k}: ${formatValue(v, indent + 1)},`);

      return `{\n${lines.join('\n')}\n${spaces}}`;
    }

    return JSON.stringify(value);
  };

  return formatValue;
}
