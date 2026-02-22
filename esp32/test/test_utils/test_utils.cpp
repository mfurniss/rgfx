#include <unity.h>

#ifdef UNIT_TEST

#	include <string>
#	include <algorithm>

class String {
   public:
	std::string data;

	String() = default;
	String(const char* str) : data(str) {}
	String(const std::string& str) : data(str) {}

	void replace(const char* find, const char* replaceWith) {
		std::string findStr(find);
		std::string replaceStr(replaceWith);
		size_t pos = 0;
		while ((pos = data.find(findStr, pos)) != std::string::npos) {
			data.replace(pos, findStr.length(), replaceStr);
			pos += replaceStr.length();
		}
	}

	String substring(size_t start) const { return String(data.substr(start)); }

	String substring(size_t start, size_t end) const {
		return String(data.substr(start, end - start));
	}

	void toLowerCase() { std::transform(data.begin(), data.end(), data.begin(), ::tolower); }

	void toUpperCase() { std::transform(data.begin(), data.end(), data.begin(), ::toupper); }

	size_t length() const { return data.length(); }

	const char* c_str() const { return data.c_str(); }

	bool operator==(const String& other) const { return data == other.data; }
	bool operator!=(const String& other) const { return data != other.data; }
	String operator+(const String& other) const { return String(data + other.data); }
};

class WiFiClass {
   public:
	static String macAddress() { return String("AA:BB:CC:DD:EE:FF"); }
};

static WiFiClass WiFi;

#else
#	include <WiFi.h>
#endif

class Utils {
   public:
	static String getDeviceId() {
		String mac = WiFi.macAddress();
		mac.replace(":", "");
		mac = mac.substring(mac.length() - 6);
		mac.toLowerCase();
		return mac;
	}

	static String getDeviceName() { return String("rgfx-driver-") + getDeviceId(); }
};

void setUp(void) {}

void tearDown(void) {}

void test_getDeviceId_returns_6_characters(void) {
	String deviceId = Utils::getDeviceId();
	TEST_ASSERT_EQUAL(6, deviceId.length());
}

void test_getDeviceId_is_lowercase(void) {
	String deviceId = Utils::getDeviceId();
	for (size_t i = 0; i < deviceId.length(); i++) {
		char c = deviceId.c_str()[i];
		bool isLowerHex = (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f');
		TEST_ASSERT_TRUE_MESSAGE(isLowerHex, "Device ID should only contain lowercase hex digits");
	}
}

void test_getDeviceId_uses_last_3_bytes(void) {
	String deviceId = Utils::getDeviceId();
	TEST_ASSERT_EQUAL_STRING("ddeeff", deviceId.c_str());
}

void test_getDeviceName_has_correct_prefix(void) {
	String deviceName = Utils::getDeviceName();
	const char* prefix = "rgfx-driver-";
	size_t prefixLen = 12;

	TEST_ASSERT_EQUAL(prefixLen + 6, deviceName.length());

	for (size_t i = 0; i < prefixLen; i++) {
		TEST_ASSERT_EQUAL(prefix[i], deviceName.c_str()[i]);
	}
}

void test_getDeviceName_ends_with_device_id(void) {
	String deviceName = Utils::getDeviceName();
	String deviceId = Utils::getDeviceId();
	String expected = String("rgfx-driver-") + deviceId;
	TEST_ASSERT_TRUE(deviceName == expected);
}

void test_getDeviceName_format(void) {
	String deviceName = Utils::getDeviceName();
	TEST_ASSERT_EQUAL_STRING("rgfx-driver-ddeeff", deviceName.c_str());
}

int main(int argc, char** argv) {
	UNITY_BEGIN();

	RUN_TEST(test_getDeviceId_returns_6_characters);
	RUN_TEST(test_getDeviceId_is_lowercase);
	RUN_TEST(test_getDeviceId_uses_last_3_bytes);
	RUN_TEST(test_getDeviceName_has_correct_prefix);
	RUN_TEST(test_getDeviceName_ends_with_device_id);
	RUN_TEST(test_getDeviceName_format);

	return UNITY_END();
}
