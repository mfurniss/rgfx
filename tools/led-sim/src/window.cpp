/**
 * Window Sizing Implementation
 */
#include "window.h"
#include "constants.h"

void calculateWindowSize(uint16_t ledWidth, uint16_t ledHeight,
                         int& windowWidth, int& windowHeight,
                         float& ledSize, float& ledGap) {
	// Use fixed LED size and gap from constants
	ledSize = MAX_LED_SIZE;
	ledGap = LED_GAP;

	// Calculate grid size
	float gridWidth = ledWidth * (ledSize + ledGap) - ledGap;
	float gridHeight = ledHeight * (ledSize + ledGap) - ledGap;

	// Calculate window size needed
	windowWidth = static_cast<int>(gridWidth + WINDOW_PADDING * 2);
	windowHeight = static_cast<int>(gridHeight + WINDOW_PADDING * 2 + STATUS_BAR_HEIGHT);

	// Scale down if too large
	if (windowWidth > MAX_WINDOW_WIDTH || windowHeight > MAX_WINDOW_HEIGHT) {
		float scaleX = static_cast<float>(MAX_WINDOW_WIDTH - WINDOW_PADDING * 2) / gridWidth;
		float scaleY = static_cast<float>(MAX_WINDOW_HEIGHT - WINDOW_PADDING * 2 - STATUS_BAR_HEIGHT) / gridHeight;
		float scale = (scaleX < scaleY) ? scaleX : scaleY;

		ledSize *= scale;
		// Keep gap fixed, don't scale it

		gridWidth = ledWidth * (ledSize + ledGap) - ledGap;
		gridHeight = ledHeight * (ledSize + ledGap) - ledGap;

		windowWidth = static_cast<int>(gridWidth + WINDOW_PADDING * 2);
		windowHeight = static_cast<int>(gridHeight + WINDOW_PADDING * 2 + STATUS_BAR_HEIGHT);
	}

	// Enforce minimum LED size
	if (ledSize < MIN_LED_SIZE) {
		ledSize = MIN_LED_SIZE;
		gridWidth = ledWidth * (ledSize + ledGap) - ledGap;
		gridHeight = ledHeight * (ledSize + ledGap) - ledGap;
		windowWidth = static_cast<int>(gridWidth + WINDOW_PADDING * 2);
		windowHeight = static_cast<int>(gridHeight + WINDOW_PADDING * 2 + STATUS_BAR_HEIGHT);
	}

	// Enforce minimum window size
	if (windowWidth < MIN_WINDOW_WIDTH) windowWidth = MIN_WINDOW_WIDTH;
	if (windowHeight < MIN_WINDOW_HEIGHT) windowHeight = MIN_WINDOW_HEIGHT;
}

void calculateLedSizeForWindow(int windowWidth, int windowHeight,
                               uint16_t ledWidth, uint16_t ledHeight,
                               float& ledSize, float& ledGap) {
	// Calculate available space for the LED grid
	float availableWidth = static_cast<float>(windowWidth - WINDOW_PADDING * 2);
	float availableHeight = static_cast<float>(windowHeight - WINDOW_PADDING * 2 - STATUS_BAR_HEIGHT);

	// LED_GAP is the base gap at MAX_LED_SIZE, scale proportionally
	// Grid formula: gridSize = ledCount * ledSize + (ledCount - 1) * gap
	// With gap = ledSize * (LED_GAP / MAX_LED_SIZE):
	// gridSize = ledCount * ledSize + (ledCount - 1) * ledSize * ratio
	// gridSize = ledSize * (ledCount + (ledCount - 1) * ratio)
	float gapRatio = LED_GAP / MAX_LED_SIZE;
	float ledSizeX = availableWidth / (ledWidth + (ledWidth - 1) * gapRatio);
	float ledSizeY = availableHeight / (ledHeight + (ledHeight - 1) * gapRatio);

	// Use smaller of the two to maintain aspect ratio
	ledSize = (ledSizeX < ledSizeY) ? ledSizeX : ledSizeY;

	// Clamp to minimum
	if (ledSize < MIN_LED_SIZE) ledSize = MIN_LED_SIZE;

	// Scale gap proportionally with LED size
	ledGap = ledSize * gapRatio;
}
