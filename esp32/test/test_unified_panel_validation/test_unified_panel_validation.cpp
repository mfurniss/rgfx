/**
 * Unified Panel Dimension Validation Tests
 *
 * Tests the validation logic for the "unified" 2D array in driver config.
 * The unified array must be rectangular (all rows have same column count).
 *
 * This mirrors the validation logic in mqtt_config_handler.cpp::parseLEDDevice()
 * to ensure the validation correctly rejects malformed configurations.
 */

#include <unity.h>
#include <ArduinoJson.h>
#include <cstdint>
#include <cstdlib>
#include <vector>
#include <string>

using String = std::string;

void setUp(void) {}
void tearDown(void) {}

// =============================================================================
// Validation Logic (mirrors mqtt_config_handler.cpp)
// =============================================================================

struct ParsedUnifiedConfig {
	bool valid;
	uint8_t rows;
	uint8_t cols;
	std::vector<uint8_t> panelOrder;
	std::vector<uint8_t> panelRotation;
	String errorMessage;
};

/**
 * Parse and validate unified panel configuration from JSON
 * Mirrors the logic in parseLEDDevice() from mqtt_config_handler.cpp
 */
ParsedUnifiedConfig parseUnifiedConfig(JsonArray unified) {
	ParsedUnifiedConfig result = {false, 1, 1, {0}, {0}, ""};

	// Validate unified array structure
	if (unified.size() == 0) {
		result.errorMessage = "Empty unified array";
		return result;
	}

	if (!unified[0].is<JsonArray>() || unified[0].size() == 0) {
		result.errorMessage = "unified[0] is not a valid array";
		return result;
	}

	size_t expectedCols = unified[0].size();
	bool rowsValid = true;

	// Validate all rows have the same column count
	for (size_t rowIdx = 1; rowIdx < unified.size(); rowIdx++) {
		if (!unified[rowIdx].is<JsonArray>() || unified[rowIdx].size() != expectedCols) {
			result.errorMessage = "Row " + std::to_string(rowIdx) +
			                      " has inconsistent column count (expected " +
			                      std::to_string(expectedCols) + ", got " +
			                      std::to_string(unified[rowIdx].size()) + ")";
			rowsValid = false;
			break;
		}
	}

	if (!rowsValid) {
		return result;
	}

	// Valid rectangular array - parse panel order and rotations
	result.rows = unified.size();
	result.cols = expectedCols;
	result.panelOrder.clear();
	result.panelRotation.clear();

	for (JsonArray row : unified) {
		for (JsonVariant entry : row) {
			String str = entry.as<std::string>();

			// Extract numeric index (all digits at start)
			int idx = 0;
			size_t i = 0;
			while (i < str.length() && str[i] >= '0' && str[i] <= '9') {
				idx = idx * 10 + (str[i] - '0');
				i++;
			}
			result.panelOrder.push_back((uint8_t)idx);

			// Extract rotation (optional letter at end: a=0, b=1, c=2, d=3)
			uint8_t rotation = 0;
			if (i < str.length()) {
				char rotChar = str[i];
				if (rotChar >= 'a' && rotChar <= 'd') {
					rotation = rotChar - 'a';
				}
			}
			result.panelRotation.push_back(rotation);
		}
	}

	result.valid = true;
	return result;
}

// =============================================================================
// Valid Configuration Tests
// =============================================================================

void test_valid_1x1_single_panel() {
	JsonDocument doc;
	JsonArray unified = doc.to<JsonArray>();
	JsonArray row0 = unified.add<JsonArray>();
	row0.add("0");

	ParsedUnifiedConfig result = parseUnifiedConfig(unified);

	TEST_ASSERT_TRUE(result.valid);
	TEST_ASSERT_EQUAL_UINT8(1, result.rows);
	TEST_ASSERT_EQUAL_UINT8(1, result.cols);
	TEST_ASSERT_EQUAL_UINT8(0, result.panelOrder[0]);
	TEST_ASSERT_EQUAL_UINT8(0, result.panelRotation[0]);
}

void test_valid_2x1_horizontal() {
	JsonDocument doc;
	JsonArray unified = doc.to<JsonArray>();
	JsonArray row0 = unified.add<JsonArray>();
	row0.add("0");
	row0.add("1");

	ParsedUnifiedConfig result = parseUnifiedConfig(unified);

	TEST_ASSERT_TRUE(result.valid);
	TEST_ASSERT_EQUAL_UINT8(1, result.rows);
	TEST_ASSERT_EQUAL_UINT8(2, result.cols);
	TEST_ASSERT_EQUAL_UINT8(0, result.panelOrder[0]);
	TEST_ASSERT_EQUAL_UINT8(1, result.panelOrder[1]);
}

