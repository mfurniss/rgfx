/**
 * Demo Effects Implementation
 */
#include "demo.h"
#include "hal/platform.h"
#include <ArduinoJson.h>
#include <cstdio>
#include <cstdlib>
#include <string>

static void logEffect(const char* effectName, const JsonDocument& props) {
	std::string json;
	serializeJson(props, json);
	printf("Triggered: %s %s\n", effectName, json.c_str());
}

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
			logEffect("pulse", props);
			break;
		}
		case 2: {
			// Wipe effect
			props["color"] = "random";
			props["duration"] = 500;
			props["direction"] = "random";
			processor.addEffect("wipe", props);
			logEffect("wipe", props);
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
			logEffect("explode", props);
			break;
		}
		case 4: {
			// Background effect - random color or disabled
			const char* color = backgroundColors[hal::random(0, numBackgroundColors)];
			if (color) {
				props["color"] = color;
				props["enabled"] = true;
			} else {
				props["enabled"] = false;
			}
			processor.addEffect("background", props);
			logEffect("background", props);
			break;
		}
		case 5: {
			// Projectile effect
			props["color"] = "random";
			props["width"] = 8;
			props["direction"] = "random";
			props["velocity"] = 120;
			props["friction"] = -2;  // 0=none, 1=moderate, 2=fast decay
			props["trail"] = 0.3;
			processor.addEffect("projectile", props);
			logEffect("projectile", props);
			break;
		}
		case 6: {
			// Plasma effect - toggle on/off with random params
			static bool plasmaEnabled = false;
			plasmaEnabled = !plasmaEnabled;
			props["enabled"] = plasmaEnabled;
			if (plasmaEnabled) {
				// Randomize speed (0.3 to 5.0) and scale (0.5 to 5.0)
				props["speed"] = 0.3f + (rand() % 48) / 10.0f;
				props["scale"] = 0.5f + (rand() % 46) / 10.0f;
			}
			processor.addEffect("plasma", props);
			logEffect("plasma", props);
			break;
		}
	}
}
