# Network Module

> **Keep this file updated!** After making changes in this folder, update this CLAUDE.md to reflect the current state.

This module handles MQTT broker management and network discovery services that allow ESP32 drivers to locate the Hub on the local network.

## Files

### index.ts
Public exports for the network module. Currently exports only `MqttBroker`.

### discovery-service.ts
Defines the `DiscoveryService` interface and `DiscoveryServiceConfig` type. Discovery services advertise the MQTT broker's location to ESP32 drivers on the network.

### mqtt-broker.ts
The `MqttBroker` class wraps the [Aedes](https://github.com/moscajs/aedes) MQTT broker library. Responsibilities:
- Manages broker lifecycle (start/stop)
- Handles client connections and disconnections
- Provides pub/sub interface with QoS 2 (exactly-once delivery)
- Supports MQTT wildcard subscriptions (`+` single-level, `#` multi-level)
- Coordinates discovery services to advertise the broker

### ssdp-discovery.ts
`SsdpDiscovery` implements `DiscoveryService` using SSDP (Simple Service Discovery Protocol). Broadcasts NOTIFY messages to the multicast address `239.255.255.250:1900`.

**Note:** SSDP multicast is often blocked on consumer WiFi routers due to IGMP filtering. UDP broadcast discovery is more reliable for home networks.

### udp-discovery.ts
`UdpDiscovery` implements `DiscoveryService` using UDP broadcast. Sends JSON discovery messages to the network broadcast address (e.g., `192.168.1.255`). This is the more reliable discovery method for typical home networks.

### network-manager.ts
`NetworkManager` is the central coordinator for network state. Responsibilities:
- Monitors for IP address changes (detects network switches like WiFi → Ethernet)
- Listens for `network:error` events via the event bus
- Handles `ENETUNREACH` errors by stopping discovery and scheduling recovery
- Restarts discovery services when network becomes available again
- Notifies dependents of network changes via callback

### network-utils.ts
Utility functions for network operations:
- `getLocalIP()` - Detects the local IPv4 address, preferring WiFi/Ethernet interfaces (en0, en1, eth0)
- `getBroadcastAddress(localIP)` - Calculates the broadcast address assuming a /24 subnet

## Architecture

```
MqttBroker
├── Aedes (MQTT protocol)
├── SsdpDiscovery (multicast announcements)
└── UdpDiscovery (broadcast announcements)
```

The broker starts both discovery services when it starts. ESP32 drivers listen for these announcements to find the broker's IP and port without hardcoding.

## Related Documentation

See [broker-discovery.md](../../../.claude/docs/broker-discovery.md) for the discovery protocol specification.

## Testing Notes

- `MqttBroker.start()` calls async `startDiscoveryServices()` - tests use `vi.waitFor()` for assertions
- `NetworkManager` tests use `vi.advanceTimersByTimeAsync(0)` to flush promises with fake timers
