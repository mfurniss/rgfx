/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include <unity.h>
#include "coordinate_transforms.h"
#include "coordinate_transforms.cpp"

void setUp(void) {}

void tearDown(void) {}

void test_strip_layout_4x1() {
	uint16_t* map = buildCoordinateMap(4, 1, "strip");
	uint16_t expected[] = {0, 1, 2, 3};

	TEST_ASSERT_EQUAL_UINT16_ARRAY(expected, map, 4);

	delete[] map;
}

void test_matrix_tl_h_4x4() {
	uint16_t* map = buildCoordinateMap(4, 4, "matrix-tl-h");
	uint16_t expected[] = {
		0,  1,  2,  3,
		4,  5,  6,  7,
		8,  9, 10, 11,
		12, 13, 14, 15
	};

	TEST_ASSERT_EQUAL_UINT16_ARRAY(expected, map, 16);

	delete[] map;
}

void test_matrix_tl_h_snake_4x4() {
	uint16_t* map = buildCoordinateMap(4, 4, "matrix-tl-h-snake");
	uint16_t expected[] = {
		0, 1, 2, 3,
		7, 6, 5, 4,
		8, 9, 10, 11,
		15, 14, 13, 12
	};

	TEST_ASSERT_EQUAL_UINT16_ARRAY(expected, map, 16);

	delete[] map;
}

void test_matrix_tr_h_4x4() {
	uint16_t* map = buildCoordinateMap(4, 4, "matrix-tr-h");
	uint16_t expected[] = {
		3, 2, 1, 0,
		7, 6, 5, 4,
		11, 10, 9, 8,
		15, 14, 13, 12
	};

	TEST_ASSERT_EQUAL_UINT16_ARRAY(expected, map, 16);

	delete[] map;
}

void test_matrix_bl_h_4x4() {
	uint16_t* map = buildCoordinateMap(4, 4, "matrix-bl-h");
	uint16_t expected[] = {
		12, 13, 14, 15,
		8, 9, 10, 11,
		4, 5, 6, 7,
		0, 1, 2, 3
	};

	TEST_ASSERT_EQUAL_UINT16_ARRAY(expected, map, 16);

	delete[] map;
}

void test_matrix_br_h_4x4() {
	uint16_t* map = buildCoordinateMap(4, 4, "matrix-br-h");
	uint16_t expected[] = {
		15, 14, 13, 12,
		11, 10, 9, 8,
		7, 6, 5, 4,
		3, 2, 1, 0
	};

	TEST_ASSERT_EQUAL_UINT16_ARRAY(expected, map, 16);

	delete[] map;
}

void test_matrix_tl_v_4x4() {
	uint16_t* map = buildCoordinateMap(4, 4, "matrix-tl-v");
	uint16_t expected[] = {
		0, 4, 8, 12,
		1, 5, 9, 13,
		2, 6, 10, 14,
		3, 7, 11, 15
	};

	TEST_ASSERT_EQUAL_UINT16_ARRAY(expected, map, 16);

	delete[] map;
}

void test_matrix_tl_v_snake_4x4() {
	uint16_t* map = buildCoordinateMap(4, 4, "matrix-tl-v-snake");
	uint16_t expected[] = {
		0, 7, 8, 15,
		1, 6, 9, 14,
		2, 5, 10, 13,
		3, 4, 11, 12
	};

	TEST_ASSERT_EQUAL_UINT16_ARRAY(expected, map, 16);

	delete[] map;
}

void test_matrix_tr_v_4x4() {
	uint16_t* map = buildCoordinateMap(4, 4, "matrix-tr-v");
	uint16_t expected[] = {
		12, 8, 4, 0,
		13, 9, 5, 1,
		14, 10, 6, 2,
		15, 11, 7, 3
	};

	TEST_ASSERT_EQUAL_UINT16_ARRAY(expected, map, 16);

	delete[] map;
}

void test_matrix_bl_v_4x4() {
	uint16_t* map = buildCoordinateMap(4, 4, "matrix-bl-v");
	uint16_t expected[] = {
		3, 7, 11, 15,
		2, 6, 10, 14,
		1, 5, 9, 13,
		0, 4, 8, 12
	};

	TEST_ASSERT_EQUAL_UINT16_ARRAY(expected, map, 16);

	delete[] map;
}

void test_matrix_br_v_4x4() {
	uint16_t* map = buildCoordinateMap(4, 4, "matrix-br-v");
	uint16_t expected[] = {
		15, 11, 7, 3,
		14, 10, 6, 2,
		13, 9, 5, 1,
		12, 8, 4, 0
	};

	TEST_ASSERT_EQUAL_UINT16_ARRAY(expected, map, 16);

	delete[] map;
}

