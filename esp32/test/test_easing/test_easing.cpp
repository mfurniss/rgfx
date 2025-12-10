/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include <unity.h>
#include <cmath>

// Include production code directly
#include "easing.h"
#include "easing_impl.cpp"

void setUp(void) {}
void tearDown(void) {}

// Tolerance for floating point comparisons
#define EPSILON 0.0001f

// =============================================================================
// Helper macros for boundary testing
// =============================================================================

#define TEST_EASING_BOUNDARIES(func) \
	TEST_ASSERT_FLOAT_WITHIN(EPSILON, 0.0f, func(0.0f)); \
	TEST_ASSERT_FLOAT_WITHIN(EPSILON, 1.0f, func(1.0f));

// =============================================================================
// Linear interpolation
// =============================================================================

void test_linear_at_zero() {
	TEST_ASSERT_FLOAT_WITHIN(EPSILON, 0.0f, linearInterpolationf(0.0f));
}

void test_linear_at_one() {
	TEST_ASSERT_FLOAT_WITHIN(EPSILON, 1.0f, linearInterpolationf(1.0f));
}

void test_linear_at_half() {
	TEST_ASSERT_FLOAT_WITHIN(EPSILON, 0.5f, linearInterpolationf(0.5f));
}

void test_linear_at_quarter() {
	TEST_ASSERT_FLOAT_WITHIN(EPSILON, 0.25f, linearInterpolationf(0.25f));
}

// =============================================================================
// Quadratic easing
// =============================================================================

void test_quadratic_ease_in_boundaries() {
	TEST_EASING_BOUNDARIES(quadraticEaseInf);
}

void test_quadratic_ease_in_at_half() {
	// y = x^2, so 0.5^2 = 0.25
	TEST_ASSERT_FLOAT_WITHIN(EPSILON, 0.25f, quadraticEaseInf(0.5f));
}

void test_quadratic_ease_out_boundaries() {
	TEST_EASING_BOUNDARIES(quadraticEaseOutf);
}

void test_quadratic_ease_out_at_half() {
	// y = -(x * (x - 2)) = -x^2 + 2x, so -0.25 + 1.0 = 0.75
	TEST_ASSERT_FLOAT_WITHIN(EPSILON, 0.75f, quadraticEaseOutf(0.5f));
}

void test_quadratic_ease_in_out_boundaries() {
	TEST_EASING_BOUNDARIES(quadraticEaseInOutf);
}

void test_quadratic_ease_in_out_at_half() {
	// At exactly 0.5, the function transitions - should be 0.5
	TEST_ASSERT_FLOAT_WITHIN(EPSILON, 0.5f, quadraticEaseInOutf(0.5f));
}

// =============================================================================
// Cubic easing
// =============================================================================

void test_cubic_ease_in_boundaries() {
	TEST_EASING_BOUNDARIES(cubicEaseInf);
}

void test_cubic_ease_in_at_half() {
	// y = x^3, so 0.5^3 = 0.125
	TEST_ASSERT_FLOAT_WITHIN(EPSILON, 0.125f, cubicEaseInf(0.5f));
}

void test_cubic_ease_out_boundaries() {
	TEST_EASING_BOUNDARIES(cubicEaseOutf);
}

void test_cubic_ease_out_at_half() {
	// y = (x-1)^3 + 1 = (-0.5)^3 + 1 = -0.125 + 1 = 0.875
	TEST_ASSERT_FLOAT_WITHIN(EPSILON, 0.875f, cubicEaseOutf(0.5f));
}

void test_cubic_ease_in_out_boundaries() {
	TEST_EASING_BOUNDARIES(cubicEaseInOutf);
}

void test_cubic_ease_in_out_at_half() {
	TEST_ASSERT_FLOAT_WITHIN(EPSILON, 0.5f, cubicEaseInOutf(0.5f));
}

// =============================================================================
// Quartic easing
// =============================================================================

void test_quartic_ease_in_boundaries() {
	TEST_EASING_BOUNDARIES(quarticEaseInf);
}

void test_quartic_ease_in_at_half() {
	// y = x^4, so 0.5^4 = 0.0625
	TEST_ASSERT_FLOAT_WITHIN(EPSILON, 0.0625f, quarticEaseInf(0.5f));
}

void test_quartic_ease_out_boundaries() {
	TEST_EASING_BOUNDARIES(quarticEaseOutf);
}

