# RGFX Event Mapping System - Implementation Plan

## Architecture Summary

**Event Flow:**
```
Emulator (MAME/RetroArch/etc.)
    ↓ (extracts game events)
Event File (standard format: {game}/{subject}/{property}/{detail...} {payload})
    ↓ (Hub monitors file)
Hub TypeScript Mappers (cascading: game → subject → pattern → default)
    ↓ (transforms to semantic effects)
Output Layer (UDP to LEDs, MQTT to smart home, HTTP to APIs)
```

**Event Structure (Final):**
```
{game}/{subject}/{property}/{detail...} {payload}

Position 1: Game name (REQUIRED)
Position 2: Subject (OPTIONAL, semantic entity)
Position 3: Property (OPTIONAL, what changed)
Position 4+: Details (OPTIONAL, additional context)
Payload: Value (simple string/number or JSON if starts with '{' or '[')
```

**Examples:**
```
pacman/ghost/state/red 17
pacman/player/score/p1 12450
smb/player/jump 1
galaga/bonus/stage {"stage": 3, "enemies": 40}
```

---

## Phase 1: Core Mapping System

### 1.1 Update Lua Interceptors
- Add game prefix to all events
- Reorder tokens: subject/property/detail
- Ensure consistent structure

**Files to modify:**
- `mame/lua/interceptors/pacman_rgfx.lua`
- `mame/lua/interceptors/galaga_rgfx.lua`
- `mame/lua/interceptors/nes_smb_rgfx.lua`
- `mame/lua/interceptors/nes_castlevania3_rgfx.lua`
- `mame/lua/interceptors/snes_smw_rgfx.lua`

**Example changes:**
```lua
-- OLD:
_G.event("player/score/p1", score)
_G.event("ghost/red/state", state)

-- NEW:
_G.event("pacman/player/score/p1", score)
_G.event("pacman/ghost/state/red", state)
```

### 1.2 Create Type Definitions
**File:** `rgfx-hub/src/types/mapping-types.ts`

```typescript
export interface MappingContext {
  udp: UdpClient;
  mqtt: MqttClient;
  http: HttpClient;
  state: StateStore;
  log: Logger;
  drivers: DriverRegistry;
}

export interface UdpClient {
  broadcast(payload: EffectPayload): void;
  send(driverId: string, payload: EffectPayload): void;
  sendToDrivers(driverIds: string[], payload: EffectPayload): void;
}

export interface EffectPayload {
  effect: string;        // Semantic effect name
  [key: string]: any;    // Effect-specific data
  hint?: {               // Optional visual hints
    visual?: string;
    color?: string;
    duration?: number;
    [key: string]: any;
  };
}

export type MappingHandler = (
  topic: string,
  payload: string,
  context: MappingContext
) => boolean | Promise<boolean>;

export interface MappingFile {
  handle: MappingHandler;
  priority?: number;
  enabled?: boolean;
}

export interface MqttClient {
  publish(topic: string, payload: unknown, qos?: 0 | 1 | 2): Promise<void>;
}

export interface HttpClient {
  get(url: string, options?: RequestInit): Promise<Response>;
  post(url: string, body: unknown, options?: RequestInit): Promise<Response>;
  put(url: string, body: unknown, options?: RequestInit): Promise<Response>;
  delete(url: string, options?: RequestInit): Promise<Response>;
}

export interface StateStore {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
  has(key: string): boolean;
  delete(key: string): void;
  clear(): void;
}

export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}
```

### 1.3 Create Mapping Engine
**File:** `rgfx-hub/src/mapping-engine.ts`

**Responsibilities:**
- Load mapping files from directories
- Apply cascading precedence (game → subject → pattern → default)
- First match wins (override behavior)
- Error handling and logging
- Payload parsing (simple vs JSON auto-detection)

**Key methods:**
```typescript
class MappingEngine {
  async loadMappings(): Promise<void>
  async handleEvent(topic: string, payload: string): Promise<void>
  private parsePayload(payload: string): string | number | object
}
```

