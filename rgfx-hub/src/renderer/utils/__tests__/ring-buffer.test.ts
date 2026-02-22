import { describe, it, expect } from 'vitest';
import { RingBuffer } from '../ring-buffer';

describe('RingBuffer', () => {
  describe('constructor', () => {
    it('should create an empty buffer with given capacity', () => {
      const buffer = new RingBuffer<number>(5);
      expect(buffer.length).toBe(0);
      expect(buffer.size).toBe(5);
    });

    it('should throw if capacity is zero', () => {
      expect(() => new RingBuffer<number>(0)).toThrow('capacity must be positive');
    });

    it('should throw if capacity is negative', () => {
      expect(() => new RingBuffer<number>(-1)).toThrow('capacity must be positive');
    });
  });

  describe('push', () => {
    it('should add items up to capacity', () => {
      const buffer = new RingBuffer<number>(3);
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);

      expect(buffer.length).toBe(3);
      expect(buffer.toArray()).toEqual([1, 2, 3]);
    });

    it('should overwrite oldest items when capacity exceeded', () => {
      const buffer = new RingBuffer<number>(3);
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      buffer.push(4);

      expect(buffer.length).toBe(3);

      expect(buffer.toArray()).toEqual([2, 3, 4]);
    });

    it('should maintain correct order after multiple wrap-arounds', () => {
      const buffer = new RingBuffer<number>(3);

      for (let i = 1; i <= 10; i++) {
        buffer.push(i);
      }

      expect(buffer.toArray()).toEqual([8, 9, 10]);
    });
  });

  describe('toArray', () => {
    it('should return empty array for empty buffer', () => {
      const buffer = new RingBuffer<number>(5);
      expect(buffer.toArray()).toEqual([]);
    });

    it('should return items in chronological order (oldest first)', () => {
      const buffer = new RingBuffer<number>(5);
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);

      expect(buffer.toArray()).toEqual([1, 2, 3]);
    });

    it('should return correct order after wrap-around', () => {
      const buffer = new RingBuffer<number>(3);
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      buffer.push(4);
      buffer.push(5);

      expect(buffer.toArray()).toEqual([3, 4, 5]);
    });

    it('should return a new array each time', () => {
      const buffer = new RingBuffer<number>(3);
      buffer.push(1);

      const arr1 = buffer.toArray();
      const arr2 = buffer.toArray();

      expect(arr1).not.toBe(arr2);
      expect(arr1).toEqual(arr2);
    });
  });

  describe('length', () => {
    it('should return 0 for empty buffer', () => {
      const buffer = new RingBuffer<number>(5);
      expect(buffer.length).toBe(0);
    });

    it('should increase as items are added', () => {
      const buffer = new RingBuffer<number>(5);
      expect(buffer.length).toBe(0);
      buffer.push(1);
      expect(buffer.length).toBe(1);
      buffer.push(2);
      expect(buffer.length).toBe(2);
    });

    it('should not exceed capacity', () => {
      const buffer = new RingBuffer<number>(3);
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      buffer.push(4);
      buffer.push(5);

      expect(buffer.length).toBe(3);
    });
  });

  describe('clear', () => {
    it('should remove all items', () => {
      const buffer = new RingBuffer<number>(5);
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);

      buffer.clear();

      expect(buffer.length).toBe(0);
      expect(buffer.toArray()).toEqual([]);
    });

    it('should allow adding items after clear', () => {
      const buffer = new RingBuffer<number>(3);
      buffer.push(1);
      buffer.push(2);
      buffer.clear();
      buffer.push(3);
      buffer.push(4);

      expect(buffer.toArray()).toEqual([3, 4]);
    });
  });

  describe('with objects', () => {
    it('should work with object types', () => {
      interface DataPoint {
        timestamp: number;
        value: number;
      }

      const buffer = new RingBuffer<DataPoint>(2);
      buffer.push({ timestamp: 1, value: 10 });
      buffer.push({ timestamp: 2, value: 20 });
      buffer.push({ timestamp: 3, value: 30 });

      expect(buffer.toArray()).toEqual([
        { timestamp: 2, value: 20 },
        { timestamp: 3, value: 30 },
      ]);
    });
  });
});