void test_quartic_ease_in_out_boundaries() {
	TEST_EASING_BOUNDARIES(quarticEaseInOutf);
}

void test_quartic_ease_in_out_at_half() {
	TEST_ASSERT_FLOAT_WITHIN(EPSILON, 0.5f, quarticEaseInOutf(0.5f));
}

// =============================================================================
// Quintic easing
// =============================================================================

void test_quintic_ease_in_boundaries() {
	TEST_EASING_BOUNDARIES(quinticEaseInf);
}

void test_quintic_ease_in_at_half() {
	// y = x^5, so 0.5^5 = 0.03125
	TEST_ASSERT_FLOAT_WITHIN(EPSILON, 0.03125f, quinticEaseInf(0.5f));
}

void test_quintic_ease_out_boundaries() {
	TEST_EASING_BOUNDARIES(quinticEaseOutf);
}

void test_quintic_ease_in_out_boundaries() {
	TEST_EASING_BOUNDARIES(quinticEaseInOutf);
}

void test_quintic_ease_in_out_at_half() {
	TEST_ASSERT_FLOAT_WITHIN(EPSILON, 0.5f, quinticEaseInOutf(0.5f));
}

// =============================================================================
// Sine easing
// =============================================================================

void test_sine_ease_in_boundaries() {
	TEST_EASING_BOUNDARIES(sineEaseInf);
}

void test_sine_ease_out_boundaries() {
	TEST_EASING_BOUNDARIES(sineEaseOutf);
}

void test_sine_ease_out_at_half() {
	// sin(0.5 * pi/2) = sin(pi/4) ≈ 0.7071
	TEST_ASSERT_FLOAT_WITHIN(EPSILON, 0.7071f, sineEaseOutf(0.5f));
}

void test_sine_ease_in_out_boundaries() {
	TEST_EASING_BOUNDARIES(sineEaseInOutf);
}

void test_sine_ease_in_out_at_half() {
	TEST_ASSERT_FLOAT_WITHIN(EPSILON, 0.5f, sineEaseInOutf(0.5f));
}

// =============================================================================
// Circular easing
// =============================================================================

void test_circular_ease_in_boundaries() {
	TEST_EASING_BOUNDARIES(circularEaseInf);
}

void test_circular_ease_out_boundaries() {
	TEST_EASING_BOUNDARIES(circularEaseOutf);
}

void test_circular_ease_in_out_boundaries() {
	TEST_EASING_BOUNDARIES(circularEaseInOutf);
}

void test_circular_ease_in_out_at_half() {
	TEST_ASSERT_FLOAT_WITHIN(EPSILON, 0.5f, circularEaseInOutf(0.5f));
}

// =============================================================================
// Exponential easing
// =============================================================================

void test_exponential_ease_in_boundaries() {
	TEST_EASING_BOUNDARIES(exponentialEaseInf);
}

void test_exponential_ease_out_boundaries() {
	TEST_EASING_BOUNDARIES(exponentialEaseOutf);
}

void test_exponential_ease_in_out_boundaries() {
	TEST_EASING_BOUNDARIES(exponentialEaseInOutf);
}

void test_exponential_ease_in_out_at_half() {
	TEST_ASSERT_FLOAT_WITHIN(EPSILON, 0.5f, exponentialEaseInOutf(0.5f));
}

// =============================================================================
// Elastic easing
// =============================================================================

void test_elastic_ease_in_at_zero() {
	TEST_ASSERT_FLOAT_WITHIN(EPSILON, 0.0f, elasticEaseInf(0.0f));
}

void test_elastic_ease_in_at_one() {
	TEST_ASSERT_FLOAT_WITHIN(EPSILON, 1.0f, elasticEaseInf(1.0f));
}

void test_elastic_ease_out_at_zero() {
	TEST_ASSERT_FLOAT_WITHIN(EPSILON, 0.0f, elasticEaseOutf(0.0f));
}

void test_elastic_ease_out_at_one() {
	TEST_ASSERT_FLOAT_WITHIN(EPSILON, 1.0f, elasticEaseOutf(1.0f));
}

void test_elastic_ease_in_out_boundaries() {
	// Elastic can overshoot, so just verify endpoints
	TEST_ASSERT_FLOAT_WITHIN(0.01f, 0.0f, elasticEaseInOutf(0.0f));
	TEST_ASSERT_FLOAT_WITHIN(0.01f, 1.0f, elasticEaseInOutf(1.0f));
}

// =============================================================================
// Back easing (overshooting)
// =============================================================================