**Cascading algorithm:**
```typescript
async handleEvent(topic: string, payload: string) {
  const [game] = topic.split('/');

  // 1. Try game-specific handler (highest priority)
  const gameHandler = this.gameHandlers[game];
  if (gameHandler?.handle(topic, payload, this.context)) {
    return; // Handled, stop
  }

  // 2. Try subject handlers (medium priority)
  const [, subject] = topic.split('/');
  const subjectHandler = this.subjectHandlers[subject];
  if (subjectHandler?.handle(topic, payload, this.context)) {
    return; // Handled, stop
  }

  // 3. Try pattern handlers (lower priority)
  for (const handler of this.patternHandlers) {
    if (handler.handle(topic, payload, this.context)) {
      return; // Handled, stop
    }
  }

  // 4. Default handler (always handles)
  this.defaultHandler.handle(topic, payload, this.context);
}
```

**Payload parsing:**
```typescript
private parsePayload(payload: string): string | number | object {
  // Detect JSON
  if (payload.startsWith('{') || payload.startsWith('[')) {
    try {
      return JSON.parse(payload);
    } catch {
      return payload;
    }
  }

  // Try number
  const num = Number(payload);
  if (!isNaN(num) && payload.trim() !== '') {
    return num;
  }

  // String
  return payload;
}
```

### 1.4 Create Context Implementations

**File:** `rgfx-hub/src/mapping/udp-client.ts`
```typescript
export class UdpClientImpl implements UdpClient {
  constructor(private driverRegistry: DriverRegistry) {}

  broadcast(payload: EffectPayload): void {
    const drivers = this.driverRegistry
      .getAllDrivers()
      .filter(d => d.connected && d.ip);

    for (const driver of drivers) {
      this.sendToDriver(driver.id, payload);
    }
  }

  sendToDriver(driverId: string, payload: EffectPayload): void {
    const driver = this.driverRegistry.getDriver(driverId);
    if (!driver?.ip) return;

    const message = JSON.stringify(payload);
    // Send via existing UDP implementation
  }
}
```

**File:** `rgfx-hub/src/mapping/state-store.ts`
```typescript
export class StateStoreImpl implements StateStore {
  private store = new Map<string, unknown>();

  get<T>(key: string): T | undefined {
    return this.store.get(key) as T | undefined;
  }

  set<T>(key: string, value: T): void {
    this.store.set(key, value);
  }

  has(key: string): boolean {
    return this.store.has(key);
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}
```

**File:** `rgfx-hub/src/mapping/logger-wrapper.ts`
```typescript
export class LoggerWrapper implements Logger {
  constructor(private baseLogger: any) {}

  debug(message: string, ...args: unknown[]): void {
    this.baseLogger.debug(message, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    this.baseLogger.info(message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.baseLogger.warn(message, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    this.baseLogger.error(message, ...args);
  }
}
```

### 1.5 Create Default Mappers

**File:** `rgfx-hub/config/mappings/subjects/player.ts`
```typescript
import type { MappingContext } from '../../../src/types/mapping-types';

export function handle(topic: string, payload: string, context: MappingContext): boolean {
  const [game, subject, property, ...details] = topic.split('/');

  if (subject !== 'player') return false;

  // Generic player score
  if (property === 'score') {
    const value = parseInt(payload);
    context.udp.broadcast({
      effect: 'score',
      value: value,
      player: details[0] || 'p1',
      hint: {
        visual: 'pulse',
        color: '#00FF00',
        duration: 300
      }
    });
    return true;
  }

  // Generic player death
  if (property === 'death' || property === 'died') {
    context.udp.broadcast({
      effect: 'player_death',
      player: details[0] || 'p1',
      hint: {
        visual: 'fade',
        color: '#FF0000',
        duration: 1000
      }
    });
    return true;
  }

  // Generic player action (jump, shoot, etc.)
  if (property) {
    context.udp.broadcast({
      effect: `player_${property}`,
      player: details[0] || 'p1',
      hint: {
        visual: 'pulse',
        color: '#FFFFFF',
        duration: 200
      }
    });
    return true;
  }

  return false;
}
```

