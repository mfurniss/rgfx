#include <unity.h>

// Mock Arduino functions for testing
static int mockPinState = 0;
static unsigned long mockMillis = 0;

#define HIGH 1
#define LOW 0

void digitalWrite(int pin, int state) {
	(void)pin;
	mockPinState = state;
}

unsigned long millis() {
	return mockMillis;
}

// Constants from config/constants.h
constexpr int ONBOARD_LED_PIN = 2;
constexpr unsigned long INDICATOR_FLASH_MS = 20;

// Copy of the indicator implementation for testing
static unsigned long indicatorOffTime = 0;

void setIndicator(long duration) {
	if (duration == 0) {
		digitalWrite(ONBOARD_LED_PIN, LOW);
		indicatorOffTime = 0;
	} else if (duration > 0) {
		digitalWrite(ONBOARD_LED_PIN, HIGH);
		indicatorOffTime = millis() + duration;
	} else {
		digitalWrite(ONBOARD_LED_PIN, HIGH);
		indicatorOffTime = 0;
	}
}

void setUp(void) {
	mockPinState = LOW;
	mockMillis = 0;
	indicatorOffTime = 0;
}

void tearDown(void) {}

// Test setIndicator(0) turns LED off
void test_setIndicator_zero_turns_off(void) {
	mockPinState = HIGH;
	setIndicator(0);
	TEST_ASSERT_EQUAL(LOW, mockPinState);
	TEST_ASSERT_EQUAL(0, indicatorOffTime);
}

// Test setIndicator(-1) turns LED on solid
void test_setIndicator_negative_turns_on_solid(void) {
	setIndicator(-1);
	TEST_ASSERT_EQUAL(HIGH, mockPinState);
	TEST_ASSERT_EQUAL(0, indicatorOffTime);
}

// Test setIndicator(duration) turns LED on with auto-off timer
void test_setIndicator_positive_sets_timer(void) {
	mockMillis = 1000;
	setIndicator(INDICATOR_FLASH_MS);
	TEST_ASSERT_EQUAL(HIGH, mockPinState);
	TEST_ASSERT_EQUAL(1020, indicatorOffTime);
}

// Test various negative values all work as solid on
void test_setIndicator_any_negative_is_solid(void) {
	setIndicator(-100);
	TEST_ASSERT_EQUAL(HIGH, mockPinState);
	TEST_ASSERT_EQUAL(0, indicatorOffTime);
}

// Test flash duration is correctly added to current time
void test_setIndicator_flash_timing(void) {
	mockMillis = 5000;
	setIndicator(50);
	TEST_ASSERT_EQUAL(5050, indicatorOffTime);
}

// Test sequential calls update state correctly
void test_setIndicator_sequential_calls(void) {
	// Turn on solid
	setIndicator(-1);
	TEST_ASSERT_EQUAL(HIGH, mockPinState);

	// Turn off
	setIndicator(0);
	TEST_ASSERT_EQUAL(LOW, mockPinState);

	// Flash
	mockMillis = 100;
	setIndicator(20);
	TEST_ASSERT_EQUAL(HIGH, mockPinState);
	TEST_ASSERT_EQUAL(120, indicatorOffTime);
}

int main(int argc, char** argv) {
	UNITY_BEGIN();

	RUN_TEST(test_setIndicator_zero_turns_off);
	RUN_TEST(test_setIndicator_negative_turns_on_solid);
	RUN_TEST(test_setIndicator_positive_sets_timer);
	RUN_TEST(test_setIndicator_any_negative_is_solid);
	RUN_TEST(test_setIndicator_flash_timing);
	RUN_TEST(test_setIndicator_sequential_calls);

	return UNITY_END();
}
