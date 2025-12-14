/**
 * Window State Persistence Implementation
 */
#include "window_state.h"
#include <cstdio>
#include <cstdlib>

std::string getWindowStatePath() {
	const char* home = getenv("HOME");
	if (!home) {
		return "";
	}
	return std::string(home) + "/.rgfx/led-sim-window.state";
}

WindowState loadWindowState() {
	WindowState state = {0, 0, 0, 0, false};

	std::string path = getWindowStatePath();
	if (path.empty()) {
		return state;
	}

	FILE* f = fopen(path.c_str(), "r");
	if (!f) {
		return state;
	}

	if (fscanf(f, "%d %d %d %d", &state.x, &state.y, &state.width, &state.height) == 4) {
		// Basic validation
		if (state.width > 0 && state.height > 0) {
			state.valid = true;
		}
	}

	fclose(f);
	return state;
}

void saveWindowState(int x, int y, int width, int height) {
	std::string path = getWindowStatePath();
	if (path.empty()) {
		return;
	}

	FILE* f = fopen(path.c_str(), "w");
	if (!f) {
		return;
	}

	fprintf(f, "%d %d %d %d\n", x, y, width, height);
	fclose(f);
}