**File:** `rgfx-hub/config/mappings/subjects/enemy.ts`
```typescript
import type { MappingContext } from '../../../src/types/mapping-types';

export function handle(topic: string, payload: string, context: MappingContext): boolean {
  const [game, subject, property, ...details] = topic.split('/');

  if (subject !== 'enemy') return false;

  // Enemy destroyed/killed
  if (property === 'destroyed' || property === 'killed') {
    context.udp.broadcast({
      effect: 'enemy_death',
      count: parseInt(payload),
      hint: {
        visual: 'sparkle',
        color: '#FFFFFF',
        count: 5,
        duration: 500
      }
    });
    return true;
  }

  // Enemy spawned
  if (property === 'spawned') {
    context.udp.broadcast({
      effect: 'enemy_spawn',
      hint: {
        visual: 'pulse',
        color: '#FF8800',
        duration: 300
      }
    });
    return true;
  }

  return false;
}
```

**File:** `rgfx-hub/config/mappings/subjects/ghost.ts`
```typescript
import type { MappingContext } from '../../../src/types/mapping-types';

export function handle(topic: string, payload: string, context: MappingContext): boolean {
  const [game, subject, property, ...details] = topic.split('/');

  if (subject !== 'ghost') return false;

  // Generic ghost state change
  if (property === 'state') {
    const ghostId = details[0] || 'unknown';
    context.udp.broadcast({
      effect: 'ghost_state',
      ghost: ghostId,
      state: parseInt(payload),
      hint: {
        visual: 'pulse',
        color: '#FFFFFF',
        duration: 300
      }
    });
    return true;
  }

  return false;
}
```

**File:** `rgfx-hub/config/mappings/patterns/score.ts`
```typescript
import type { MappingContext } from '../../../src/types/mapping-types';

export function handle(topic: string, payload: string, context: MappingContext): boolean {
  // Match any topic with "score" anywhere
  if (!topic.includes('/score')) return false;

  const value = parseInt(payload);
  context.udp.broadcast({
    effect: 'score',
    value: value,
    hint: {
      visual: 'pulse',
      color: '#00FF00',
      intensity: Math.min(value / 100, 255),
      duration: 300
    }
  });

  return true;
}
```

**File:** `rgfx-hub/config/mappings/default.ts`
```typescript
import type { MappingContext } from '../../../src/types/mapping-types';

export function handle(topic: string, payload: string, context: MappingContext): boolean {
  context.log.debug(`Unmatched event: ${topic} = ${payload}`);

  // Catch-all: white pulse for any unrecognized event
  context.udp.broadcast({
    effect: 'generic',
    topic: topic,
    value: payload,
    hint: {
      visual: 'pulse',
      color: '#FFFFFF',
      duration: 500
    }
  });

  return true; // Always handles
}
```

### 1.6 Create Example Game Mapper

