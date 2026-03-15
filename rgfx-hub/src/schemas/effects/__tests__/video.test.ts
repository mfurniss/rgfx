import { describe, it, expect } from 'vitest';
import videoSchema from '../video';

const propsSchema = videoSchema.omit({ name: true, description: true });

describe('video effect schema', () => {
  it('should accept valid props with file path', () => {
    const result = propsSchema.safeParse({
      file: '/path/to/video.mp4',
      loop: false,
    });

    expect(result.success).toBe(true);
  });

  it('should accept props with loop enabled', () => {
    const result = propsSchema.safeParse({
      file: '/path/to/video.mp4',
      loop: true,
    });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.loop).toBe(true);
    }
  });

  it('should default file to empty string', () => {
    const result = propsSchema.safeParse({});

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.file).toBe('');
    }
  });

  it('should default loop to false', () => {
    const result = propsSchema.safeParse({ file: '/video.mp4' });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.loop).toBe(false);
    }
  });

  it('should reject unknown properties', () => {
    const result = propsSchema.safeParse({
      file: '/video.mp4',
      unknown: 'value',
    });

    expect(result.success).toBe(false);
  });

  it('should have correct name and description literals', () => {
    const result = videoSchema.safeParse({
      name: 'Video',
      description: 'Stream a video file to LED matrix',
      file: '/video.mp4',
    });

    expect(result.success).toBe(true);
  });
});
