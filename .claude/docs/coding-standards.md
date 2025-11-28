# Coding Standards

## File Naming Conventions

**CRITICAL - ALWAYS FOLLOW THESE STANDARDS:**

Each sub-project follows its ecosystem's file naming conventions. **Consistency within each project is mandatory.**

### rgfx-hub/ (TypeScript/React/Electron)

**Standard: kebab-case for all files**

**ALL files use kebab-case** (lowercase with hyphens):
- TypeScript modules: `driver-registry.ts`, `event-file-reader.ts`
- React components: `driver-card.tsx`, `system-status.tsx`
- Test files: `driver-registry.test.ts`, `mqtt.test.ts`

#### Code Naming (Inside Files)

**Classes, Interfaces, Types, Enums:** `PascalCase`
**Functions, Methods, Variables, Properties:** `camelCase`
**Constants:** `UPPER_SNAKE_CASE`
**React Components:** `PascalCase` (required by React)
**Boolean variables/props:** Use `is`, `has`, `should` prefixes
**Callback functions:** Prefix with `on` to distinguish from state

Example:
```typescript
// State (data)
const drivers: Driver[] = [];
const connected: boolean = true;

// Callbacks/Actions (functions)
const onDriverConnected = (driver: Driver) => { /* ... */ };
const onDriverDisconnected = (driver: Driver) => { /* ... */ };
```

**Why this matters:** Without the `on` prefix, `driverConnected` looks like boolean state, not a callback function.

**Type parameters:** Single uppercase letter or `PascalCase`

#### Prohibited Patterns

- **NO `I` prefix for interfaces**
- **NO `_` prefix for private members** (use TypeScript `private` keyword)
- **NO Hungarian notation** (type prefixes)
- **NO mixing file naming conventions**

#### Rationale

**Why kebab-case for files:**
1. **Cross-platform safety** - Works identically on case-insensitive (macOS, Windows) and case-sensitive (Linux) filesystems
2. **Modern ecosystem alignment** - Next.js routing, file-based routing frameworks prefer kebab-case
3. **URL-friendly** - `user-profile` naturally maps to `/user-profile` routes
4. **Visual clarity** - Clear separation between file names (kebab-case) and code identifiers (PascalCase/camelCase)
5. **Consistency** - One convention for all files eliminates cognitive overhead

### esp32/ (C++/Arduino/PlatformIO)

**Standard: snake_case for all files**
- Examples: `config_leds.cpp`, `sys_info.h`, `driver_config.cpp`, `mqtt.cpp`

**Code naming:**
- Variables/Functions: `camelCase`
- Classes: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`

### CSS Modules (TypeScript + Vite)

**Standard: Global declaration file**

- **File**: `rgfx-hub/src/css-modules.d.ts` (global declaration for all `*.module.css` files)
- **NO per-file `.d.ts` generation** - Avoids workspace clutter and git noise
- **NO auto-generation plugins** - Simple, zero-dependency approach
- **Gitignored**: `*.module.css.d.ts` files are gitignored (just in case)

**Rationale:**
- Global declaration is the official Next.js recommendation
- Prevents auto-generated files from cluttering the workspace
- Eliminates git noise from generated type definitions
- Simple, maintainable, and aligns with modern best practices (2024-2025)
- Trade-off: No autocomplete for specific class names (acceptable for small number of CSS modules)

### mame/lua/ (Lua)

**Standard: snake_case for all files**
- Examples: `rgfx.lua`, `event.lua`, `pacman_rgfx.lua`

**Lua Code Formatting and Linting:**
- **Formatter**: StyLua (`brew install stylua`)
- **Linter**: luacheck (`brew install luacheck`)

**CRITICAL - ALWAYS format and lint Lua files after editing:**
```bash
cd mame/lua && stylua . && luacheck .
```

## Code Quality Standards

**CRITICAL - SEPARATION OF CONCERNS IS PARAMOUNT:**

Each layer in the architecture should have a SINGLE, WELL-DEFINED responsibility. NEVER let responsibilities bleed between layers.

**ESP32 Effect System Architecture:**
- **main.cpp**: ONLY knows about UDP. Receives UDP messages and passes to effect processor.
- **udp.cpp**: ONLY parses JSON into effect name + props object. NO defaults, NO interpretation.
- **effect-processor.cpp**: ONLY routes effect names to the correct effect via lookup table. Passes props through untouched.
- **Individual effects (pulse.cpp, wipe.cpp, etc.)**: ONLY place where props are parsed and defaults are defined.

**NEVER:**
- Parse props in main.cpp
- Set defaults in UDP parser
- Extract specific props in effect processor
- Mix concerns between layers

**Example of WRONG approach:**
```cpp
// UDP parser setting defaults - WRONG!
pendingMessage.duration = props["duration"] | 500;

// main.cpp parsing color - WRONG!
uint32_t color = parseColor(message.props["color"]);
effectProcessor->trigger(message.effect, color);
```

**Example of CORRECT approach:**
```cpp
// UDP: Just parse and pass through
pendingMessage.props = doc["props"];

// main.cpp: Just route
effectProcessor->trigger(message.effect, message.props);

// Effect processor: Just lookup and delegate
wipeEffect.trigger(props);