**File:** `rgfx-hub/config/mappings/games/pacman.ts`
```typescript
import type { MappingContext } from '../../../src/types/mapping-types';

/**
 * Pac-Man specific event mappings
 * Overrides generic player/ghost handlers with Pac-Man themed effects
 */
export function handle(topic: string, payload: string, context: MappingContext): boolean {
  const [game, subject, property, ...details] = topic.split('/');

  if (game !== 'pacman') return false;

  // PAC-MAN SPECIFIC: Player score (yellow instead of generic green)
  if (subject === 'player' && property === 'score') {
    const value = parseInt(payload);
    const player = details[0] || 'p1';

    context.udp.broadcast({
      effect: 'score',
      value: value,
      player: player,
      hint: {
        visual: 'pulse',
        color: '#FFFF00',  // Pac-Man yellow
        intensity: Math.min(value / 100, 255),
        duration: 300
      }
    });

    // Extra: High score milestone
    if (value > 10000) {
      context.log.info(`Pac-Man high score milestone: ${value}`);
      // Could trigger extra effects here
    }

    return true; // Handled - generic player handler won't run
  }

  // PAC-MAN SPECIFIC: Ghost states with color-coded effects
  if (subject === 'ghost' && property === 'state') {
    const ghostColor = details[0]; // red, pink, cyan, orange
    const state = parseInt(payload);

    const ghostColors = {
      red: '#FF0000',
      pink: '#FFB6C1',
      cyan: '#00FFFF',
      orange: '#FFA500'
    };

    if (state === 17) {
      // Ghost vulnerable (blue/scared)
      context.udp.broadcast({
        effect: 'ghost_vulnerable',
        ghost: ghostColor,
        hint: {
          visual: 'pulse',
          color: '#0000FF',
          speed: 200
        }
      });
    } else if (state === 25) {
      // Ghost eaten (eyes returning)
      context.udp.broadcast({
        effect: 'ghost_eaten',
        ghost: ghostColor,
        hint: {
          visual: 'wipe',
          color: '#000000',
          duration: 500
        }
      });
    } else {
      // Normal ghost (color-coded)
      context.udp.broadcast({
        effect: 'ghost_normal',
        ghost: ghostColor,
        hint: {
          visual: 'pulse',
          color: ghostColors[ghostColor] || '#FFFFFF',
          duration: 300
        }
      });
    }

    return true;
  }

  // PAC-MAN SPECIFIC: Power pill eaten
  if (subject === 'powerup' && property === 'pill') {
    context.udp.broadcast({
      effect: 'powerup',
      powerup_type: 'pill',
      hint: {
        visual: 'flash',
        color: '#FFFFFF',
        count: 3,
        duration: 200
      }
    });

    return true;
  }

  return false; // Not handled, try generic handlers
}
```

**File:** `rgfx-hub/config/mappings/games/_template.ts`
```typescript
import type { MappingContext } from '../../../src/types/mapping-types';

/**
 * Game-specific event mapper template
 *
 * Copy this file and rename to your game (e.g., galaga.ts, smb.ts)
 * Implement your custom routing and effects here
 *
 * This handler runs FIRST (highest priority) and can override generic defaults.
 */
export function handle(topic: string, payload: string, context: MappingContext): boolean {
  const [game, subject, property, ...details] = topic.split('/');

  // Only handle events for this game
  if (game !== 'GAME_NAME') return false;

  // Example: Handle player score events
  if (subject === 'player' && property === 'score') {
    const score = parseInt(payload);
    const player = details[0] || 'p1';

    // Your custom effect here
    context.udp.broadcast({
      effect: 'score',
      value: score,
      player: player,
      hint: {
        visual: 'pulse',
        color: '#00FF00',  // Change to your game's color
        duration: 300
      }
    });

    return true; // Handled - generic handler won't run
  }

  // Example: Handle player death
  if (subject === 'player' && property === 'death') {
    context.udp.broadcast({
      effect: 'player_death',
      hint: {
        visual: 'fade',
        color: '#FF0000',
        duration: 1000
      }
    });

    return true;
  }

  // Not handled by this game-specific handler
  // Event will cascade to generic handlers (subjects/, patterns/, default.ts)
  return false;
}
```

### 1.7 Integrate with Event Pipeline

**File:** `rgfx-hub/src/main.ts` (modify existing file)

```typescript
// Add imports
import { MappingEngine } from './mapping-engine';
import { UdpClientImpl } from './mapping/udp-client';
import { StateStoreImpl } from './mapping/state-store';
import { LoggerWrapper } from './mapping/logger-wrapper';

// Create mapping engine components (in app.on('ready') handler)
const udpClient = new UdpClientImpl(driverRegistry);
const stateStore = new StateStoreImpl();
const loggerWrapper = new LoggerWrapper(logger);

const mappingEngine = new MappingEngine(
  udpClient,
  mqtt,
  stateStore,
  loggerWrapper,
  driverRegistry
);

// Load mappings on startup
app.on('ready', async () => {
  // ... existing ready code ...

  await mappingEngine.loadMappings();
  logger.info('Event mapping system initialized');

  // ... rest of ready handler ...
});

// Replace existing eventReader callback
eventReader.start(async (topic, message) => {
  try {
    await mappingEngine.handleEvent(topic, message);
  } catch (error) {
    logger.error('Event mapping error:', error);
  }
});
```