void test_unknown_layout_defaults_to_strip() {
	uint16_t* map = buildCoordinateMap(4, 1, "unknown-layout");
	uint16_t expected[] = {0, 1, 2, 3};

	TEST_ASSERT_EQUAL_UINT16_ARRAY(expected, map, 4);

	delete[] map;
}

void test_8x8_matrix_corners() {
	uint16_t* map = buildCoordinateMap(8, 8, "matrix-tl-h");

	TEST_ASSERT_EQUAL_UINT16(0, map[0]);    // Top-left
	TEST_ASSERT_EQUAL_UINT16(7, map[7]);    // Top-right
	TEST_ASSERT_EQUAL_UINT16(56, map[56]);  // Bottom-left
	TEST_ASSERT_EQUAL_UINT16(63, map[63]);  // Bottom-right

	delete[] map;
}

void test_8x32_matrix_corners() {
	uint16_t* map = buildCoordinateMap(8, 32, "matrix-tl-h");

	TEST_ASSERT_EQUAL_UINT16(0, map[0]);     // Top-left
	TEST_ASSERT_EQUAL_UINT16(7, map[7]);     // Top-right
	TEST_ASSERT_EQUAL_UINT16(248, map[248]); // Bottom-left
	TEST_ASSERT_EQUAL_UINT16(255, map[255]); // Bottom-right

	delete[] map;
}

// ============================================================================
// Unified Multi-Panel Coordinate Map Tests
// ============================================================================

void test_unified_single_panel() {
	// Single panel (1x1 grid) should behave like regular buildCoordinateMap
	uint8_t panelOrder[] = {0};
	uint16_t* map = buildUnifiedCoordinateMap(
	    4, 4,           // panelWidth=4, panelHeight=4
	    1, 1,           // unifiedCols=1, unifiedRows=1
	    panelOrder,
	    "matrix-tl-h"
	);

	uint16_t expected[] = {
		0,  1,  2,  3,
		4,  5,  6,  7,
		8,  9, 10, 11,
		12, 13, 14, 15
	};

	TEST_ASSERT_EQUAL_UINT16_ARRAY(expected, map, 16);
	free(map);
}

void test_unified_2x1_horizontal_panels() {
	// Two 4x1 strip panels side by side: [[0, 1]]
	// Panel 0 has LEDs 0-3, Panel 1 has LEDs 4-7
	uint8_t panelOrder[] = {0, 1};
	uint16_t* map = buildUnifiedCoordinateMap(
	    4, 1,           // panelWidth=4, panelHeight=1
	    2, 1,           // unifiedCols=2, unifiedRows=1
	    panelOrder,
	    "strip"
	);

	// Unified display is 8x1
	// x=0-3 maps to panel 0 (LEDs 0-3)
	// x=4-7 maps to panel 1 (LEDs 4-7)
	uint16_t expected[] = {0, 1, 2, 3, 4, 5, 6, 7};

	TEST_ASSERT_EQUAL_UINT16_ARRAY(expected, map, 8);
	free(map);
}

void test_unified_1x2_vertical_panels() {
	// Two 2x2 panels stacked vertically: [[0], [1]]
	// Panel 0 has LEDs 0-3, Panel 1 has LEDs 4-7
	uint8_t panelOrder[] = {0, 1};
	uint16_t* map = buildUnifiedCoordinateMap(
	    2, 2,           // panelWidth=2, panelHeight=2
	    1, 2,           // unifiedCols=1, unifiedRows=2
	    panelOrder,
	    "matrix-tl-h"
	);

	// Unified display is 2x4
	// Row 0-1 maps to panel 0, Row 2-3 maps to panel 1
	uint16_t expected[] = {
		0, 1,    // y=0: panel 0, row 0
		2, 3,    // y=1: panel 0, row 1
		4, 5,    // y=2: panel 1, row 0
		6, 7     // y=3: panel 1, row 1
	};

	TEST_ASSERT_EQUAL_UINT16_ARRAY(expected, map, 8);
	free(map);
}

void test_unified_2x2_panels_sequential() {
	// Four 2x2 panels in 2x2 grid: [[0, 1], [2, 3]]
	// Sequential wiring order
	uint8_t panelOrder[] = {0, 1, 2, 3};
	uint16_t* map = buildUnifiedCoordinateMap(
	    2, 2,           // panelWidth=2, panelHeight=2
	    2, 2,           // unifiedCols=2, unifiedRows=2
	    panelOrder,
	    "matrix-tl-h"
	);

	// Unified display is 4x4
	// Each panel has 4 LEDs (2x2)
	// Panel 0: LEDs 0-3, Panel 1: LEDs 4-7, Panel 2: LEDs 8-11, Panel 3: LEDs 12-15
	uint16_t expected[] = {
		0,  1,  4,  5,    // y=0: panel 0 row 0, panel 1 row 0
		2,  3,  6,  7,    // y=1: panel 0 row 1, panel 1 row 1
		8,  9, 12, 13,    // y=2: panel 2 row 0, panel 3 row 0
		10, 11, 14, 15    // y=3: panel 2 row 1, panel 3 row 1
	};

	TEST_ASSERT_EQUAL_UINT16_ARRAY(expected, map, 16);
	free(map);
}

