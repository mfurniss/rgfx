/**
 * Demo Effects Implementation
 */
#include "demo.h"
#include "hal/platform.h"
#include <ArduinoJson.h>
#include <cstdio>

// Background colors for variety (nullptr means disabled)
static const char* backgroundColors[] = {
	"#4444AA",  // blue
	"#44AA44",  // green
	"#AA4444",  // red
	"#666666",  // gray
	"#AA44AA",  // purple
	"#44AAAA",  // cyan
	"#AAAA44",  // yellow
	nullptr,    // disabled
	nullptr,    // disabled (weighted)
};
static const int numBackgroundColors = sizeof(backgroundColors) / sizeof(backgroundColors[0]);

void triggerDemoEffect(EffectProcessor& processor, int effectType) {
	JsonDocument props;

	switch (effectType) {
		case 1: {
			// Pulse effect
			props["color"] = "random";
			props["duration"] = 800;
			props["fade"] = true;
			props["collapse"] = "random";
			processor.addEffect("pulse", props);
			printf("Triggered: pulse\n");
			break;
		}
		case 2: {
			// Wipe effect
			props["color"] = "random";
			props["duration"] = 500;
			props["direction"] = "random";
			processor.addEffect("wipe", props);
			printf("Triggered: wipe\n");
			break;
		}
		case 3: {
			// Explode effect
			props["color"] = "random";
			props["particleCount"] = 80;
			props["power"] = 60;
			props["lifespan"] = 1000;
			props["centerX"] = "random";
			props["centerY"] = "random";
			processor.addEffect("explode", props);
			printf("Triggered: explode\n");
			break;
		}
		case 4: {
			// Background effect - random color or disabled
			const char* color = backgroundColors[hal::random(0, numBackgroundColors)];
			if (color) {
				props["color"] = color;
				props["enabled"] = true;
				printf("Triggered: background (%s)\n", color);
			} else {
				props["enabled"] = false;
				printf("Triggered: background (disabled)\n");
			}
			processor.addEffect("background", props);
			break;
		}
	}
}