### 1.8 Testing

**Unit Tests:**
- `rgfx-hub/src/mapping-engine.test.ts` - Test payload parsing, cascading
- `rgfx-hub/config/mappings/subjects/player.test.ts` - Test player handler
- `rgfx-hub/config/mappings/games/pacman.test.ts` - Test Pac-Man handler

**Integration Tests:**
- Synthetic event file → verify UDP output
- Test cascading (game overrides subject)
- Test default fallback

**Manual Testing:**
- Run MAME with updated Lua interceptors
- Verify events in correct format in log file
- Check Hub processes events correctly
- Test game-specific vs default behavior

---

## Phase 2: Enhanced Features

### 2.1 MQTT Context

**File:** `rgfx-hub/src/mapping/mqtt-client-wrapper.ts`
```typescript
export class MqttClientWrapper implements MqttClient {
  constructor(private mqtt: Mqtt) {}

  async publish(topic: string, payload: unknown, qos: 0 | 1 | 2 = 2): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const payloadStr = JSON.stringify(payload);

        this.mqtt.aedes.publish({
          cmd: 'publish',
          qos: qos,
          dup: false,
          topic: topic,
          payload: Buffer.from(payloadStr),
          retain: false
        }, (err) => {
          if (err) reject(err);
          else resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }
}
```

**Add to MappingEngine constructor:**
```typescript
constructor(
  private udpClient: UdpClient,
  private mqtt: Mqtt,  // Add this
  // ... rest
) {
  this.context = {
    udp: udpClient,
    mqtt: new MqttClientWrapper(mqtt),  // Add this
    // ... rest
  };
}
```

**Example usage in game mapper:**
```typescript
// Smart home integration
if (value > 10000) {
  await context.mqtt.publish('home/hue/arcade', {
    effect: 'party',
    color: 'yellow'
  }, 2);
}
```

### 2.2 HTTP Context

**File:** `rgfx-hub/src/mapping/http-client.ts`
```typescript
export class HttpClientImpl implements HttpClient {
  async get(url: string, options?: RequestInit): Promise<Response> {
    return fetch(url, { method: 'GET', ...options });
  }

  async post(url: string, body: unknown, options?: RequestInit): Promise<Response> {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      body: JSON.stringify(body),
      ...options
    });
  }

  async put(url: string, body: unknown, options?: RequestInit): Promise<Response> {
    return fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      body: JSON.stringify(body),
      ...options
    });
  }

  async delete(url: string, options?: RequestInit): Promise<Response> {
    return fetch(url, { method: 'DELETE', ...options });
  }
}
```

**Example usage in game mapper:**
```typescript
// Update web scoreboard
if (subject === 'player' && property === 'score') {
  await context.http.post('http://scoreboard.local/update', {
    game: game,
    player: player,
    score: value
  });
}
```

### 2.3 Hot Reload

**File:** `rgfx-hub/src/mapping/mapping-loader.ts`
```typescript
import { watch } from 'node:fs';
import { resolve } from 'node:path';

export class MappingLoader {
  private watcher?: ReturnType<typeof watch>;
  private mappingDir = resolve('config/mappings');

  constructor(
    private mappingEngine: MappingEngine,
    private logger: Logger
  ) {}

  startHotReload(): void {
    this.watcher = watch(
      this.mappingDir,
      { recursive: true },
      (eventType, filename) => {
        if (filename && (filename.endsWith('.ts') || filename.endsWith('.js'))) {
          this.logger.info(`Mapping file changed: ${filename}`);
          this.reloadMappings(filename);
        }
      }
    );

    this.logger.info('Hot reload enabled for mapping files');
  }

  stopHotReload(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = undefined;
    }
  }

  private async reloadMappings(filename: string): Promise<void> {
    try {
      // Clear require cache for this file
      const fullPath = resolve(this.mappingDir, filename);
      delete require.cache[fullPath];

      // Reload all mappings (simpler than patching)
      await this.mappingEngine.loadMappings();

      this.logger.info(`✓ Successfully reloaded ${filename}`);

    } catch (error) {
      this.logger.error(`Failed to reload ${filename}:`, error);
      // Keep old mappings on failure
    }
  }
}
```

