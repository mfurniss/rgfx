/* I2C Scanner Test
 *
 * Scans the I2C bus and reports all detected devices.
 * Upload this to your ESP32 to find the OLED display's address.
 */

#include <Arduino.h>
#include <Wire.h>

#define I2C_SDA 21
#define I2C_SCL 22

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n\n=== I2C Scanner ===");
  Serial.println("Initializing I2C bus...");

  Wire.begin(I2C_SDA, I2C_SCL);
  Wire.setClock(100000); // Start with standard 100kHz

  Serial.println("Scanning I2C bus (addresses 0x00 to 0x7F)...\n");

  int devicesFound = 0;

  for (byte address = 0; address < 128; address++) {
    Wire.beginTransmission(address);
    byte error = Wire.endTransmission();

    if (error == 0) {
      Serial.print("Device found at address 0x");
      if (address < 16) Serial.print("0");
      Serial.print(address, HEX);
      Serial.println(" !");
      devicesFound++;
    } else if (error == 4) {
      Serial.print("Unknown error at address 0x");
      if (address < 16) Serial.print("0");
      Serial.println(address, HEX);
    }
  }

  Serial.println("\n=== Scan Complete ===");
  if (devicesFound == 0) {
    Serial.println("No I2C devices found!");
    Serial.println("\nTroubleshooting:");
    Serial.println("1. Check wiring (SDA=GPIO21, SCL=GPIO22)");
    Serial.println("2. Check VCC is connected to 3.3V");
    Serial.println("3. Check GND is connected");
    Serial.println("4. Try different I2C clock speed");
    Serial.println("5. Check display module for defects");
  } else {
    Serial.print("Found ");
    Serial.print(devicesFound);
    Serial.println(" device(s)");
  }

  Serial.println("\nRescan in 5 seconds...");
}

void loop() {
  delay(5000);

  Serial.println("\n=== Rescanning I2C Bus ===");
  int devicesFound = 0;

  for (byte address = 1; address < 127; address++) {
    Wire.beginTransmission(address);
    byte error = Wire.endTransmission();

    if (error == 0) {
      Serial.print("Device at 0x");
      if (address < 16) Serial.print("0");
      Serial.println(address, HEX);
      devicesFound++;
    }
  }

  if (devicesFound == 0) {
    Serial.println("No devices found");
  } else {
    Serial.print("Found ");
    Serial.print(devicesFound);
    Serial.println(" device(s)");
  }
}
