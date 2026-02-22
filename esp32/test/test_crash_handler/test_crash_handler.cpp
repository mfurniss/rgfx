/**
 * Unit tests for crash handler logic
 *
 * Tests the extracted functions from crash_handler.cpp:
 * - getResetReasonString(): enum-to-string mapping
 * - isCrashReason(): crash vs normal reset classification
 * - hasPendingCrashReport() / markCrashReported(): reporting state machine
 */

#include <unity.h>
#include <cstdint>
#include <cstring>

#ifdef UNIT_TEST

#include <string>
using String = std::string;

// Stubs
enum class LogLevel { INFO, ERROR };
void log(const char*, LogLevel = LogLevel::INFO) {}
void log(const String&, LogLevel = LogLevel::INFO) {}

// Mock esp_reset_reason_t (mirrors ESP-IDF enum)
typedef enum {
	ESP_RST_UNKNOWN = 0,
	ESP_RST_POWERON = 1,
	ESP_RST_EXT = 2,
	ESP_RST_SW = 3,
	ESP_RST_PANIC = 4,
	ESP_RST_INT_WDT = 5,
	ESP_RST_TASK_WDT = 6,
	ESP_RST_WDT = 7,
	ESP_RST_DEEPSLEEP = 8,
	ESP_RST_BROWNOUT = 9,
	ESP_RST_SDIO = 10,
} esp_reset_reason_t;

// --- Extracted: crash handler functions (mirrors crash_handler.cpp) ---

struct CrashInfo {
	uint32_t crashCount;
	uint32_t lastResetReason;
	uint32_t uptimeAtCrash;
	bool crashDetected;
	bool crashReported;
};

static CrashInfo crashInfo = {0, 0, 0, false, false};

const char* getResetReasonString(uint32_t reason) {
	switch (reason) {
		case ESP_RST_POWERON:
			return "Power-on";
		case ESP_RST_SW:
			return "Software restart";
		case ESP_RST_PANIC:
			return "Exception/panic";
		case ESP_RST_INT_WDT:
			return "Interrupt watchdog";
		case ESP_RST_TASK_WDT:
			return "Task watchdog";
		case ESP_RST_WDT:
			return "Other watchdog";
		case ESP_RST_DEEPSLEEP:
			return "Deep sleep wake";
		case ESP_RST_BROWNOUT:
			return "Brownout";
		case ESP_RST_SDIO:
			return "SDIO reset";
		default:
			return "Unknown";
	}
}

static bool isCrashReason(esp_reset_reason_t reason) {
	switch (reason) {
		case ESP_RST_PANIC:
		case ESP_RST_INT_WDT:
		case ESP_RST_TASK_WDT:
		case ESP_RST_WDT:
		case ESP_RST_BROWNOUT:
			return true;
		default:
			return false;
	}
}

bool hasPendingCrashReport() {
	return crashInfo.crashDetected && !crashInfo.crashReported;
}

void markCrashReported() {
	crashInfo.crashReported = true;
}

// =============================================================================
// Setup / Teardown
// =============================================================================

void setUp(void) {
	crashInfo = {0, 0, 0, false, false};
}

void tearDown(void) {}

// =============================================================================
// getResetReasonString Tests
// =============================================================================

void test_reset_reason_poweron() {
	TEST_ASSERT_EQUAL_STRING("Power-on", getResetReasonString(ESP_RST_POWERON));
}

void test_reset_reason_sw() {
	TEST_ASSERT_EQUAL_STRING("Software restart", getResetReasonString(ESP_RST_SW));
}

void test_reset_reason_panic() {
	TEST_ASSERT_EQUAL_STRING("Exception/panic", getResetReasonString(ESP_RST_PANIC));
}

void test_reset_reason_int_wdt() {
	TEST_ASSERT_EQUAL_STRING("Interrupt watchdog", getResetReasonString(ESP_RST_INT_WDT));
}

void test_reset_reason_task_wdt() {
	TEST_ASSERT_EQUAL_STRING("Task watchdog", getResetReasonString(ESP_RST_TASK_WDT));
}

void test_reset_reason_wdt() {
	TEST_ASSERT_EQUAL_STRING("Other watchdog", getResetReasonString(ESP_RST_WDT));
}

void test_reset_reason_deepsleep() {
	TEST_ASSERT_EQUAL_STRING("Deep sleep wake", getResetReasonString(ESP_RST_DEEPSLEEP));
}

