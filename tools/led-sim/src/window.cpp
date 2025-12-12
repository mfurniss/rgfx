/**
 * Window Sizing Implementation
 */
#include "window.h"
#include "constants.h"

void calculateWindowSize(uint16_t ledWidth, uint16_t ledHeight,
                         int& windowWidth, int& windowHeight,
                         float& ledSize, float& ledGap) {
	// Start with max LED size
	ledSize = MAX_LED_SIZE;
	ledGap = ledSize * 0.15f;  // 15% gap

	// Calculate grid size at max LED size
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
		ledGap = ledSize * 0.15f;

		gridWidth = ledWidth * (ledSize + ledGap) - ledGap;
		gridHeight = ledHeight * (ledSize + ledGap) - ledGap;

		windowWidth = static_cast<int>(gridWidth + WINDOW_PADDING * 2);
		windowHeight = static_cast<int>(gridHeight + WINDOW_PADDING * 2 + STATUS_BAR_HEIGHT);
	}

	// Enforce minimum LED size
	if (ledSize < MIN_LED_SIZE) {
		ledSize = MIN_LED_SIZE;
		ledGap = 1.0f;
		gridWidth = ledWidth * (ledSize + ledGap) - ledGap;
		gridHeight = ledHeight * (ledSize + ledGap) - ledGap;
		windowWidth = static_cast<int>(gridWidth + WINDOW_PADDING * 2);
		windowHeight = static_cast<int>(gridHeight + WINDOW_PADDING * 2 + STATUS_BAR_HEIGHT);
	}

	// Enforce minimum window size
	if (windowWidth < MIN_WINDOW_WIDTH) windowWidth = MIN_WINDOW_WIDTH;
	if (windowHeight < MIN_WINDOW_HEIGHT) windowHeight = MIN_WINDOW_HEIGHT;
}
