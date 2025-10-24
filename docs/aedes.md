# Aedes MQTT Broker Documentation

## Overview
Aedes is a lightweight, barebone MQTT broker built for Node.js that runs on any stream server. It's designed as a high-performance alternative to Mosca, offering better scalability for production deployments.

## Key Features

**Protocol Support:**
- Full MQTT 3.1 and 3.1.1 compatibility
- TCP, SSL/TLS, and WebSocket support
- Bridge protocol support (incoming connections only)
- Dynamic topic support

**Core Capabilities:**
- Message persistence with pluggable backends
- Automatic client reconnection handling
- Offline message buffering
- Backpressure-aware API
- Clusterable architecture with Redis/MongoDB support
- Authentication and authorization middleware
- `$SYS` topic support for system metrics

## Installation & Setup

Basic installation uses npm:
```bash
npm install aedes
```

Docker deployment available through aedes-cli package.

## Architecture & Configuration

**Clustering Requirements:**
The broker supports clustering through persistence and message emitter layers. Recommended production setup pairs "aedes-persistence-mongodb with mqemitter-redis for best performance and stability."

**Message Retention Behavior:**
In clustered deployments, the retain flag is consumed and reset to false per MQTT-3.3.1-9 specification. Only bridge protocol connections preserve the original retain flag.

## Persistence Options

Available backends include:
- In-memory (aedes-persistence)
- MongoDB (aedes-persistence-mongodb)
- Redis (aedes-persistence-redis)
- LevelDB (aedes-persistence-level)
- NeDB (aedes-persistence-nedb)

## Message Queuing

MQEmitter implementations enable distributed message handling:
- Memory-based (mqemitter)
- Redis-powered (mqemitter-redis)
- MongoDB-based (mqemitter-mongodb)
- Child process distribution
- P2P networking

## QoS Support

The broker supports QoS 0, 1, and 2:
- QoS 1/2 acknowledgments trigger the `ack` event
- Persistence layer handles QoS 2 message storage
- Messages with QoS > 0 are stored in the persistence layer for offline clients

## Security Considerations
"Messages sent to the broker are considered valid once they pass the authorizePublish callback." Time-sensitive implementations should use QoS 0 or clean session connections to ensure authorization enforcement.

## Performance Metrics

Benchmark results show Aedes significantly outperforms Mosca:
- In-memory setup: 28,115 msg/sec
- With Redis/Mongo clustering: 45,896-47,464 msg/sec
- Mosca baseline: 18,926 msg/sec

---

# Aedes Class API Documentation

## Constructor & Creation

**new Aedes([options])**
- Creates an MQTT broker instance
- Options include:
  - `mq` (MQEmitter) - Message queue emitter
  - `concurrency` (default: 100) - Max concurrent messages
  - `persistence` (default: in-memory) - Persistence layer
  - `queueLimit` (default: 42) - Max queued packets per client
  - `maxClientsIdLength` (default: 23) - Max client ID length
  - `heartbeatInterval` (default: 60000ms) - Keepalive check interval
  - `id` (default: uuidv4) - Broker unique identifier
  - `connectTimeout` (default: 30000ms) - Connection timeout
  - `keepaliveLimit` (default: 0) - Keepalive multiplier

**Aedes.createBroker([options])** (Recommended)
- Async static method that creates instance and awaits `listen()`
- Same options as constructor

## Core Methods

**aedes.listen()**
- Async method to start the broker instance

**aedes.handle(stream)**
- Connection listener for piping streams to broker
- Returns: `<Client>`

**aedes.publish(packet, callback)**
- Directly deliver packets to subscribed clients
- Bypasses `authorizePublish` handler

**aedes.subscribe(topic, deliverfunc, callback)**
- Server-side subscription to topics
- Topic + deliverfunc form compound key for uniqueness
- Supports backpressure in deliverfunc

**aedes.unsubscribe(topic, deliverfunc, callback)**
- Reverse of subscribe operation

**aedes.close([callback])**
- Closes broker and disconnects all clients

## Properties

- **aedes.id**: `<string>` - Unique broker identifier (default: uuidv4)
- **aedes.connectedClients**: `<number>` - Count of connected clients
- **aedes.closed**: `<boolean>` - Read-only flag indicating closure status

## Events

**client** - New client registration (not yet ready)
**clientReady** - Client initialized and ready
**clientDisconnect** - Client disconnection
**clientError** - Client-related errors
**connectionError** - Uninitialized client errors
**keepaliveTimeout** - Client keepalive expiration
**publish** - Message delivery to subscribers
**ack** - QoS 1/2 acknowledgments
**ping** - Client PINGREQ received
**subscribe** - Successful subscription
**unsubscribe** - Successful unsubscription
**connackSent** - Connection acknowledgment sent
**closed** - Broker closure

## Handler Functions

**preConnect(client, packet, callback)**
- Validates connection before session establishment
- Use cases: rate limiting, IP blacklisting, connection limits

**authenticate(client, username, password, callback)**
- Custom authentication logic
- Returns `returnCode` (2-5) for CONNACK failures

**authorizePublish(client, packet, callback)**
- Controls publication permissions
- Can modify packet payload
- Client is null for LWT publications

**authorizeSubscribe(client, subscription, callback)**
- Controls subscription permissions
- Subscription format: `{ topic, qos }`

**authorizeForward(client, packet)**
- Controls message forwarding to clients

**published(packet, client, callback)**
- Invoked after successful publication

## Example Usage

```javascript
const aedes = require('aedes')()
const server = require('net').createServer(aedes.handle)
const port = 1883

server.listen(port, function () {
  console.log('Aedes MQTT broker listening on port', port)
})

// Handle client connections
aedes.on('client', function (client) {
  console.log('Client Connected:', client.id)
})

aedes.on('publish', async function (packet, client) {
  if (client) {
    console.log('Message from', client.id, 'on topic', packet.topic)
  }
})
```

## Library Source
https://github.com/moscajs/aedes
