/**
 * Unit tests for ConfigPortal::isValidConfigString()
 *
 * Tests the validation function used to detect corrupted EEPROM data
 * (non-printable characters in SSID/thing name after power loss or flash corruption).
 *
 * Extracted from src/config/config_portal.cpp - pure function with no dependencies.
 */

#include <unity.h>
#include <cstring>
#include <cctype>

#ifdef UNIT_TEST

// Extract isValidConfigString() from config_portal.cpp (pure function, no dependencies)
bool isValidConfigString(const char* str, size_t maxLen) {
	if (!str) {
		return false;
	}

	size_t len = strlen(str);

	if (len == 0 || len > maxLen) {
		return false;
	}

	for (size_t i = 0; i < len; i++) {
		if (!isprint((unsigned char)str[i])) {
			return false;
		}
	}

	return true;
}

void setUp(void) {}
void tearDown(void) {}

// =============================================================================
// Null / Empty Input
// =============================================================================

void test_null_pointer_returns_false() {
	TEST_ASSERT_FALSE(isValidConfigString(nullptr, 32));
}

void test_empty_string_returns_false() {
	TEST_ASSERT_FALSE(isValidConfigString("", 32));
}

// =============================================================================
// Length Validation
// =============================================================================

void test_string_exceeding_max_length_returns_false() {
	TEST_ASSERT_FALSE(isValidConfigString("this string is way too long", 10));
}

void test_string_at_exact_max_length_returns_true() {
	TEST_ASSERT_TRUE(isValidConfigString("1234567890", 10));
}

void test_string_under_max_length_returns_true() {
	TEST_ASSERT_TRUE(isValidConfigString("short", 32));
}

void test_single_char_returns_true() {
	TEST_ASSERT_TRUE(isValidConfigString("A", 32));
}

// =============================================================================
// Printable Character Validation
// =============================================================================

void test_valid_ascii_string_returns_true() {
	TEST_ASSERT_TRUE(isValidConfigString("MyWiFiNetwork_2024", 64));
}

void test_string_with_spaces_returns_true() {
	TEST_ASSERT_TRUE(isValidConfigString("My WiFi Network", 64));
}

void test_string_with_special_chars_returns_true() {
	TEST_ASSERT_TRUE(isValidConfigString("WiFi!@#$%^&*()", 64));
}

void test_space_char_boundary_returns_true() {
	// Space (0x20) is the lowest printable ASCII character
	TEST_ASSERT_TRUE(isValidConfigString(" ", 32));
}

void test_tilde_char_boundary_returns_true() {
	// Tilde (0x7E) is the highest printable ASCII character
	TEST_ASSERT_TRUE(isValidConfigString("~", 32));
}

void test_all_printable_ascii_range() {
	// Build a string with all printable ASCII chars (0x20 to 0x7E)
	char allPrintable[96];
	for (int i = 0x20; i <= 0x7E; i++) {
		allPrintable[i - 0x20] = (char)i;
	}
	allPrintable[0x7E - 0x20 + 1] = '\0';

	TEST_ASSERT_TRUE(isValidConfigString(allPrintable, 128));
}

// =============================================================================
// Non-Printable Character Detection (corruption simulation)
// =============================================================================

void test_null_byte_in_middle_returns_true() {
	// strlen stops at null byte, so "AB\0CD" has length 2 = valid
	char str[] = {'A', 'B', '\0', 'C', 'D', '\0'};
	TEST_ASSERT_TRUE(isValidConfigString(str, 32));
}

void test_tab_character_returns_false() {
	TEST_ASSERT_FALSE(isValidConfigString("has\ttab", 32));
}

void test_newline_character_returns_false() {
	TEST_ASSERT_FALSE(isValidConfigString("has\nnewline", 32));
}

void test_carriage_return_returns_false() {
	TEST_ASSERT_FALSE(isValidConfigString("has\rreturn", 32));
}

void test_control_char_0x01_returns_false() {
	TEST_ASSERT_FALSE(isValidConfigString("\x01", 32));
}

void test_control_char_0x1F_returns_false() {
	// 0x1F is the last non-printable character before space (0x20)
	TEST_ASSERT_FALSE(isValidConfigString("\x1F", 32));
}

void test_del_char_0x7F_returns_false() {
	// DEL (0x7F) is non-printable
	TEST_ASSERT_FALSE(isValidConfigString("\x7F", 32));
}

void test_high_byte_0x80_returns_false() {
	// Extended ASCII (0x80+) is non-printable
	TEST_ASSERT_FALSE(isValidConfigString("\x80", 32));
}

void test_corrupted_flash_simulation() {
	// Simulate what happens when flash is corrupted: 0xFF bytes
	TEST_ASSERT_FALSE(isValidConfigString("\xFF\xFF\xFF", 32));
}

void test_non_printable_mixed_with_printable_returns_false() {
	TEST_ASSERT_FALSE(isValidConfigString("valid\x03text", 32));
}

// =============================================================================
// Main
// =============================================================================

int main(int /* argc */, char** /* argv */) {
	UNITY_BEGIN();

	// Null / Empty
	RUN_TEST(test_null_pointer_returns_false);
	RUN_TEST(test_empty_string_returns_false);

	// Length
	RUN_TEST(test_string_exceeding_max_length_returns_false);
	RUN_TEST(test_string_at_exact_max_length_returns_true);
	RUN_TEST(test_string_under_max_length_returns_true);
	RUN_TEST(test_single_char_returns_true);

	// Printable Characters
	RUN_TEST(test_valid_ascii_string_returns_true);
	RUN_TEST(test_string_with_spaces_returns_true);
	RUN_TEST(test_string_with_special_chars_returns_true);
	RUN_TEST(test_space_char_boundary_returns_true);
	RUN_TEST(test_tilde_char_boundary_returns_true);
	RUN_TEST(test_all_printable_ascii_range);

	// Non-Printable (corruption detection)
	RUN_TEST(test_null_byte_in_middle_returns_true);
	RUN_TEST(test_tab_character_returns_false);
	RUN_TEST(test_newline_character_returns_false);
	RUN_TEST(test_carriage_return_returns_false);
	RUN_TEST(test_control_char_0x01_returns_false);
	RUN_TEST(test_control_char_0x1F_returns_false);
	RUN_TEST(test_del_char_0x7F_returns_false);
	RUN_TEST(test_high_byte_0x80_returns_false);
	RUN_TEST(test_corrupted_flash_simulation);
	RUN_TEST(test_non_printable_mixed_with_printable_returns_false);

	return UNITY_END();
}

#endif  // UNIT_TEST