// Individual effect: Parse with defaults
uint32_t duration = props["duration"] | 2000;  // Default lives here
```

## Research and Documentation

**NEVER GUESS OR ASSUME:**
1. **Research first** - Use WebSearch and WebFetch before implementing
2. **Check local docs** - Always check local documentation first
3. **Check library examples** - Read example code in library's examples folder
4. **Verify recency** - DO NOT use information over 2 years old
5. **When stuck** - ASK rather than guessing

**CRITICAL - Avoid Guessing Rabbit Holes:**
- If you try 2-3 approaches and they all fail, STOP and research
- **NEVER get stuck in a guessing loop** - After a couple attempts, look online for solutions

**CRITICAL - Never Promise to "Remember" Without Documentation:**
- NEVER say "I'll make a note" or "I'll remember" without actually updating CLAUDE.md
- Update CLAUDE.md immediately when establishing new patterns

**CRITICAL - When User Says "ALL", They Mean ALL:**
- Use comprehensive searches that include ALL file types
- Don't use narrow patterns (e.g., only `.ts` files)

## TypeScript and Lint Errors

**MUST FIX IMMEDIATELY:**
1. **ALWAYS fix TypeScript errors** - Run `npm run typecheck`
2. **ALWAYS fix ESLint errors** - Run `npm run lint`
3. **CRITICAL: ALWAYS LINT AFTER EVERY CODE CHANGE**
4. **After updating TypeScript files** - Run `npm run lint -- --fix`
5. **Use npm scripts, not npx** - Use `npm run typecheck` not `npx tsc`
6. **Zero tolerance** - Never leave code with errors

## Testing Standards

**MEANINGFUL TESTS ONLY:**
1. **No shallow tests** - Don't just test static input objects for coverage
2. **Test real behavior** - Verify actual functionality, edge cases, error conditions
3. **Test dynamic scenarios** - Realistic data, state changes, async operations
4. **Quality over coverage** - Few meaningful tests better than many shallow tests

**FORBIDDEN TEST PRACTICES:**
1. **NO HACKS** - Never use hacks to make tests pass
2. **NO API MODIFICATION** - Never modify native APIs to fix tests
3. **NO APP CODE CHANGES** - Never modify app code just to make tests pass
4. **NO SKIPPING TESTS** - Never use `.skip()`, `xit()`, or comment out tests
5. **WE ARE NOT DOING TDD** - Tests follow implementation
6. **If a test is hard to write** - The test approach is wrong, not the code

## Code Style and Architecture

**CLEAN, EFFICIENT, READABLE:**
1. **Optimized but readable** - Performant code that's easy to understand
2. **Add comments where necessary** - Explain complex logic, business rules, non-obvious decisions
3. **Modular design** - Small, single-responsibility functions and classes
4. **Technology agnostic** - Loosely coupled code
5. **KISS principle** - Simplest solution that works is best
6. **Use optional chaining** - For checking array/object properties (e.g., `if (targetDrivers?.length)` instead of `if (targetDrivers && targetDrivers.length > 0)`)

**Comment Guidelines:**
- **NEVER add comments about your thought process** - Other engineers don't care
- **NEVER add obvious comments** - Don't describe "what" if it's clear from the code
- **NO "what" comments** - Never comment what the code is doing if it's self-explanatory
- **DO add comments for "why"** - Business logic, edge cases, workarounds, non-obvious decisions

**Examples of BAD comments:**
```cpp
// Parse color
uint32_t color = props["color"] ? parseColor(props["color"]) : DEFAULT_COLOR;

// Parse duration
uint32_t duration = props["duration"] | DEFAULT_DURATION;

// Add the wipe
Wipe newWipe;

// Device name should be "rgfx-driver-" + deviceId
String expected = String("rgfx-driver-") + deviceId;

// Check prefix matches
for (size_t i = 0; i < prefixLen; i++) {

// Mock String class for native testing
class String {

// Called before each test
void setUp(void) {
```

**Examples of GOOD comments:**
```cpp
// Use alpha blending to avoid flickering when multiple pulses overlap
matrix.leds[i] = blend(matrix.leds[i], pulseColor, pulse.alpha);

// Cache deltaTime to avoid redundant float->int conversions in tight loop
uint32_t deltaTimeMs = static_cast<uint32_t>(deltaTime * 1000.0f);
```

**Data-Driven Code:**
- **Prefer lookup tables over long if/else chains**
- Data structures are easier to maintain than branching logic

Example:
```cpp
// Good: Lookup table
CRGB colors[] = {CRGB::Red, CRGB::Green, CRGB::Blue, CRGB::Yellow};
color = colors[segment];
```

## Asynchronous Code Patterns

**CRITICAL - AVOID FRAGILE setTimeout() CALLS:**

1. **setTimeout is FRAGILE** - Never assume how long operations will take
2. **Use async/await** - Wait for actual completion
3. **Use Promises** - Return and await Promises
4. **Event-driven patterns** - Use events and callbacks

**When setTimeout IS acceptable:**
- Tests: Simulating async delays
- Debouncing/throttling: User input handling
- Animation timing: Wall-clock time requirements

**Key principle:** If you're using setTimeout to "wait for something to finish", you're doing it wrong. Wait for the actual completion signal.

## Development Dependencies

**ALWAYS use --save-dev for development tools:**
- Testing frameworks, TypeScript, linters, formatters, build tools, type definitions (@types/*)

**Use regular dependencies ONLY for runtime code**
