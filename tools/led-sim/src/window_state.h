/**
 * Window State Persistence
 *
 * Saves and restores window position and size between sessions.
 */
#pragma once

#include <string>

struct WindowState {
	int x;
	int y;
	int width;
	int height;
	bool valid;
};

/**
 * Load window state from file.
 * Returns state with valid=false if file doesn't exist or is invalid.
 */
WindowState loadWindowState();

/**
 * Save window state to file.
 */
void saveWindowState(int x, int y, int width, int height);

/**
 * Get the path to the window state file.
 */
std::string getWindowStatePath();
