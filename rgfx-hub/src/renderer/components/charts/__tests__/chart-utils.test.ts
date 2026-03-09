import { describe, it, expect, vi, beforeEach } from 'vitest';
import { formatTime, formatTimeWithSeconds, getCssVar } from '../chart-utils';

describe('chart-utils', () => {
  describe('formatTime', () => {
    it('formats timestamp as h:mm a', () => {
      // 2024-01-15 14:30:00 UTC
      const timestamp = new Date('2024-01-15T14:30:00').getTime();
      const result = formatTime(timestamp);

      expect(result).toMatch(/\d{1,2}:\d{2}\s[AP]M/);
    });

    it('returns consistent format for different times', () => {
      const morning = new Date('2024-01-15T09:05:00').getTime();
      const evening = new Date('2024-01-15T21:45:00').getTime();

      expect(formatTime(morning)).toMatch(/\d{1,2}:\d{2}\s[AP]M/);
      expect(formatTime(evening)).toMatch(/\d{1,2}:\d{2}\s[AP]M/);
    });
  });

  describe('formatTimeWithSeconds', () => {
    it('formats timestamp as h:mm:ss a', () => {
      const timestamp = new Date('2024-01-15T14:30:45').getTime();
      const result = formatTimeWithSeconds(timestamp);

      expect(result).toMatch(/\d{1,2}:\d{2}:\d{2}\s[AP]M/);
    });

    it('includes seconds in output', () => {
      const timestamp = new Date('2024-01-15T14:30:45').getTime();
      const result = formatTimeWithSeconds(timestamp);

      // Should contain seconds (formatTime does not)
      const colonCount = (result.match(/:/g) ?? []).length;
      expect(colonCount).toBe(2);
    });
  });

  describe('getCssVar', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('reads CSS variable from document element', () => {
      const spy = vi.spyOn(window, 'getComputedStyle').mockReturnValue({
        getPropertyValue: vi.fn().mockReturnValue('  #ff0000  '),
      } as unknown as CSSStyleDeclaration);

      const result = getCssVar('--mui-palette-primary-main');

      expect(spy).toHaveBeenCalledWith(document.documentElement);
      expect(result).toBe('#ff0000');
    });

    it('trims whitespace from returned value', () => {
      vi.spyOn(window, 'getComputedStyle').mockReturnValue({
        getPropertyValue: vi.fn().mockReturnValue('   rgb(0,0,0)   '),
      } as unknown as CSSStyleDeclaration);

      expect(getCssVar('--any-var')).toBe('rgb(0,0,0)');
    });

    it('returns empty string when variable is not set', () => {
      vi.spyOn(window, 'getComputedStyle').mockReturnValue({
        getPropertyValue: vi.fn().mockReturnValue(''),
      } as unknown as CSSStyleDeclaration);

      expect(getCssVar('--nonexistent')).toBe('');
    });
  });
});
