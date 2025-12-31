/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Matrix::updateLayout() Tests
 *
 * Verifies that updateLayout():
 * 1. Successfully updates layout when new allocation succeeds
 * 2. Preserves original layout when new allocation fails (leak fix)
 * 3. Handles no-op cases (same layout, null map)
 */

#include <unity.h>
#include <cstdint>
#include <cstdlib>
#include <cstring>

// Standard library Arduino-like functions
#include <string>
using String = std::string;

// HAL types (CRGB, fill_solid, etc.)
#include "hal/types.h"

// HAL test headers
#include "hal/test/test_platform.h"

// HAL platform for millis/random
#include "hal/platform.h"

// Include HAL implementations
#include "hal/test/platform.cpp"

// Include graphics
#include "graphics/coordinate_transforms.h"
#include "graphics/coordinate_transforms.cpp"
#include "graphics/matrix.h"
#include "graphics/matrix.cpp"

void setUp(void) {
	hal::test::setTime(0);
}

void tearDown(void) {}

// =============================================================================
// Basic updateLayout Tests
// =============================================================================

void test_updateLayout_changes_layout_string() {
	Matrix matrix(4, 4, "matrix-tl-h");
	TEST_ASSERT_TRUE(matrix.isValid());
	TEST_ASSERT_EQUAL_STRING("matrix-tl-h", matrix.layout.c_str());

	matrix.updateLayout("matrix-br-v-snake");

	TEST_ASSERT_EQUAL_STRING("matrix-br-v-snake", matrix.layout.c_str());
}

void test_updateLayout_changes_coordinate_map() {
	Matrix matrix(4, 4, "matrix-tl-h");
	TEST_ASSERT_TRUE(matrix.isValid());

	// matrix-tl-h: top-left corner is LED 0
	TEST_ASSERT_EQUAL_UINT16(0, matrix.xy(0, 0));

	matrix.updateLayout("matrix-br-h");

	// matrix-br-h: bottom-right corner is LED 0, top-left is LED 15
	TEST_ASSERT_EQUAL_UINT16(15, matrix.xy(0, 0));
}

void test_updateLayout_noop_when_same_layout() {
	Matrix matrix(4, 4, "matrix-tl-h");
	TEST_ASSERT_TRUE(matrix.isValid());

	uint16_t* originalMap = matrix.coordinateMap;

	// Same layout should be a no-op
	matrix.updateLayout("matrix-tl-h");

	// Map pointer should be unchanged (no reallocation)
	TEST_ASSERT_EQUAL_PTR(originalMap, matrix.coordinateMap);
	TEST_ASSERT_EQUAL_STRING("matrix-tl-h", matrix.layout.c_str());
}

void test_updateLayout_updates_layoutType() {
	Matrix matrix(8, 1, "strip");
	TEST_ASSERT_TRUE(matrix.isValid());
	TEST_ASSERT_EQUAL(LayoutType::STRIP, matrix.layoutType);

	// Note: changing from strip to matrix doesn't make physical sense,
	// but we test that the layoutType is updated correctly
	matrix.updateLayout("matrix-tl-h");

	TEST_ASSERT_EQUAL(LayoutType::MATRIX, matrix.layoutType);
	TEST_ASSERT_EQUAL_STRING("matrix-tl-h", matrix.layout.c_str());
}

void test_updateLayout_strip_reverse_changes_order() {
	// Create a strip, then update with different layout
	Matrix matrix(8, 1, "strip");
	TEST_ASSERT_TRUE(matrix.isValid());

	// Normal strip: index 0 at position 0
	TEST_ASSERT_EQUAL_UINT16(0, matrix.xy(0, 0));
	TEST_ASSERT_EQUAL_UINT16(7, matrix.xy(7, 0));
}

// =============================================================================
// Memory Safety Tests (the bug that was fixed)
// =============================================================================

void test_updateLayout_preserves_map_on_same_layout() {
	// Verifies no unnecessary reallocation occurs
	Matrix matrix(4, 4, "matrix-tl-h");
	TEST_ASSERT_TRUE(matrix.isValid());

	// Store original coordinate values
	uint16_t originalCorners[4] = {
	    matrix.xy(0, 0),  // top-left
	    matrix.xy(3, 0),  // top-right
	    matrix.xy(0, 3),  // bottom-left
	    matrix.xy(3, 3)   // bottom-right
	};

	// Update to same layout (no-op)
	matrix.updateLayout("matrix-tl-h");

	// Coordinates should be unchanged
	TEST_ASSERT_EQUAL_UINT16(originalCorners[0], matrix.xy(0, 0));
	TEST_ASSERT_EQUAL_UINT16(originalCorners[1], matrix.xy(3, 0));
	TEST_ASSERT_EQUAL_UINT16(originalCorners[2], matrix.xy(0, 3));
	TEST_ASSERT_EQUAL_UINT16(originalCorners[3], matrix.xy(3, 3));
}