void test_reset_reason_brownout() {
	TEST_ASSERT_EQUAL_STRING("Brownout", getResetReasonString(ESP_RST_BROWNOUT));
}

void test_reset_reason_sdio() {
	TEST_ASSERT_EQUAL_STRING("SDIO reset", getResetReasonString(ESP_RST_SDIO));
}

void test_reset_reason_unknown() {
	TEST_ASSERT_EQUAL_STRING("Unknown", getResetReasonString(99));
}

// =============================================================================
// isCrashReason Tests
// =============================================================================

void test_panic_is_crash() {
	TEST_ASSERT_TRUE(isCrashReason(ESP_RST_PANIC));
}

void test_int_wdt_is_crash() {
	TEST_ASSERT_TRUE(isCrashReason(ESP_RST_INT_WDT));
}

void test_task_wdt_is_crash() {
	TEST_ASSERT_TRUE(isCrashReason(ESP_RST_TASK_WDT));
}

void test_wdt_is_crash() {
	TEST_ASSERT_TRUE(isCrashReason(ESP_RST_WDT));
}

void test_brownout_is_crash() {
	TEST_ASSERT_TRUE(isCrashReason(ESP_RST_BROWNOUT));
}

void test_poweron_is_not_crash() {
	TEST_ASSERT_FALSE(isCrashReason(ESP_RST_POWERON));
}

void test_sw_is_not_crash() {
	TEST_ASSERT_FALSE(isCrashReason(ESP_RST_SW));
}

void test_deepsleep_is_not_crash() {
	TEST_ASSERT_FALSE(isCrashReason(ESP_RST_DEEPSLEEP));
}

void test_sdio_is_not_crash() {
	TEST_ASSERT_FALSE(isCrashReason(ESP_RST_SDIO));
}

void test_unknown_is_not_crash() {
	TEST_ASSERT_FALSE(isCrashReason(ESP_RST_UNKNOWN));
}

// =============================================================================
// Crash Report State Machine Tests
// =============================================================================

void test_no_crash_no_pending_report() {
	crashInfo.crashDetected = false;
	crashInfo.crashReported = false;

	TEST_ASSERT_FALSE(hasPendingCrashReport());
}

void test_crash_detected_has_pending_report() {
	crashInfo.crashDetected = true;
	crashInfo.crashReported = false;

	TEST_ASSERT_TRUE(hasPendingCrashReport());
}

void test_mark_reported_clears_pending() {
	crashInfo.crashDetected = true;
	crashInfo.crashReported = false;

	markCrashReported();

	TEST_ASSERT_FALSE(hasPendingCrashReport());
	TEST_ASSERT_TRUE(crashInfo.crashReported);
}

void test_already_reported_not_pending() {
	crashInfo.crashDetected = true;
	crashInfo.crashReported = true;

	TEST_ASSERT_FALSE(hasPendingCrashReport());
}

// =============================================================================
// Main
// =============================================================================

int main(int /* argc */, char** /* argv */) {
	UNITY_BEGIN();

	// Reset reason strings
	RUN_TEST(test_reset_reason_poweron);
	RUN_TEST(test_reset_reason_sw);
	RUN_TEST(test_reset_reason_panic);
	RUN_TEST(test_reset_reason_int_wdt);
	RUN_TEST(test_reset_reason_task_wdt);
	RUN_TEST(test_reset_reason_wdt);
	RUN_TEST(test_reset_reason_deepsleep);
	RUN_TEST(test_reset_reason_brownout);
	RUN_TEST(test_reset_reason_sdio);
	RUN_TEST(test_reset_reason_unknown);

	// Crash reason classification
	RUN_TEST(test_panic_is_crash);
	RUN_TEST(test_int_wdt_is_crash);
	RUN_TEST(test_task_wdt_is_crash);
	RUN_TEST(test_wdt_is_crash);
	RUN_TEST(test_brownout_is_crash);
	RUN_TEST(test_poweron_is_not_crash);
	RUN_TEST(test_sw_is_not_crash);
	RUN_TEST(test_deepsleep_is_not_crash);
	RUN_TEST(test_sdio_is_not_crash);
	RUN_TEST(test_unknown_is_not_crash);

	// Crash report state machine
	RUN_TEST(test_no_crash_no_pending_report);
	RUN_TEST(test_crash_detected_has_pending_report);
	RUN_TEST(test_mark_reported_clears_pending);
	RUN_TEST(test_already_reported_not_pending);

	return UNITY_END();
}

#endif  // UNIT_TEST