**Add to main.ts:**
```typescript
const mappingLoader = new MappingLoader(mappingEngine, logger);

app.on('ready', async () => {
  await mappingEngine.loadMappings();
  mappingLoader.startHotReload();
  // ... rest
});

app.on('before-quit', () => {
  mappingLoader.stopHotReload();
  // ... rest
});
```

### 2.4 State Persistence (Optional)

**File:** `rgfx-hub/src/mapping/state-store.ts` (enhance existing)
```typescript
import { promises as fs } from 'node:fs';

export class StateStoreImpl implements StateStore {
  private store = new Map<string, unknown>();
  private stateFile = 'config/mapping-state.json';

  // ... existing methods ...

  async save(): Promise<void> {
    try {
      const data = JSON.stringify([...this.store]);
      await fs.writeFile(this.stateFile, data, 'utf-8');
    } catch (error) {
      console.error('Failed to save state:', error);
    }
  }

  async load(): Promise<void> {
    try {
      const data = await fs.readFile(this.stateFile, 'utf-8');
      this.store = new Map(JSON.parse(data));
    } catch (error) {
      // File doesn't exist or invalid - start fresh
      this.store = new Map();
    }
  }

  // Auto-save on changes (debounced)
  set<T>(key: string, value: T): void {
    this.store.set(key, value);
    this.debouncedSave();
  }

  private debouncedSave = debounce(() => this.save(), 1000);
}
```

### 2.5 Additional Example Mappers

**File:** `rgfx-hub/config/mappings/games/galaga.ts`
```typescript
import type { MappingContext } from '../../../src/types/mapping-types';

export function handle(topic: string, payload: string, context: MappingContext): boolean {
  const [game, subject, property, ...details] = topic.split('/');

  if (game !== 'galaga') return false;

  // Galaga red theme for scores
  if (subject === 'player' && property === 'score') {
    context.udp.broadcast({
      effect: 'score',
      value: parseInt(payload),
      hint: {
        visual: 'pulse',
        color: '#FF0000',  // Galaga red
        duration: 300
      }
    });
    return true;
  }

  // Bonus stage
  if (subject === 'bonus' && property === 'stage') {
    context.udp.broadcast({
      effect: 'bonus_stage',
      hint: {
        visual: 'sparkle',
        color: '#FFFF00',
        count: 20,
        duration: 3000
      }
    });
    return true;
  }

  return false;
}
```

**File:** `rgfx-hub/config/mappings/games/smb.ts`
```typescript
import type { MappingContext } from '../../../src/types/mapping-types';

export function handle(topic: string, payload: string, context: MappingContext): boolean {
  const [game, subject, property, ...details] = topic.split('/');

  if (game !== 'smb') return false;

  // Mario gold theme for coins/score
  if (subject === 'player' && property === 'score') {
    context.udp.broadcast({
      effect: 'score',
      value: parseInt(payload),
      hint: {
        visual: 'pulse',
        color: '#FFD700',  // Gold
        duration: 300
      }
    });
    return true;
  }

  // Flag captured - celebration!
  if (subject === 'flag' && property === 'captured') {
    context.udp.broadcast({
      effect: 'level_complete',
      hint: {
        visual: 'rainbow',
        duration: 3000
      }
    });
    return true;
  }

  // Star power
  if (subject === 'powerup' && property === 'star') {
    context.state.set('star_active', true);
    context.udp.broadcast({
      effect: 'powerup_star',
      hint: {
        visual: 'rainbow',
        speed: 100
      }
    });
    return true;
  }

  return false;
}
```

---

## File Structure (Complete)

