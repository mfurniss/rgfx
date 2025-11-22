#ifndef SCALE_H
#define SCALE_H

#include <functional>
#include <cmath>

/**
 * Creates a linear scaling function that maps values from an input domain to an output range.
 * Similar to D3's scaleLinear() pattern.
 *
 * @param inMin   Minimum value of input domain
 * @param inMax   Maximum value of input domain
 * @param outMin  Minimum value of output range
 * @param outMax  Maximum value of output range
 * @return Lambda function that performs linear scaling with clamping
 *
 * @example
 * // Map elapsed time (0-1000ms) to row position (0-63)
 * auto rowScaler = createLinearScale<uint32_t>(0, 1000, 0, 63);
 * uint32_t row = rowScaler(500); // Returns 31 (halfway)
 */
template <typename T>
std::function<T(T)> createLinearScale(T inMin, T inMax, T outMin, T outMax) {
	return [=](T value) -> T {
		// Clamp input to domain
		if (value <= inMin)
			return outMin;
		if (value >= inMax)
			return outMax;

		// Linear interpolation
		return outMin + (value - inMin) * (outMax - outMin) / (inMax - inMin);
	};
}

/**
 * Creates a logarithmic scaling function that maps values from an input domain to an output
 * range. Similar to D3's scaleLog() pattern. Uses natural logarithm (base e) for smooth scaling.
 *
 * @param inMin   Minimum value of input domain (must be > 0)
 * @param inMax   Maximum value of input domain (must be > inMin)
 * @param outMin  Minimum value of output range
 * @param outMax  Maximum value of output range
 * @return Lambda function that performs logarithmic scaling with clamping
 *
 * @example
 * // Map elapsed time (1-1000ms) to row position (0-63) with logarithmic curve
 * auto rowScaler = createLogScale<uint32_t>(1, 1000, 0, 63);
 * uint32_t row = rowScaler(100); // Returns ~30 (logarithmic progression)
 */
template <typename T>
std::function<T(T)> createLogScale(T inMin, T inMax, T outMin, T outMax) {
	return [=](T value) -> T {
		// Clamp input to domain
		if (value <= inMin)
			return outMin;
		if (value >= inMax)
			return outMax;

		// Logarithmic interpolation: log(value/inMin) / log(inMax/inMin)
		double normalizedInput = static_cast<double>(value - inMin) / (inMax - inMin);
		double logValue = std::log(1.0 + normalizedInput * (std::exp(1.0) - 1.0));

		return static_cast<T>(outMin + logValue * (outMax - outMin));
	};
}

#endif // SCALE_H
