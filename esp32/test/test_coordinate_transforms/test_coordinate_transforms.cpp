/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include <unity.h>
#include "../mocks/mock_arduino.h"

#include "coordinate_transforms.h"
#include "coordinate_transforms.cpp"

void setUp(void) {}

void tearDown(void) {}

void test_strip_layout_4x1() {
	uint16_t* map = buildCoordinateMap(4, 1, "strip");
	uint16_t expected[] = {0, 1, 2, 3};

	TEST_ASSERT_EQUAL_UINT16_ARRAY(expected, map, 4);

	free(map);
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

	free(map);
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

	free(map);
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

	free(map);
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

	free(map);
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

	free(map);
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

	free(map);
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

	free(map);
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

	free(map);
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

	free(map);
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

	free(map);
}

void test_unknown_layout_defaults_to_strip() {
	uint16_t* map = buildCoordinateMap(4, 1, "unknown-layout");
	uint16_t expected[] = {0, 1, 2, 3};

	TEST_ASSERT_EQUAL_UINT16_ARRAY(expected, map, 4);

	free(map);
}

void test_8x8_matrix_corners() {
	uint16_t* map = buildCoordinateMap(8, 8, "matrix-tl-h");

	TEST_ASSERT_EQUAL_UINT16(0, map[0]);    // Top-left
	TEST_ASSERT_EQUAL_UINT16(7, map[7]);    // Top-right
	TEST_ASSERT_EQUAL_UINT16(56, map[56]);  // Bottom-left
	TEST_ASSERT_EQUAL_UINT16(63, map[63]);  // Bottom-right

	free(map);
}

void test_8x32_matrix_corners() {
	uint16_t* map = buildCoordinateMap(8, 32, "matrix-tl-h");

	TEST_ASSERT_EQUAL_UINT16(0, map[0]);     // Top-left
	TEST_ASSERT_EQUAL_UINT16(7, map[7]);     // Top-right
	TEST_ASSERT_EQUAL_UINT16(248, map[248]); // Bottom-left
	TEST_ASSERT_EQUAL_UINT16(255, map[255]); // Bottom-right

	free(map);
}

// ============================================================================
// Unified Multi-Panel Coordinate Map Tests
// ============================================================================

