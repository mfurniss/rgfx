# Broker Discovery

**CRITICAL - DUAL DISCOVERY MECHANISM:**

The RGFX system uses **both UDP broadcast and SSDP** for ESP32 drivers to discover the Hub's MQTT broker. UDP broadcast is the primary mechanism; SSDP is supplementary.

## UDP Broadcast Discovery (Primary)

**Current Implementation:**
- **Hub** (`rgfx-hub/src/mqtt.ts`): Broadcasts JSON discovery messages every 5 seconds
- **Port**: 8889
- **Broadcast Address**: Calculated dynamically (e.g., 192.168.10.255)
- **Payload**: `{"service":"rgfx-mqtt-broker","ip":"192.168.10.23","port":1883}`
- **Driver** (`esp32/src/network/mqtt.cpp`): Listens on UDP port 8889 using `WiFiUDP.begin()`
- **Timeout**: Driver waits up to 6 seconds to receive a broadcast
- **Subnet Validation**: Driver validates broker IP is on same subnet before connecting

**Why UDP Broadcast:**
- **Reliable on consumer WiFi routers** - multicast/IGMP often blocked, broadcast works universally
- **Simple implementation** - no complex protocol, just JSON over UDP
- **Fast discovery** - 5-second broadcast interval means quick connection
- **No library dependencies** - uses standard WiFiUDP on ESP32

## SSDP Discovery (Supplementary)

**Known Issue with node-ssdp Library:**
- The `node-ssdp` library used by the Hub has a known bug (GitHub Issue #76)
- **M-SEARCH queries do NOT work** - Hub cannot respond to M-SEARCH requests
- **NOTIFY broadcasts DO work** - Hub successfully sends periodic advertisements

**Current Implementation:**
- **Hub** (`rgfx-hub/src/mqtt.ts`): Uses `node-ssdp` with `advertise()` to send NOTIFY broadcasts every 10 seconds
- **URN**: `urn:rgfx:service:mqtt:1`
- **Multicast Address**: `239.255.255.250:1900` (standard SSDP)
- **Driver**: Does NOT use SSDP (relies on UDP broadcast instead)

**NEVER:**
- Attempt to use M-SEARCH queries with node-ssdp (they don't work)
- Replace node-ssdp with another library without verifying NOTIFY broadcast support
- Assume SSDP M-SEARCH/response pattern works by default
- Rely solely on SSDP multicast (blocked on many consumer WiFi routers)

## Historical Context

- Original implementation used mDNS (`MDNS.queryService("mqtt", "tcp")`) but had reliability issues
- Switched to SSDP in commit eccc7fc
- Initial SSDP implementation used M-SEARCH pattern (never worked due to node-ssdp bug)
- Driver code was updated to listen for SSDP NOTIFY broadcasts using `WiFiUDP.beginMulticast()`
- **Discovery bug (Nov 2025)**: SSDP multicast not reaching ESP32 on consumer WiFi routers (IGMP blocking)
- **Solution**: Added UDP broadcast discovery as primary mechanism (port 8889)
- SSDP kept as supplementary mechanism for networks that support multicast
