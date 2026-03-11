#include "network/mqtt_ota.h"
#include "network/mqtt.h"
#include "network/network_init.h"
#include "config/config_leds.h"
#include "config/constants.h"
#include "effects/effect_processor.h"
#include "hal/led_controller.h"
#include "driver_config.h"
#include "log.h"
#include "safe_restart.h"
#include "utils.h"
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <Update.h>

// Pre-allocated buffer for OTA MQTT messages
static char otaMessageBuffer[256];

static void publishOtaProgress(const String& deviceId, int percent) {
	snprintf(otaMessageBuffer, sizeof(otaMessageBuffer), R"({"percent":%d})", percent);
	String topic = "rgfx/driver/" + deviceId + "/ota/progress";
	mqttClient.publish(topic.c_str(), otaMessageBuffer, false, 0);
	mqttClient.loop();
}

static void publishOtaResult(const String& deviceId, bool success, const char* error = nullptr) {
	if (success) {
		snprintf(otaMessageBuffer, sizeof(otaMessageBuffer), R"({"success":true})");
	} else {
		snprintf(otaMessageBuffer, sizeof(otaMessageBuffer), R"({"success":false,"error":"%s"})", error ? error : "unknown");
	}
	String topic = "rgfx/driver/" + deviceId + "/ota/result";
	mqttClient.publish(topic.c_str(), otaMessageBuffer, false, 2);
	mqttClient.loop();
}

static void showOtaError() {
	if (g_configUpdateInProgress) return;

	if (!g_driverConfig.devices.empty()) {
		const auto& firstDevice = g_driverConfig.devices[0];
		CRGB* leds = getLEDsForDevice(firstDevice.id);
		if (leds && firstDevice.count > 0) {
			fill_solid(leds, firstDevice.count, CRGB::Red);
			hal::getLedController().show();
			delay(5000);
			fill_solid(leds, firstDevice.count, CRGB::Black);
			hal::getLedController().show();
		}
	}
}

static void showOtaProgress(float percent) {
	if (g_configUpdateInProgress) return;

	if (!g_driverConfig.devices.empty()) {
		const auto& firstDevice = g_driverConfig.devices[0];
		CRGB* leds = getLEDsForDevice(firstDevice.id);
		if (leds && firstDevice.count > 0) {
			int ledIndex = (int)(percent * (firstDevice.count - 1) / 100.0f);
			ledIndex = constrain(ledIndex, 0, firstDevice.count - 1);

			if (ledIndex > 0) {
				fill_solid(leds, ledIndex, CRGB(0x000020));
			}
			leds[ledIndex] = CRGB::White;
			hal::getLedController().show();
		}
	}
}

void handleMqttOta(const String& payload) {
	String deviceId = Utils::getDeviceId();

	// Parse JSON payload
	JsonDocument doc;
	DeserializationError error = deserializeJson(doc, payload);

	if (error) {
		log("ERROR: Failed to parse OTA JSON: " + String(error.c_str()), LogLevel::ERROR);
		publishOtaResult(deviceId, false, "Invalid JSON");
		return;
	}

	const char* url = doc["url"];
	int size = doc["size"] | 0;
	const char* md5 = doc["md5"];

	if (!url || size <= 0) {
		log("ERROR: OTA payload missing url or size", LogLevel::ERROR);
		publishOtaResult(deviceId, false, "Missing url or size");
		return;
	}

	log("MQTT OTA starting: " + String(url) + " (" + String(size) + " bytes)");

	otaInProgress = true;
	pendingClearEffects = true;

	HTTPClient http;
	http.begin(url);
	http.setTimeout(30000);

	int httpCode = http.GET();
	if (httpCode != HTTP_CODE_OK) {
		log("ERROR: HTTP GET failed, code: " + String(httpCode), LogLevel::ERROR);
		publishOtaResult(deviceId, false, "HTTP request failed");
		otaInProgress = false;
		showOtaError();
		http.end();
		return;
	}

	int contentLength = http.getSize();
	if (contentLength <= 0) {
		contentLength = size;
	}

	WiFiClient* stream = http.getStreamPtr();
	if (!stream) {
		log("ERROR: Failed to get HTTP stream", LogLevel::ERROR);
		publishOtaResult(deviceId, false, "No HTTP stream");
		otaInProgress = false;
		showOtaError();
		http.end();
		return;
	}

	// Set MD5 for verification if provided
	if (md5) {
		Update.setMD5(md5);
	}

	if (!Update.begin(contentLength)) {
		log("ERROR: Update.begin failed: " + String(Update.errorString()), LogLevel::ERROR);
		publishOtaResult(deviceId, false, "Update.begin failed");
		otaInProgress = false;
		showOtaError();
		http.end();
		return;
	}

	log("OTA download started, expecting " + String(contentLength) + " bytes");

	// Read firmware in chunks and write to Update
	uint8_t buf[1460];
	int totalRead = 0;
	int lastReportedPercent = -1;

	while (totalRead < contentLength) {
		// Keep MQTT alive during long download
		mqttClient.loop();

		int available = stream->available();
		if (available <= 0) {
			// Wait for data with timeout
			unsigned long waitStart = millis();
			while (stream->available() <= 0 && (millis() - waitStart) < 30000) {
				delay(10);
				mqttClient.loop();
			}
			if (stream->available() <= 0) {
				log("ERROR: Stream timeout", LogLevel::ERROR);
				Update.abort();
				publishOtaResult(deviceId, false, "Download timeout");
				otaInProgress = false;
				showOtaError();
				http.end();
				return;
			}
		}

		int bytesToRead = min((int)sizeof(buf), contentLength - totalRead);
		int bytesRead = stream->readBytes(buf, bytesToRead);

		if (bytesRead <= 0) {
			log("ERROR: Stream read failed", LogLevel::ERROR);
			Update.abort();
			publishOtaResult(deviceId, false, "Read failed");
			otaInProgress = false;
			showOtaError();
			http.end();
			return;
		}

		size_t written = Update.write(buf, bytesRead);
		if (written != (size_t)bytesRead) {
			log("ERROR: Update.write failed: " + String(Update.errorString()), LogLevel::ERROR);
			Update.abort();
			publishOtaResult(deviceId, false, "Write failed");
			otaInProgress = false;
			showOtaError();
			http.end();
			return;
		}

		totalRead += bytesRead;

		// Report progress every 5%
		int percent = (totalRead * 100) / contentLength;
		int reportThreshold = (percent / 5) * 5;
		if (reportThreshold > lastReportedPercent) {
			lastReportedPercent = reportThreshold;
			log("OTA Progress: " + String(reportThreshold) + "%");
			publishOtaProgress(deviceId, reportThreshold);
			showOtaProgress((float)reportThreshold);
		}
	}

	http.end();

	if (!Update.end(true)) {
		log("ERROR: Update.end failed: " + String(Update.errorString()), LogLevel::ERROR);
		publishOtaResult(deviceId, false, Update.errorString());
		otaInProgress = false;
		showOtaError();
		return;
	}

	log("MQTT OTA complete! Rebooting...");
	publishOtaResult(deviceId, true);
	mqttClient.loop();
	delay(MQTT_PUBLISH_BEFORE_REBOOT_DELAY_MS);

	safeRestart();
}