void test_back_ease_in_boundaries() {
	TEST_EASING_BOUNDARIES(backEaseInf);
}

void test_back_ease_in_overshoots() {
	// Back ease in should go negative at some point
	float val = backEaseInf(0.3f);
	TEST_ASSERT_TRUE(val < 0.0f);
}

void test_back_ease_out_boundaries() {
	TEST_EASING_BOUNDARIES(backEaseOutf);
}

void test_back_ease_out_overshoots() {
	// Back ease out should exceed 1.0 at some point
	float val = backEaseOutf(0.7f);
	TEST_ASSERT_TRUE(val > 1.0f);
}

void test_back_ease_in_out_boundaries() {
	TEST_EASING_BOUNDARIES(backEaseInOutf);
}

// =============================================================================
// Bounce easing
// =============================================================================

void test_bounce_ease_in_boundaries() {
	TEST_EASING_BOUNDARIES(bounceEaseInf);
}

void test_bounce_ease_out_boundaries() {
	TEST_EASING_BOUNDARIES(bounceEaseOutf);
}

void test_bounce_ease_in_out_boundaries() {
	TEST_EASING_BOUNDARIES(bounceEaseInOutf);
}

void test_bounce_ease_in_out_at_half() {
	TEST_ASSERT_FLOAT_WITHIN(EPSILON, 0.5f, bounceEaseInOutf(0.5f));
}

// =============================================================================
// getEasingFunction lookup tests
// =============================================================================

void test_lookup_linear() {
	EasingFunction func = getEasingFunction("linear");
	TEST_ASSERT_TRUE(func == linearInterpolationf);
}

void test_lookup_quadraticOut() {
	EasingFunction func = getEasingFunction("quadraticOut");
	TEST_ASSERT_TRUE(func == quadraticEaseOutf);
}

void test_lookup_cubicInOut() {
	EasingFunction func = getEasingFunction("cubicInOut");
	TEST_ASSERT_TRUE(func == cubicEaseInOutf);
}

void test_lookup_bounceOut() {
	EasingFunction func = getEasingFunction("bounceOut");
	TEST_ASSERT_TRUE(func == bounceEaseOutf);
}

void test_lookup_unknown_returns_default() {
	// Unknown name should return quadraticEaseOutf as default
	EasingFunction func = getEasingFunction("unknownEasing");
	TEST_ASSERT_TRUE(func == quadraticEaseOutf);
}

void test_lookup_all_functions_exist() {
	// Verify all lookup entries return valid functions
	const char* names[] = {
		"linear", "quadraticIn", "quadraticOut", "quadraticInOut",
		"cubicIn", "cubicOut", "cubicInOut",
		"quarticIn", "quarticOut", "quarticInOut",
		"quinticIn", "quinticOut", "quinticInOut",
		"sineIn", "sineOut", "sineInOut",
		"circularIn", "circularOut", "circularInOut",
		"exponentialIn", "exponentialOut", "exponentialInOut",
		"elasticIn", "elasticOut", "elasticInOut",
		"backIn", "backOut", "backInOut",
		"bounceIn", "bounceOut", "bounceInOut"
	};

	for (size_t i = 0; i < sizeof(names)/sizeof(names[0]); i++) {
		EasingFunction func = getEasingFunction(names[i]);
		TEST_ASSERT_NOT_NULL(func);
		// Verify function is callable and returns valid values
		float result = func(0.5f);
		TEST_ASSERT_FALSE(isnan(result));
	}
}

// =============================================================================
// Monotonicity tests for well-behaved easings
// =============================================================================

void test_linear_is_monotonic() {
	float prev = linearInterpolationf(0.0f);
	for (float t = 0.1f; t <= 1.0f; t += 0.1f) {
		float curr = linearInterpolationf(t);
		TEST_ASSERT_TRUE(curr >= prev);
		prev = curr;
	}
}

void test_quadratic_ease_in_is_monotonic() {
	float prev = quadraticEaseInf(0.0f);
	for (float t = 0.1f; t <= 1.0f; t += 0.1f) {
		float curr = quadraticEaseInf(t);
		TEST_ASSERT_TRUE(curr >= prev);
		prev = curr;
	}
}

void test_quadratic_ease_out_is_monotonic() {
	float prev = quadraticEaseOutf(0.0f);
	for (float t = 0.1f; t <= 1.0f; t += 0.1f) {
		float curr = quadraticEaseOutf(t);
		TEST_ASSERT_TRUE(curr >= prev);
		prev = curr;
	}
}

