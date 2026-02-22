/**
 * A fixed-size circular buffer that automatically evicts the oldest items
 * when capacity is reached. Provides O(1) insertion and efficient iteration.
 */
export class RingBuffer<T> {
  private buffer: (T | undefined)[];
  private head = 0;
  private count = 0;

  constructor(private readonly capacity: number) {
    if (capacity <= 0) {
      throw new Error('RingBuffer capacity must be positive');
    }

    this.buffer = new Array<T | undefined>(capacity);
  }

  /**
   * Add an item to the buffer. If the buffer is full, the oldest item is evicted.
   */
  push(item: T): void {
    this.buffer[this.head] = item;
    this.head = (this.head + 1) % this.capacity;

    if (this.count < this.capacity) {
      this.count++;
    }
  }

  /**
   * Returns all items in chronological order (oldest first).
   */
  toArray(): T[] {
    if (this.count === 0) {
      return [];
    }

    if (this.count < this.capacity) {
      return this.buffer.slice(0, this.count) as T[];
    }

    // Buffer is full - items wrap around
    return [
      ...this.buffer.slice(this.head),
      ...this.buffer.slice(0, this.head),
    ] as T[];
  }

  /**
   * Returns the number of items currently in the buffer.
   */
  get length(): number {
    return this.count;
  }

  /**
   * Returns the maximum capacity of the buffer.
   */
  get size(): number {
    return this.capacity;
  }

  /**
   * Clears all items from the buffer.
   */
  clear(): void {
    this.buffer = new Array<T | undefined>(this.capacity);
    this.head = 0;
    this.count = 0;
  }
}