void test_unified_single_panel() {
	// Single panel (1x1 grid) should behave like regular buildCoordinateMap
	uint8_t panelOrder[] = {0};
	uint8_t panelRotation[] = {0};  // No rotation
	uint16_t* map = buildUnifiedCoordinateMap(
	    4, 4,           // panelWidth=4, panelHeight=4
	    1, 1,           // unifiedCols=1, unifiedRows=1
	    panelOrder,
	    panelRotation,
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
	uint8_t panelRotation[] = {0, 0};  // No rotation
	uint16_t* map = buildUnifiedCoordinateMap(
	    4, 1,           // panelWidth=4, panelHeight=1
	    2, 1,           // unifiedCols=2, unifiedRows=1
	    panelOrder,
	    panelRotation,
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
	uint8_t panelRotation[] = {0, 0};  // No rotation
	uint16_t* map = buildUnifiedCoordinateMap(
	    2, 2,           // panelWidth=2, panelHeight=2
	    1, 2,           // unifiedCols=1, unifiedRows=2
	    panelOrder,
	    panelRotation,
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
	uint8_t panelRotation[] = {0, 0, 0, 0};  // No rotation
	uint16_t* map = buildUnifiedCoordinateMap(
	    2, 2,           // panelWidth=2, panelHeight=2
	    2, 2,           // unifiedCols=2, unifiedRows=2
	    panelOrder,
	    panelRotation,
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
	uint8_t panelRotation[] = {0, 0, 0, 0};  // No rotation
	uint16_t* map = buildUnifiedCoordinateMap(
	    2, 2,           // panelWidth=2, panelHeight=2
	    2, 2,           // unifiedCols=2, unifiedRows=2
	    panelOrder,
	    panelRotation,
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
	uint8_t panelRotation[] = {0, 0};  // No rotation
	uint16_t* map = buildUnifiedCoordinateMap(
	    2, 2,           // panelWidth=2, panelHeight=2
	    2, 1,           // unifiedCols=2, unifiedRows=1
	    panelOrder,
	    panelRotation,
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
	uint8_t panelRotation[] = {0, 0};  // No rotation
	uint16_t* map = buildUnifiedCoordinateMap(
	    2, 2,           // panelWidth=2, panelHeight=2
	    2, 1,           // unifiedCols=2, unifiedRows=1
	    panelOrder,
	    panelRotation,
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

// ============================================================================
// Panel Rotation Tests
// ============================================================================

void test_unified_single_panel_180_rotation() {
	// Single 2x2 panel rotated 180 degrees
	uint8_t panelOrder[] = {0};
	uint8_t panelRotation[] = {2};  // 180° rotation
	uint16_t* map = buildUnifiedCoordinateMap(
	    2, 2,           // panelWidth=2, panelHeight=2
	    1, 1,           // unifiedCols=1, unifiedRows=1
	    panelOrder,
	    panelRotation,
	    "matrix-tl-h"
	);

	// With 180° rotation, (0,0) becomes (1,1), (1,0) becomes (0,1), etc.
	// Original layout (matrix-tl-h): 0 1 / 2 3
	// After 180° rotation: logical (0,0) -> physical (1,1) -> LED 3
	//                      logical (1,0) -> physical (0,1) -> LED 2
	//                      logical (0,1) -> physical (1,0) -> LED 1
	//                      logical (1,1) -> physical (0,0) -> LED 0
	uint16_t expected[] = {
		3, 2,
		1, 0
	};

	TEST_ASSERT_EQUAL_UINT16_ARRAY(expected, map, 4);
	free(map);
}

void test_unified_two_panels_mixed_rotation() {
	// Two 2x2 panels: left at 0°, right at 180°
	uint8_t panelOrder[] = {0, 1};
	uint8_t panelRotation[] = {0, 2};  // Panel 0 at 0°, Panel 1 at 180°
	uint16_t* map = buildUnifiedCoordinateMap(
	    2, 2,           // panelWidth=2, panelHeight=2
	    2, 1,           // unifiedCols=2, unifiedRows=1
	    panelOrder,
	    panelRotation,
	    "matrix-tl-h"
	);

	// Unified display is 4x2
	// Left panel (0): no rotation, LEDs 0-3 in normal order
	// Right panel (1): 180° rotation, LEDs 4-7 reversed
	uint16_t expected[] = {
		0, 1, 7, 6,    // y=0: panel 0 normal, panel 1 rotated
		2, 3, 5, 4     // y=1: panel 0 normal, panel 1 rotated
	};

	TEST_ASSERT_EQUAL_UINT16_ARRAY(expected, map, 8);
	free(map);
}

void test_unified_single_panel_90_rotation() {
	// Single 2x2 panel rotated 90° clockwise
	uint8_t panelOrder[] = {0};
	uint8_t panelRotation[] = {1};  // 90° rotation
	uint16_t* map = buildUnifiedCoordinateMap(
	    2, 2,           // panelWidth=2, panelHeight=2
	    1, 1,           // unifiedCols=1, unifiedRows=1
	    panelOrder,
	    panelRotation,
	    "matrix-tl-h"
	);

	// Original layout (matrix-tl-h): LED indices in physical panel
	//   0 1
	//   2 3
	//
	// With 90° CW rotation, content rotates clockwise:
	// - Logical (0,0) maps to physical (1,0) = LED 1
	// - Logical (1,0) maps to physical (1,1) = LED 3
	// - Logical (0,1) maps to physical (0,0) = LED 0
	// - Logical (1,1) maps to physical (0,1) = LED 2
	uint16_t expected[] = {
		1, 3,
		0, 2
	};

	TEST_ASSERT_EQUAL_UINT16_ARRAY(expected, map, 4);
	free(map);
}

void test_unified_single_panel_270_rotation() {
	// Single 2x2 panel rotated 270° clockwise (90° counter-clockwise)
	uint8_t panelOrder[] = {0};
	uint8_t panelRotation[] = {3};  // 270° rotation
	uint16_t* map = buildUnifiedCoordinateMap(
	    2, 2,           // panelWidth=2, panelHeight=2
	    1, 1,           // unifiedCols=1, unifiedRows=1
	    panelOrder,
	    panelRotation,
	    "matrix-tl-h"
	);

	// Original layout (matrix-tl-h): LED indices in physical panel
	//   0 1
	//   2 3
	//
	// With 270° CW rotation (= 90° CCW), content rotates counter-clockwise:
	// - Logical (0,0) maps to physical (0,1) = LED 2
	// - Logical (1,0) maps to physical (0,0) = LED 0
	// - Logical (0,1) maps to physical (1,1) = LED 3
	// - Logical (1,1) maps to physical (1,0) = LED 1
	uint16_t expected[] = {
		2, 0,
		3, 1
	};

	TEST_ASSERT_EQUAL_UINT16_ARRAY(expected, map, 4);
	free(map);
}

void test_unified_2x2_all_rotations() {
	// Four 2x2 panels in 2x2 grid, each with different rotation
	// This tests independent rotation per panel
	// Grid: [[panel0@0°, panel1@90°], [panel2@180°, panel3@270°]]
	uint8_t panelOrder[] = {0, 1, 2, 3};
	uint8_t panelRotation[] = {0, 1, 2, 3};  // 0°, 90°, 180°, 270°
	uint16_t* map = buildUnifiedCoordinateMap(
	    2, 2,           // panelWidth=2, panelHeight=2
	    2, 2,           // unifiedCols=2, unifiedRows=2
	    panelOrder,
	    panelRotation,
	    "matrix-tl-h"
	);

	// Physical LED layout per panel (matrix-tl-h):
	// Panel 0: 0 1 / 2 3,  Panel 1: 4 5 / 6 7
	// Panel 2: 8 9 / 10 11, Panel 3: 12 13 / 14 15
	//
	// After rotations:
	// Panel 0 (0°):   0 1 / 2 3        (unchanged)
	// Panel 1 (90°):  5 7 / 4 6        (90° CW rotation, +4 offset)
	// Panel 2 (180°): 11 10 / 9 8     (180° rotation, +8 offset)
	// Panel 3 (270°): 14 12 / 15 13   (270° CW rotation, +12 offset)
	uint16_t expected[] = {
		0,  1,  5,  7,    // y=0: panel 0 row 0, panel 1 row 0
		2,  3,  4,  6,    // y=1: panel 0 row 1, panel 1 row 1
		11, 10, 14, 12,   // y=2: panel 2 row 0, panel 3 row 0
		9,  8,  15, 13    // y=3: panel 2 row 1, panel 3 row 1
	};

	TEST_ASSERT_EQUAL_UINT16_ARRAY(expected, map, 16);
	free(map);
}

void test_unified_driver0003_config() {
	// Matches real driver 0003 config: [["2b", "3b"], ["1b", "0a"]]
	// 2x2 grid of 8x8 panels (using 2x2 for simpler test)
	// panelOrder: [2, 3, 1, 0] (row-major from unified array)
	// panelRotation: [1, 1, 1, 0] (b=1, b=1, b=1, a=0)
	uint8_t panelOrder[] = {2, 3, 1, 0};
	uint8_t panelRotation[] = {1, 1, 1, 0};  // Three at 90°, one at 0°
	uint16_t* map = buildUnifiedCoordinateMap(
	    2, 2,           // panelWidth=2, panelHeight=2
	    2, 2,           // unifiedCols=2, unifiedRows=2
	    panelOrder,
	    panelRotation,
	    "matrix-tl-h"
	);

	// Physical LED layout per panel (matrix-tl-h):
	// Panel 0: 0 1 / 2 3,  Panel 1: 4 5 / 6 7
	// Panel 2: 8 9 / 10 11, Panel 3: 12 13 / 14 15
	//
	// Grid position -> panel mapping:
	// (0,0) = panel 2 @ 90°, (1,0) = panel 3 @ 90°
	// (0,1) = panel 1 @ 90°, (1,1) = panel 0 @ 0°
	//
	// Panel 2 @ 90° CW: 9 11 / 8 10
	// Panel 3 @ 90° CW: 13 15 / 12 14
	// Panel 1 @ 90° CW: 5 7 / 4 6
	// Panel 0 @ 0°:  0 1 / 2 3 (unchanged)
	uint16_t expected[] = {
		9,  11, 13, 15,   // y=0: panel 2 row 0, panel 3 row 0
		8,  10, 12, 14,   // y=1: panel 2 row 1, panel 3 row 1
		5,  7,  0,  1,    // y=2: panel 1 row 0, panel 0 row 0
		4,  6,  2,  3     // y=3: panel 1 row 1, panel 0 row 1
	};

	TEST_ASSERT_EQUAL_UINT16_ARRAY(expected, map, 16);
	free(map);
}

void test_unified_nonsquare_panel_90_rotation() {
	// Non-square panel (4x2) rotated 90° becomes logical 2x4
	// This tests dimension swapping for rotated non-square panels
	uint8_t panelOrder[] = {0};
	uint8_t panelRotation[] = {1};  // 90° rotation
	uint16_t* map = buildUnifiedCoordinateMap(
	    4, 2,           // panelWidth=4, panelHeight=2 (physical)
	    1, 1,           // unifiedCols=1, unifiedRows=1
	    panelOrder,
	    panelRotation,
	    "matrix-tl-h"
	);

	// Physical panel layout (4x2, matrix-tl-h):
	//   0 1 2 3
	//   4 5 6 7
	//
	// After 90° CW rotation, logical display is 2x4:
	// Logical (0,0) <- Physical (3,0) = 3
	// Logical (1,0) <- Physical (3,1) = 7
	// Logical (0,1) <- Physical (2,0) = 2
	// Logical (1,1) <- Physical (2,1) = 6
	// Logical (0,2) <- Physical (1,0) = 1
	// Logical (1,2) <- Physical (1,1) = 5
	// Logical (0,3) <- Physical (0,0) = 0
	// Logical (1,3) <- Physical (0,1) = 4
	uint16_t expected[] = {
		3, 7,    // y=0
		2, 6,    // y=1
		1, 5,    // y=2
		0, 4     // y=3
	};

	TEST_ASSERT_EQUAL_UINT16_ARRAY(expected, map, 8);
	free(map);
}

void test_unified_nonsquare_panel_270_rotation() {
	// Non-square panel (4x2) rotated 270° becomes logical 2x4
	uint8_t panelOrder[] = {0};
	uint8_t panelRotation[] = {3};  // 270° rotation
	uint16_t* map = buildUnifiedCoordinateMap(
	    4, 2,           // panelWidth=4, panelHeight=2 (physical)
	    1, 1,           // unifiedCols=1, unifiedRows=1
	    panelOrder,
	    panelRotation,
	    "matrix-tl-h"
	);

	// Physical panel layout (4x2, matrix-tl-h):
	//   0 1 2 3
	//   4 5 6 7
	//
	// After 270° CW rotation (= 90° CCW), logical display is 2x4:
	// Logical (0,0) <- Physical (0,1) = 4
	// Logical (1,0) <- Physical (0,0) = 0
	// Logical (0,1) <- Physical (1,1) = 5
	// Logical (1,1) <- Physical (1,0) = 1
	// Logical (0,2) <- Physical (2,1) = 6
	// Logical (1,2) <- Physical (2,0) = 2
	// Logical (0,3) <- Physical (3,1) = 7
	// Logical (1,3) <- Physical (3,0) = 3
	uint16_t expected[] = {
		4, 0,    // y=0
		5, 1,    // y=1
		6, 2,    // y=2
		7, 3     // y=3
	};

	TEST_ASSERT_EQUAL_UINT16_ARRAY(expected, map, 8);
	free(map);
}

// ============================================================================
// Strip Reverse Tests
// ============================================================================

void test_strip_reverse_4x1() {
	// 4-LED strip with reverse enabled
	// Normal strip: 0, 1, 2, 3
	// Reversed: 3, 2, 1, 0 (logical 0 maps to physical 3)
	uint16_t* map = buildCoordinateMap(4, 1, "strip", true);
	uint16_t expected[] = {3, 2, 1, 0};

	TEST_ASSERT_EQUAL_UINT16_ARRAY(expected, map, 4);

	free(map);
}

void test_strip_reverse_8x1() {
	// 8-LED strip with reverse enabled
	uint16_t* map = buildCoordinateMap(8, 1, "strip", true);
	uint16_t expected[] = {7, 6, 5, 4, 3, 2, 1, 0};

	TEST_ASSERT_EQUAL_UINT16_ARRAY(expected, map, 8);

	free(map);
}

void test_strip_no_reverse_4x1() {
	// 4-LED strip with reverse explicitly disabled (same as default)
	uint16_t* map = buildCoordinateMap(4, 1, "strip", false);
	uint16_t expected[] = {0, 1, 2, 3};

	TEST_ASSERT_EQUAL_UINT16_ARRAY(expected, map, 4);

	free(map);
}

void test_strip_reverse_single_led() {
	// Edge case: single LED strip with reverse
	// Should still work (reversed single LED is still index 0)
	uint16_t* map = buildCoordinateMap(1, 1, "strip", true);
	uint16_t expected[] = {0};

	TEST_ASSERT_EQUAL_UINT16_ARRAY(expected, map, 1);

	free(map);
}

void test_matrix_reverse_ignored() {
	// Reverse flag should work on matrices too (flips all indices)
	// This tests the generic nature of the reverse implementation
	uint16_t* map = buildCoordinateMap(2, 2, "matrix-tl-h", true);
	// Normal matrix-tl-h: 0 1 / 2 3
	// Reversed (size=4, maxIdx=3): 3-0=3, 3-1=2, 3-2=1, 3-3=0
	uint16_t expected[] = {3, 2, 1, 0};

	TEST_ASSERT_EQUAL_UINT16_ARRAY(expected, map, 4);

	free(map);
}

int main(int /*argc*/, char** /*argv*/) {
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

	// Panel rotation tests
	RUN_TEST(test_unified_single_panel_180_rotation);
	RUN_TEST(test_unified_two_panels_mixed_rotation);
	RUN_TEST(test_unified_single_panel_90_rotation);
	RUN_TEST(test_unified_single_panel_270_rotation);
	RUN_TEST(test_unified_2x2_all_rotations);
	RUN_TEST(test_unified_driver0003_config);
	RUN_TEST(test_unified_nonsquare_panel_90_rotation);
	RUN_TEST(test_unified_nonsquare_panel_270_rotation);

	// Strip reverse tests
	RUN_TEST(test_strip_reverse_4x1);
	RUN_TEST(test_strip_reverse_8x1);
	RUN_TEST(test_strip_no_reverse_4x1);
	RUN_TEST(test_strip_reverse_single_led);
	RUN_TEST(test_matrix_reverse_ignored);

	return UNITY_END();
}
