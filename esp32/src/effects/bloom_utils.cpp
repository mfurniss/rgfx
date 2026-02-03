#include "bloom_utils.h"
#include <cstdlib>

// Pre-computed Euclidean distances * 16 for radius 4.
// Index = (dy + 4) * 9 + (dx + 4), where dx,dy in [-4, 4].
// Values: round(sqrt(dx*dx + dy*dy) * 16)
const uint8_t EUCLIDEAN_DIST_LUT[81] = {
	// dy=-4: dx from -4 to 4
	91, 80, 72, 66, 64, 66, 72, 80, 91,
	// dy=-3
	80, 68, 58, 51, 48, 51, 58, 68, 80,
	// dy=-2
	72, 58, 45, 36, 32, 36, 45, 58, 72,
	// dy=-1
	66, 51, 36, 23, 16, 23, 36, 51, 66,
	// dy=0
	64, 48, 32, 16,  0, 16, 32, 48, 64,
	// dy=1
	66, 51, 36, 23, 16, 23, 36, 51, 66,
	// dy=2
	72, 58, 45, 36, 32, 36, 45, 58, 72,
	// dy=3
	80, 68, 58, 51, 48, 51, 58, 68, 80,
	// dy=4
	91, 80, 72, 66, 64, 66, 72, 80, 91,
};

void renderBloom(
	Canvas& canvas,
	uint16_t centerX,
	uint16_t centerY,
	const CRGB& color,
	const BloomConfig& config,
	bool isStrip
) {
	if (config.radius == 0) return;

	uint16_t cw = canvas.getWidth();
	uint16_t ch = canvas.getHeight();

	// Max distance in fixed-point (radius * 16)
	uint8_t maxDist16 = config.radius * 16;

	if (isStrip) {
		// 1D horizontal bloom only
		for (int8_t dx = -static_cast<int8_t>(config.radius);
		     dx <= static_cast<int8_t>(config.radius); dx++) {
			if (dx == 0) continue;

			uint8_t dist16 = static_cast<uint8_t>(abs(dx)) * 16;
			uint8_t baseAlpha = config.intensity - (config.intensity * dist16) / (maxDist16 + 16);
			uint8_t alpha = (static_cast<uint16_t>(baseAlpha) * config.bloom) / 100;

			int16_t nx = static_cast<int16_t>(centerX) + (dx * 4);
			if (nx >= 0 && nx + 4 <= static_cast<int16_t>(cw)) {
				canvas.drawRectangle(
					static_cast<uint16_t>(nx), 0, 4, 1,
					CRGBA(color, alpha), BlendMode::ADDITIVE);
			}
		}
	} else {
		// 2D matrix bloom
		for (int8_t dy = -static_cast<int8_t>(config.radius);
		     dy <= static_cast<int8_t>(config.radius); dy++) {
			for (int8_t dx = -static_cast<int8_t>(config.radius);
			     dx <= static_cast<int8_t>(config.radius); dx++) {
				if (dx == 0 && dy == 0) continue;

				uint8_t dist16 = getEuclideanDist16(dx, dy);

				if (dist16 > maxDist16) continue;

				uint8_t baseAlpha = config.intensity - (config.intensity * dist16) / (maxDist16 + 16);
				uint8_t alpha = (static_cast<uint16_t>(baseAlpha) * config.bloom) / 100;

				int16_t nx = static_cast<int16_t>(centerX) + (dx * 4);
				int16_t ny = static_cast<int16_t>(centerY) + (dy * 4);

				if (nx >= 0 && ny >= 0 &&
				    nx + 4 <= static_cast<int16_t>(cw) &&
				    ny + 4 <= static_cast<int16_t>(ch)) {
					canvas.fillBlock4x4Additive(
						static_cast<uint16_t>(nx),
						static_cast<uint16_t>(ny),
						color, alpha);
				}
			}
		}
	}
}
