import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { EventFileReader } from "../event-file-reader";
import { writeFileSync, unlinkSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("EventFileReader", () => {
  let testFilePath: string;
  let reader: EventFileReader;

  beforeEach(() => {
    testFilePath = join(tmpdir(), "rgfx_events.log");
    // Clean up any existing test file
    if (existsSync(testFilePath)) {
      unlinkSync(testFilePath);
    }
    reader = new EventFileReader();
  });

  afterEach(() => {
    reader.stop();
    // Clean up test file
    if (existsSync(testFilePath)) {
      unlinkSync(testFilePath);
    }
  });

  it("should create EventFileReader instance", () => {
    expect(reader).toBeDefined();
  });

  it("should parse single event line correctly", async () => {
    // Create test file with initial content
    writeFileSync(testFilePath, "");

    const mockCallback = vi.fn();

    // Start watching
    reader.start(mockCallback);

    // Wait a bit for watcher to initialize
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Write a test event
    writeFileSync(testFilePath, "game pacman\n", { flag: "a" });

    // Wait for file watcher to detect change
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(mockCallback).toHaveBeenCalledWith("game", "pacman");
  });

  it("should parse multiple event lines correctly", async () => {
    writeFileSync(testFilePath, "");

    const mockCallback = vi.fn();
    reader.start(mockCallback);

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Write multiple events
    writeFileSync(
      testFilePath,
      "game pacman\nplayer/score/p1 100\nplayer/pill/state 1\n",
      { flag: "a" }
    );

    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(mockCallback).toHaveBeenCalledTimes(3);
    expect(mockCallback).toHaveBeenNthCalledWith(1, "game", "pacman");
    expect(mockCallback).toHaveBeenNthCalledWith(2, "player/score/p1", "100");
    expect(mockCallback).toHaveBeenNthCalledWith(3, "player/pill/state", "1");
  });

  it("should handle messages with spaces in the payload", async () => {
    writeFileSync(testFilePath, "");

    const mockCallback = vi.fn();
    reader.start(mockCallback);

    await new Promise((resolve) => setTimeout(resolve, 100));

    writeFileSync(testFilePath, "status game in progress\n", { flag: "a" });

    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(mockCallback).toHaveBeenCalledWith("status", "game in progress");
  });

  it("should skip empty lines", async () => {
    writeFileSync(testFilePath, "");

    const mockCallback = vi.fn();
    reader.start(mockCallback);

    await new Promise((resolve) => setTimeout(resolve, 100));

    writeFileSync(testFilePath, "game pacman\n\n\nplayer/score/p1 100\n", {
      flag: "a",
    });

    await new Promise((resolve) => setTimeout(resolve, 200));

    // Should only call for the two valid lines
    expect(mockCallback).toHaveBeenCalledTimes(2);
  });

  it("should skip malformed lines without topic and message", async () => {
    writeFileSync(testFilePath, "");

    const mockCallback = vi.fn();
    reader.start(mockCallback);

    await new Promise((resolve) => setTimeout(resolve, 100));

    writeFileSync(testFilePath, "game pacman\ninvalidline\nplayer/score/p1 100\n", {
      flag: "a",
    });

    await new Promise((resolve) => setTimeout(resolve, 200));

    // Should only call for the two valid lines (skip "invalidline")
    expect(mockCallback).toHaveBeenCalledTimes(2);
    expect(mockCallback).toHaveBeenNthCalledWith(1, "game", "pacman");
    expect(mockCallback).toHaveBeenNthCalledWith(2, "player/score/p1", "100");
  });

  it("should handle file truncation by resetting position", async () => {
    writeFileSync(testFilePath, "");

    const mockCallback = vi.fn();
    reader.start(mockCallback);

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Write initial data
    writeFileSync(testFilePath, "game pacman\n", { flag: "a" });
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Truncate file (simulate log rotation or reset)
    writeFileSync(testFilePath, "");
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Write new data
    writeFileSync(testFilePath, "game galaga\n", { flag: "a" });
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Should have received both events
    expect(mockCallback).toHaveBeenCalledWith("game", "pacman");
    expect(mockCallback).toHaveBeenCalledWith("game", "galaga");
  });

  it("should stop watching when stop() is called", async () => {
    writeFileSync(testFilePath, "");

    const mockCallback = vi.fn();
    reader.start(mockCallback);

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Write event before stopping
    writeFileSync(testFilePath, "game pacman\n", { flag: "a" });
    await new Promise((resolve) => setTimeout(resolve, 200));

    reader.stop();

    // Write event after stopping
    writeFileSync(testFilePath, "player/score/p1 100\n", { flag: "a" });
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Should only have received the first event
    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith("game", "pacman");
  });
});