void test_valid_1x2_vertical() {
	JsonDocument doc;
	JsonArray unified = doc.to<JsonArray>();
	JsonArray row0 = unified.add<JsonArray>();
	row0.add("0");
	JsonArray row1 = unified.add<JsonArray>();
	row1.add("1");

	ParsedUnifiedConfig result = parseUnifiedConfig(unified);

	TEST_ASSERT_TRUE(result.valid);
	TEST_ASSERT_EQUAL_UINT8(2, result.rows);
	TEST_ASSERT_EQUAL_UINT8(1, result.cols);
}

void test_valid_2x2_grid() {
	JsonDocument doc;
	JsonArray unified = doc.to<JsonArray>();
	JsonArray row0 = unified.add<JsonArray>();
	row0.add("0");
	row0.add("1");
	JsonArray row1 = unified.add<JsonArray>();
	row1.add("2");
	row1.add("3");

	ParsedUnifiedConfig result = parseUnifiedConfig(unified);

	TEST_ASSERT_TRUE(result.valid);
	TEST_ASSERT_EQUAL_UINT8(2, result.rows);
	TEST_ASSERT_EQUAL_UINT8(2, result.cols);
	TEST_ASSERT_EQUAL_UINT8(4, result.panelOrder.size());
}

void test_valid_3x2_rectangular() {
	JsonDocument doc;
	JsonArray unified = doc.to<JsonArray>();
	JsonArray row0 = unified.add<JsonArray>();
	row0.add("0");
	row0.add("1");
	row0.add("2");
	JsonArray row1 = unified.add<JsonArray>();
	row1.add("3");
	row1.add("4");
	row1.add("5");

	ParsedUnifiedConfig result = parseUnifiedConfig(unified);

	TEST_ASSERT_TRUE(result.valid);
	TEST_ASSERT_EQUAL_UINT8(2, result.rows);
	TEST_ASSERT_EQUAL_UINT8(3, result.cols);
}

void test_valid_with_rotations() {
	JsonDocument doc;
	JsonArray unified = doc.to<JsonArray>();
	JsonArray row0 = unified.add<JsonArray>();
	row0.add("0a");  // 0°
	row0.add("1b");  // 90°
	JsonArray row1 = unified.add<JsonArray>();
	row1.add("2c");  // 180°
	row1.add("3d");  // 270°

	ParsedUnifiedConfig result = parseUnifiedConfig(unified);

	TEST_ASSERT_TRUE(result.valid);
	TEST_ASSERT_EQUAL_UINT8(0, result.panelRotation[0]);  // a = 0
	TEST_ASSERT_EQUAL_UINT8(1, result.panelRotation[1]);  // b = 1
	TEST_ASSERT_EQUAL_UINT8(2, result.panelRotation[2]);  // c = 2
	TEST_ASSERT_EQUAL_UINT8(3, result.panelRotation[3]);  // d = 3
}

void test_valid_snake_wiring() {
	// Common snake wiring: [[0, 1], [3, 2]]
	JsonDocument doc;
	JsonArray unified = doc.to<JsonArray>();
	JsonArray row0 = unified.add<JsonArray>();
	row0.add("0");
	row0.add("1");
	JsonArray row1 = unified.add<JsonArray>();
	row1.add("3");
	row1.add("2");

	ParsedUnifiedConfig result = parseUnifiedConfig(unified);

	TEST_ASSERT_TRUE(result.valid);
	TEST_ASSERT_EQUAL_UINT8(0, result.panelOrder[0]);
	TEST_ASSERT_EQUAL_UINT8(1, result.panelOrder[1]);
	TEST_ASSERT_EQUAL_UINT8(3, result.panelOrder[2]);
	TEST_ASSERT_EQUAL_UINT8(2, result.panelOrder[3]);
}