```
rgfx-hub/
  src/
    types/
      mapping-types.ts           (new - all mapping interfaces)
    mapping/
      udp-client.ts              (new - UDP implementation)
      mqtt-client-wrapper.ts     (new - MQTT wrapper)
      http-client.ts             (new - HTTP client)
      state-store.ts             (new - state storage)
      logger-wrapper.ts          (new - logger wrapper)
      mapping-loader.ts          (new - hot reload)
    mapping-engine.ts            (new - core engine)
    main.ts                      (modify - integrate engine)

  config/
    mappings/
      games/
        pacman.ts                (new - Pac-Man overrides)
        galaga.ts                (new - Galaga overrides)
        smb.ts                   (new - SMB overrides)
        _template.ts             (new - template for users)
      subjects/
        player.ts                (new - generic player events)
        enemy.ts                 (new - generic enemy events)
        ghost.ts                 (new - ghost events)
      patterns/
        score.ts                 (new - deep score matching)
      default.ts                 (new - ultimate fallback)

mame/
  lua/
    interceptors/
      pacman_rgfx.lua            (modify - add game prefix, fix order)
      galaga_rgfx.lua            (modify - add game prefix, fix order)
      nes_smb_rgfx.lua           (modify - add game prefix, fix order)
      nes_castlevania3_rgfx.lua  (modify - add game prefix, fix order)
      snes_smw_rgfx.lua          (modify - add game prefix, fix order)
```

---

## Testing Strategy

### Unit Tests
- Payload parsing (simple string, number, JSON auto-detection)
- Individual mapper handlers (player.ts, enemy.ts, pacman.ts)
- Token extraction (game, subject, property, details)
- Cascading precedence (game beats subject beats pattern)
- Error handling (invalid JSON, missing handlers, exceptions)

### Integration Tests
- Event file → EventFileReader → MappingEngine → UDP output
- Synthetic events verify correct routing
- Cascading: game-specific overrides subject defaults
- Hot reload: modify file, verify changes applied

### Manual Testing
- Run MAME with updated Lua interceptors
- Verify events in correct format in log file
- Check Hub processes events correctly
- Test game-specific behavior (Pac-Man yellow vs generic green)
- Test default fallback (unknown events get white pulse)

---

## Migration Steps

1. **Backup current implementation**
2. **Update Lua interceptors** (add game prefix, fix token order)
3. **Create type definitions** (mapping-types.ts)
4. **Implement mapping engine** (mapping-engine.ts)
5. **Create context implementations** (udp-client.ts, state-store.ts, logger-wrapper.ts)
6. **Create default mappers** (subjects/, patterns/, default.ts)
7. **Create example game mapper** (games/pacman.ts)
8. **Integrate with main.ts** (wire up engine)
9. **Test with real games** (Pac-Man, Galaga, SMB)
10. **Add MQTT/HTTP contexts** (Phase 2)
11. **Add hot reload** (Phase 2)
12. **Create additional example mappers** (games/galaga.ts, games/smb.ts)
13. **Write documentation** (user guide, API reference)

---

## Success Criteria

**Phase 1 Complete:**
- ✅ Lua interceptors emit events in correct format (`{game}/{subject}/{property}/{detail...} {payload}`)
- ✅ Hub parses events correctly (topic + payload split, semantic positions)
- ✅ Default mappers handle common patterns (player/score, player/death, enemy/destroyed)
- ✅ Game-specific mappers override defaults (Pac-Man yellow vs generic green)
- ✅ Events trigger LED effects via UDP with semantic effect names + hints
- ✅ Cascading works (game → subject → pattern → default)
- ✅ All tests pass

**Phase 2 Complete:**
- ✅ MQTT context works (can publish to smart home topics)
- ✅ HTTP context works (can POST to REST APIs)
- ✅ Hot reload works (edit mapper file, changes apply immediately)
- ✅ State persistence works (state survives restarts)
- ✅ Example mappers for all games (Pac-Man, Galaga, SMB)
- ✅ Documentation complete (README, API docs, examples)