void test_unified_2x2_panels_snake_wiring() {
	// Four 2x2 panels in 2x2 grid with snake wiring: [[0, 1], [3, 2]]
	// Common physical layout where cable snakes back
	uint8_t panelOrder[] = {0, 1, 3, 2};
	uint16_t* map = buildUnifiedCoordinateMap(
	    2, 2,           // panelWidth=2, panelHeight=2
	    2, 2,           // unifiedCols=2, unifiedRows=2
	    panelOrder,
	    "matrix-tl-h"
	);

	// Unified display is 4x4
	// Panel 0: LEDs 0-3, Panel 1: LEDs 4-7, Panel 2: LEDs 8-11, Panel 3: LEDs 12-15
	// But position [1,0] uses panel 3, position [1,1] uses panel 2
	uint16_t expected[] = {
		0,  1,  4,  5,    // y=0: panel 0 row 0, panel 1 row 0
		2,  3,  6,  7,    // y=1: panel 0 row 1, panel 1 row 1
		12, 13, 8,  9,    // y=2: panel 3 row 0, panel 2 row 0
		14, 15, 10, 11    // y=3: panel 3 row 1, panel 2 row 1
	};

	TEST_ASSERT_EQUAL_UINT16_ARRAY(expected, map, 16);
	free(map);
}

void test_unified_panel_reordering() {
	// Two panels with swapped order: [[1, 0]]
	// Panel 0 is on the right, Panel 1 is on the left
	uint8_t panelOrder[] = {1, 0};
	uint16_t* map = buildUnifiedCoordinateMap(
	    2, 2,           // panelWidth=2, panelHeight=2
	    2, 1,           // unifiedCols=2, unifiedRows=1
	    panelOrder,
	    "matrix-tl-h"
	);

	// Unified display is 4x2
	// Left half (x=0-1) uses panel 1 (LEDs 4-7)
	// Right half (x=2-3) uses panel 0 (LEDs 0-3)
	uint16_t expected[] = {
		4, 5, 0, 1,    // y=0: panel 1 row 0, panel 0 row 0
		6, 7, 2, 3     // y=1: panel 1 row 1, panel 0 row 1
	};

	TEST_ASSERT_EQUAL_UINT16_ARRAY(expected, map, 8);
	free(map);
}

void test_unified_with_snake_layout() {
	// Two 2x2 panels with snake wiring within each panel
	uint8_t panelOrder[] = {0, 1};
	uint16_t* map = buildUnifiedCoordinateMap(
	    2, 2,           // panelWidth=2, panelHeight=2
	    2, 1,           // unifiedCols=2, unifiedRows=1
	    panelOrder,
	    "matrix-tl-h-snake"
	);

	// Each panel uses snake layout:
	// Panel 0: (0,0)->0, (1,0)->1, (1,1)->2, (0,1)->3
	// Panel 1: (0,0)->4, (1,0)->5, (1,1)->6, (0,1)->7
	uint16_t expected[] = {
		0, 1, 4, 5,    // y=0: forward
		3, 2, 7, 6     // y=1: snake back
	};

	TEST_ASSERT_EQUAL_UINT16_ARRAY(expected, map, 8);
	free(map);
}

int main(int argc, char** argv) {
	UNITY_BEGIN();

	RUN_TEST(test_strip_layout_4x1);
	RUN_TEST(test_matrix_tl_h_4x4);
	RUN_TEST(test_matrix_tl_h_snake_4x4);
	RUN_TEST(test_matrix_tr_h_4x4);
	RUN_TEST(test_matrix_bl_h_4x4);
	RUN_TEST(test_matrix_br_h_4x4);
	RUN_TEST(test_matrix_tl_v_4x4);
	RUN_TEST(test_matrix_tl_v_snake_4x4);
	RUN_TEST(test_matrix_tr_v_4x4);
	RUN_TEST(test_matrix_bl_v_4x4);
	RUN_TEST(test_matrix_br_v_4x4);
	RUN_TEST(test_unknown_layout_defaults_to_strip);
	RUN_TEST(test_8x8_matrix_corners);
	RUN_TEST(test_8x32_matrix_corners);

	// Unified multi-panel tests
	RUN_TEST(test_unified_single_panel);
	RUN_TEST(test_unified_2x1_horizontal_panels);
	RUN_TEST(test_unified_1x2_vertical_panels);
	RUN_TEST(test_unified_2x2_panels_sequential);
	RUN_TEST(test_unified_2x2_panels_snake_wiring);
	RUN_TEST(test_unified_panel_reordering);
	RUN_TEST(test_unified_with_snake_layout);

	return UNITY_END();
}