void test_valid_real_world_config() {
	// Matches driver 0003 config: [["2b", "3b"], ["1b", "0a"]]
	JsonDocument doc;
	JsonArray unified = doc.to<JsonArray>();
	JsonArray row0 = unified.add<JsonArray>();
	row0.add("2b");
	row0.add("3b");
	JsonArray row1 = unified.add<JsonArray>();
	row1.add("1b");
	row1.add("0a");

	ParsedUnifiedConfig result = parseUnifiedConfig(unified);

	TEST_ASSERT_TRUE(result.valid);
	TEST_ASSERT_EQUAL_UINT8(2, result.panelOrder[0]);  // 2b
	TEST_ASSERT_EQUAL_UINT8(3, result.panelOrder[1]);  // 3b
	TEST_ASSERT_EQUAL_UINT8(1, result.panelOrder[2]);  // 1b
	TEST_ASSERT_EQUAL_UINT8(0, result.panelOrder[3]);  // 0a
	TEST_ASSERT_EQUAL_UINT8(1, result.panelRotation[0]);  // b = 90°
	TEST_ASSERT_EQUAL_UINT8(1, result.panelRotation[1]);  // b = 90°
	TEST_ASSERT_EQUAL_UINT8(1, result.panelRotation[2]);  // b = 90°
	TEST_ASSERT_EQUAL_UINT8(0, result.panelRotation[3]);  // a = 0°
}

// =============================================================================
// Invalid Configuration Tests (validation should reject these)
// =============================================================================

void test_invalid_empty_array() {
	JsonDocument doc;
	JsonArray unified = doc.to<JsonArray>();
	// Empty array - no rows

	ParsedUnifiedConfig result = parseUnifiedConfig(unified);

	TEST_ASSERT_FALSE(result.valid);
	TEST_ASSERT_TRUE(result.errorMessage.find("Empty") != std::string::npos);
}

void test_invalid_empty_first_row() {
	JsonDocument doc;
	JsonArray unified = doc.to<JsonArray>();
	unified.add<JsonArray>();  // Empty row

	ParsedUnifiedConfig result = parseUnifiedConfig(unified);

	TEST_ASSERT_FALSE(result.valid);
	TEST_ASSERT_TRUE(result.errorMessage.find("unified[0]") != std::string::npos);
}

void test_invalid_first_element_not_array() {
	JsonDocument doc;
	JsonArray unified = doc.to<JsonArray>();
	unified.add("0");  // Not an array, just a string

	ParsedUnifiedConfig result = parseUnifiedConfig(unified);

	TEST_ASSERT_FALSE(result.valid);
	TEST_ASSERT_TRUE(result.errorMessage.find("unified[0]") != std::string::npos);
}

void test_invalid_inconsistent_column_count_row1_shorter() {
	// Row 0 has 3 columns, Row 1 has 2 columns
	JsonDocument doc;
	JsonArray unified = doc.to<JsonArray>();
	JsonArray row0 = unified.add<JsonArray>();
	row0.add("0");
	row0.add("1");
	row0.add("2");
	JsonArray row1 = unified.add<JsonArray>();
	row1.add("3");
	row1.add("4");  // Missing 3rd element

	ParsedUnifiedConfig result = parseUnifiedConfig(unified);

	TEST_ASSERT_FALSE(result.valid);
	TEST_ASSERT_TRUE(result.errorMessage.find("Row 1") != std::string::npos);
	TEST_ASSERT_TRUE(result.errorMessage.find("inconsistent") != std::string::npos);
}

void test_invalid_inconsistent_column_count_row1_longer() {
	// Row 0 has 2 columns, Row 1 has 3 columns
	JsonDocument doc;
	JsonArray unified = doc.to<JsonArray>();
	JsonArray row0 = unified.add<JsonArray>();
	row0.add("0");
	row0.add("1");
	JsonArray row1 = unified.add<JsonArray>();
	row1.add("2");
	row1.add("3");
	row1.add("4");  // Extra element

	ParsedUnifiedConfig result = parseUnifiedConfig(unified);

	TEST_ASSERT_FALSE(result.valid);
	TEST_ASSERT_TRUE(result.errorMessage.find("Row 1") != std::string::npos);
}

void test_invalid_middle_row_different_count() {
	// Row 0: 2 cols, Row 1: 2 cols, Row 2: 3 cols
	JsonDocument doc;
	JsonArray unified = doc.to<JsonArray>();
	JsonArray row0 = unified.add<JsonArray>();
	row0.add("0");
	row0.add("1");
	JsonArray row1 = unified.add<JsonArray>();
	row1.add("2");
	row1.add("3");
	JsonArray row2 = unified.add<JsonArray>();
	row2.add("4");
	row2.add("5");
	row2.add("6");  // Extra element in row 2

	ParsedUnifiedConfig result = parseUnifiedConfig(unified);

	TEST_ASSERT_FALSE(result.valid);
	TEST_ASSERT_TRUE(result.errorMessage.find("Row 2") != std::string::npos);
}