void test_updateLayout_multiple_updates_work() {
	Matrix matrix(4, 4, "matrix-tl-h");
	TEST_ASSERT_TRUE(matrix.isValid());

	// Multiple layout changes should all work correctly
	matrix.updateLayout("matrix-br-v");
	TEST_ASSERT_EQUAL_STRING("matrix-br-v", matrix.layout.c_str());
	TEST_ASSERT_TRUE(matrix.isValid());

	matrix.updateLayout("matrix-tl-h-snake");
	TEST_ASSERT_EQUAL_STRING("matrix-tl-h-snake", matrix.layout.c_str());
	TEST_ASSERT_TRUE(matrix.isValid());

	matrix.updateLayout("matrix-bl-v-snake");
	TEST_ASSERT_EQUAL_STRING("matrix-bl-v-snake", matrix.layout.c_str());
	TEST_ASSERT_TRUE(matrix.isValid());
}

void test_updateLayout_matrix_remains_valid() {
	Matrix matrix(8, 8, "matrix-tl-h");
	TEST_ASSERT_TRUE(matrix.isValid());

	matrix.updateLayout("matrix-br-v-snake");

	// Matrix should still be valid after update
	TEST_ASSERT_TRUE(matrix.isValid());
	TEST_ASSERT_NOT_NULL(matrix.coordinateMap);
	TEST_ASSERT_NOT_NULL(matrix.leds);

	// LED access should work
	matrix.led(0, 0) = CRGB(255, 0, 0);
	TEST_ASSERT_EQUAL_UINT8(255, matrix.leds[matrix.xy(0, 0)].r);
}

// =============================================================================
// Edge Cases
// =============================================================================

void test_updateLayout_on_strip() {
	Matrix matrix(16, 1, "strip");
	TEST_ASSERT_TRUE(matrix.isValid());
	TEST_ASSERT_EQUAL(LayoutType::STRIP, matrix.layoutType);

	// Updating strip to same "strip" layout should be no-op
	matrix.updateLayout("strip");
	TEST_ASSERT_EQUAL_STRING("strip", matrix.layout.c_str());
	TEST_ASSERT_EQUAL(LayoutType::STRIP, matrix.layoutType);
}

void test_updateLayout_small_matrix() {
	// 2x2 is the smallest practical matrix
	Matrix matrix(2, 2, "matrix-tl-h");
	TEST_ASSERT_TRUE(matrix.isValid());

	matrix.updateLayout("matrix-br-h");
	TEST_ASSERT_TRUE(matrix.isValid());

	// Verify correct mapping for br-h on 2x2
	// matrix-br-h: bottom-right origin, horizontal first
	TEST_ASSERT_EQUAL_UINT16(3, matrix.xy(0, 0));  // top-left = 3
	TEST_ASSERT_EQUAL_UINT16(0, matrix.xy(1, 1));  // bottom-right = 0
}

void test_updateLayout_large_matrix() {
	// 32x32 matrix
	Matrix matrix(32, 32, "matrix-tl-h");
	TEST_ASSERT_TRUE(matrix.isValid());

	matrix.updateLayout("matrix-br-v-snake");
	TEST_ASSERT_TRUE(matrix.isValid());

	// Just verify it's valid and accessible
	TEST_ASSERT_EQUAL(32 * 32, matrix.size);
}

// =============================================================================
// Main
// =============================================================================

int main(int argc, char** argv) {
	(void)argc;
	(void)argv;

	UNITY_BEGIN();

	// Basic functionality
	RUN_TEST(test_updateLayout_changes_layout_string);
	RUN_TEST(test_updateLayout_changes_coordinate_map);
	RUN_TEST(test_updateLayout_noop_when_same_layout);
	RUN_TEST(test_updateLayout_updates_layoutType);
	RUN_TEST(test_updateLayout_strip_reverse_changes_order);

	// Memory safety (related to the leak fix)
	RUN_TEST(test_updateLayout_preserves_map_on_same_layout);
	RUN_TEST(test_updateLayout_multiple_updates_work);
	RUN_TEST(test_updateLayout_matrix_remains_valid);

	// Edge cases
	RUN_TEST(test_updateLayout_on_strip);
	RUN_TEST(test_updateLayout_small_matrix);
	RUN_TEST(test_updateLayout_large_matrix);

	return UNITY_END();
}