int main(int argc, char** argv) {
	(void)argc;
	(void)argv;

	UNITY_BEGIN();

	// Linear
	RUN_TEST(test_linear_at_zero);
	RUN_TEST(test_linear_at_one);
	RUN_TEST(test_linear_at_half);
	RUN_TEST(test_linear_at_quarter);

	// Quadratic
	RUN_TEST(test_quadratic_ease_in_boundaries);
	RUN_TEST(test_quadratic_ease_in_at_half);
	RUN_TEST(test_quadratic_ease_out_boundaries);
	RUN_TEST(test_quadratic_ease_out_at_half);
	RUN_TEST(test_quadratic_ease_in_out_boundaries);
	RUN_TEST(test_quadratic_ease_in_out_at_half);

	// Cubic
	RUN_TEST(test_cubic_ease_in_boundaries);
	RUN_TEST(test_cubic_ease_in_at_half);
	RUN_TEST(test_cubic_ease_out_boundaries);
	RUN_TEST(test_cubic_ease_out_at_half);
	RUN_TEST(test_cubic_ease_in_out_boundaries);
	RUN_TEST(test_cubic_ease_in_out_at_half);

	// Quartic
	RUN_TEST(test_quartic_ease_in_boundaries);
	RUN_TEST(test_quartic_ease_in_at_half);
	RUN_TEST(test_quartic_ease_out_boundaries);
	RUN_TEST(test_quartic_ease_in_out_boundaries);
	RUN_TEST(test_quartic_ease_in_out_at_half);

	// Quintic
	RUN_TEST(test_quintic_ease_in_boundaries);
	RUN_TEST(test_quintic_ease_in_at_half);
	RUN_TEST(test_quintic_ease_out_boundaries);
	RUN_TEST(test_quintic_ease_in_out_boundaries);
	RUN_TEST(test_quintic_ease_in_out_at_half);

	// Sine
	RUN_TEST(test_sine_ease_in_boundaries);
	RUN_TEST(test_sine_ease_out_boundaries);
	RUN_TEST(test_sine_ease_out_at_half);
	RUN_TEST(test_sine_ease_in_out_boundaries);
	RUN_TEST(test_sine_ease_in_out_at_half);

	// Circular
	RUN_TEST(test_circular_ease_in_boundaries);
	RUN_TEST(test_circular_ease_out_boundaries);
	RUN_TEST(test_circular_ease_in_out_boundaries);
	RUN_TEST(test_circular_ease_in_out_at_half);

	// Exponential
	RUN_TEST(test_exponential_ease_in_boundaries);
	RUN_TEST(test_exponential_ease_out_boundaries);
	RUN_TEST(test_exponential_ease_in_out_boundaries);
	RUN_TEST(test_exponential_ease_in_out_at_half);

	// Elastic
	RUN_TEST(test_elastic_ease_in_at_zero);
	RUN_TEST(test_elastic_ease_in_at_one);
	RUN_TEST(test_elastic_ease_out_at_zero);
	RUN_TEST(test_elastic_ease_out_at_one);
	RUN_TEST(test_elastic_ease_in_out_boundaries);

	// Back
	RUN_TEST(test_back_ease_in_boundaries);
	RUN_TEST(test_back_ease_in_overshoots);
	RUN_TEST(test_back_ease_out_boundaries);
	RUN_TEST(test_back_ease_out_overshoots);
	RUN_TEST(test_back_ease_in_out_boundaries);

	// Bounce
	RUN_TEST(test_bounce_ease_in_boundaries);
	RUN_TEST(test_bounce_ease_out_boundaries);
	RUN_TEST(test_bounce_ease_in_out_boundaries);
	RUN_TEST(test_bounce_ease_in_out_at_half);

	// Lookup
	RUN_TEST(test_lookup_linear);
	RUN_TEST(test_lookup_quadraticOut);
	RUN_TEST(test_lookup_cubicInOut);
	RUN_TEST(test_lookup_bounceOut);
	RUN_TEST(test_lookup_unknown_returns_default);
	RUN_TEST(test_lookup_all_functions_exist);

	// Monotonicity
	RUN_TEST(test_linear_is_monotonic);
	RUN_TEST(test_quadratic_ease_in_is_monotonic);
	RUN_TEST(test_quadratic_ease_out_is_monotonic);

	return UNITY_END();
}
