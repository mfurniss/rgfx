#pragma once

/**
 * Safely restart the ESP32 by first signaling Core 1 to clear effects.
 * This prevents corrupted LED state from mid-frame ESP.restart().
 */
void safeRestart();
