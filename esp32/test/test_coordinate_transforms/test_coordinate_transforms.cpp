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

	return UNITY_END();
}
