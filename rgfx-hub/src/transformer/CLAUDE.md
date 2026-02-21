# Transformer System

> **Keep this file updated!** After making changes in this folder, update this CLAUDE.md to reflect the current state.

This folder contains the bridge layer that provides interfaces for event transformers. Transformers convert game events (from MAME) into LED effects (sent to drivers).

---

## Architecture

Transformers are loaded by the `TransformerEngine` and receive a context object containing these wrapper classes. The wrappers abstract Hub internals, making transformers easier to write and test.

```
Game Event
    │
    ▼
TransformerEngine
    │
    ├──▶ Logger      (logging)
    ├──▶ MqttClient  (config/commands)
    ├──▶ UdpClient   (effects)
    └──▶ StateStore  (game state)
```

---

## Files

| File | Purpose |
|------|---------|
| `logger-wrapper.ts` | Wraps electron-log for transformer logging |
| `mqtt-client-wrapper.ts` | MQTT publish interface for transformers |
| `udp-client.ts` | UDP broadcast for sending effects to drivers |
| `state-store.ts` | In-memory key-value store for game state |
| `validate-effect.ts` | Applies Zod schema defaults to transformer effect payloads |

---

## Logger Wrapper

[logger-wrapper.ts](logger-wrapper.ts) implements the `Logger` interface:

```typescript
interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}
```

Wraps electron-log so transformers can log without direct dependency.

---

## MQTT Client Wrapper

[mqtt-client-wrapper.ts](mqtt-client-wrapper.ts) implements the `MqttClient` interface:

```typescript
interface MqttClient {
  publish(topic: string, payload: unknown, qos?: 0 | 1 | 2): Promise<void>;
}
```

- Wraps the embedded Aedes MQTT broker
- Auto-serializes payloads to JSON
- Configurable QoS (defaults to MQTT_QOS_LEVEL constant)

Used for sending configuration or commands to drivers.

---

## UDP Client

[udp-client.ts](udp-client.ts) implements the `UdpClient` interface:

```typescript
interface UdpClient {
  broadcast(payload: EffectPayload): boolean;
  setDriverFallbackEnabled(enabled: boolean): void;
}
```

**Features:**
- Broadcasts effects to all connected drivers
- Supports selective routing via `drivers` array in payload
- Supports `*` wildcard for random driver selection
- **Driver fallback mode:** when enabled and selective routing resolves to zero matches, routes to the first connected non-disabled driver instead of dropping the effect
- Maintains a single reusable UDP socket
- Uses DriverRegistry to discover driver IPs (drivers identified by ID, not name)
- Validates packet size against MTU limit (1472 bytes)
- Reports oversized packets via event bus for error tracking
- Diagnostic logging uses `log.debug` and runs after UDP sends to avoid adding latency in the hot path

**Effect Payload:**
```typescript
interface EffectPayload {
  effect: string;       // "pulse", "wipe", "explode", etc.
  props: Record<string, unknown>;  // Effect-specific properties
  drivers?: string[];   // Optional selective routing
}
```

**Transformer Context:**
The context object passed to transformers now includes `payload` in the topic object:
```typescript
interface TransformerTopic {
  topic: string;
  payload: string;  // Raw payload from event
}
```

---

## State Store

[state-store.ts](state-store.ts) implements the `StateStore` interface:

```typescript
interface StateStore {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
  has(key: string): boolean;
  delete(key: string): void;
  clear(): void;
}
```

**Use Cases:**
- Track game state across events (lives, score, level)
- Debounce rapid events
- Rate limit effect triggers
- Store last event timestamp for cooldowns

**Note:** Data is in-memory only, lost on restart. Future enhancement may add persistence.

---

## Usage in Transformers

Transformers receive these wrappers via the context object:

```typescript
// In a transformer
function transform(event: GameEvent, context: TransformerContext) {
  const { logger, mqtt, udp, state } = context;

  // Log the event
  logger.info(`Received: ${event.topic} = ${event.value}`);

  // Check cooldown
  const lastTrigger = state.get('lastPulse') as number ?? 0;
  if (Date.now() - lastTrigger < 100) return;

  // Send effect
  udp.broadcast({
    effect: 'pulse',
    props: { r: 255, g: 0, b: 0, duration: 200 }
  });

  // Update state
  state.set('lastPulse', Date.now());
}
```
