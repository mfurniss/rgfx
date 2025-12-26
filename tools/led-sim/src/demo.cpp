/**
 * Demo Effects Implementation
 */
#include "demo.h"
#include "hal/platform.h"
#include <ArduinoJson.h>
#include <cmath>
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
		case 7: {
			// Spectrum analyzer - 5 random values 0-9
			JsonArray values = props["values"].to<JsonArray>();
			for (int i = 0; i < 5; i++) {
				values.add(hal::random(0, 10));
			}
			processor.addEffect("spectrum", props);
			logEffect("spectrum", props);
			break;
		}
	}
}

// Spectrum demo state
static float spectrumPhase = 0.0f;
static constexpr int SPECTRUM_COLUMNS = 5;
static constexpr float SPECTRUM_UPDATE_RATE = 15.0f;  // Updates per second (match FFT fps)
static float spectrumTimer = 0.0f;

void updateSpectrumDemo(EffectProcessor& processor, float deltaTime, bool enabled) {
	if (!enabled) {
		return;
	}

	spectrumTimer += deltaTime;
	if (spectrumTimer < 1.0f / SPECTRUM_UPDATE_RATE) {
		return;
	}
	spectrumTimer = 0.0f;

	// Advance phase for animation
	spectrumPhase += 0.15f;

	JsonDocument props;
	JsonArray values = props["values"].to<JsonArray>();

	// Generate animated FFT-like values using multiple sine waves
	for (int i = 0; i < SPECTRUM_COLUMNS; i++) {
		// Each column has different frequency and phase offset
		float freq1 = 1.0f + i * 0.3f;
		float freq2 = 2.5f - i * 0.2f;
		float phase1 = spectrumPhase * freq1 + i * 0.8f;
		float phase2 = spectrumPhase * freq2 + i * 1.2f;

		// Combine multiple waves for more organic movement
		float wave1 = sinf(phase1) * 0.5f + 0.5f;
		float wave2 = sinf(phase2) * 0.3f + 0.3f;
		float noise = (hal::random(0, 100) / 100.0f) * 0.2f;

		float value = (wave1 + wave2 + noise) * 0.6f;
		value = fminf(1.0f, fmaxf(0.0f, value));

		// Scale to 0-9 range
		int intValue = static_cast<int>(value * 9.0f);
		values.add(intValue);
	}

	processor.addEffect("spectrum", props);
}