void test_invalid_row_is_not_array() {
	// Row 0: valid, Row 1: not an array
	JsonDocument doc;
	JsonArray unified = doc.to<JsonArray>();
	JsonArray row0 = unified.add<JsonArray>();
	row0.add("0");
	row0.add("1");
	unified.add("not_an_array");  // String instead of array

	ParsedUnifiedConfig result = parseUnifiedConfig(unified);

	TEST_ASSERT_FALSE(result.valid);
	TEST_ASSERT_TRUE(result.errorMessage.find("Row 1") != std::string::npos);
}

// =============================================================================
// Edge Cases
// =============================================================================

void test_panel_index_multi_digit() {
	// Panel indices > 9 (e.g., "10", "15b")
	JsonDocument doc;
	JsonArray unified = doc.to<JsonArray>();
	JsonArray row0 = unified.add<JsonArray>();
	row0.add("10");
	row0.add("15b");

	ParsedUnifiedConfig result = parseUnifiedConfig(unified);

	TEST_ASSERT_TRUE(result.valid);
	TEST_ASSERT_EQUAL_UINT8(10, result.panelOrder[0]);
	TEST_ASSERT_EQUAL_UINT8(15, result.panelOrder[1]);
	TEST_ASSERT_EQUAL_UINT8(0, result.panelRotation[0]);   // no rotation
	TEST_ASSERT_EQUAL_UINT8(1, result.panelRotation[1]);   // b = 90°
}

void test_rotation_only_abcd_recognized() {
	// Other letters should be treated as no rotation
	JsonDocument doc;
	JsonArray unified = doc.to<JsonArray>();
	JsonArray row0 = unified.add<JsonArray>();
	row0.add("0x");  // 'x' is not a valid rotation
	row0.add("1z");  // 'z' is not a valid rotation

	ParsedUnifiedConfig result = parseUnifiedConfig(unified);

	TEST_ASSERT_TRUE(result.valid);
	TEST_ASSERT_EQUAL_UINT8(0, result.panelRotation[0]);  // Invalid rotation = 0
	TEST_ASSERT_EQUAL_UINT8(0, result.panelRotation[1]);
}

void test_large_grid_4x4() {
	JsonDocument doc;
	JsonArray unified = doc.to<JsonArray>();
	for (int row = 0; row < 4; row++) {
		JsonArray rowArr = unified.add<JsonArray>();
		for (int col = 0; col < 4; col++) {
			rowArr.add(std::to_string(row * 4 + col));
		}
	}

	ParsedUnifiedConfig result = parseUnifiedConfig(unified);

	TEST_ASSERT_TRUE(result.valid);
	TEST_ASSERT_EQUAL_UINT8(4, result.rows);
	TEST_ASSERT_EQUAL_UINT8(4, result.cols);
	TEST_ASSERT_EQUAL_UINT8(16, result.panelOrder.size());
}

// =============================================================================
// Main
// =============================================================================

int main(int argc, char** argv) {
	(void)argc;
	(void)argv;

	UNITY_BEGIN();

	// Valid configurations
	RUN_TEST(test_valid_1x1_single_panel);
	RUN_TEST(test_valid_2x1_horizontal);
	RUN_TEST(test_valid_1x2_vertical);
	RUN_TEST(test_valid_2x2_grid);
	RUN_TEST(test_valid_3x2_rectangular);
	RUN_TEST(test_valid_with_rotations);
	RUN_TEST(test_valid_snake_wiring);
	RUN_TEST(test_valid_real_world_config);

	// Invalid configurations (validation rejects these)
	RUN_TEST(test_invalid_empty_array);
	RUN_TEST(test_invalid_empty_first_row);
	RUN_TEST(test_invalid_first_element_not_array);
	RUN_TEST(test_invalid_inconsistent_column_count_row1_shorter);
	RUN_TEST(test_invalid_inconsistent_column_count_row1_longer);
	RUN_TEST(test_invalid_middle_row_different_count);
	RUN_TEST(test_invalid_row_is_not_array);

	// Edge cases
	RUN_TEST(test_panel_index_multi_digit);
	RUN_TEST(test_rotation_only_abcd_recognized);
	RUN_TEST(test_large_grid_4x4);

	return UNITY_END();
}
