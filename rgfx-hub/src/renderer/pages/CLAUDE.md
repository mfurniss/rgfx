# Renderer Pages

> **Keep this file updated!** After making changes in this folder, update this CLAUDE.md to reflect the current state.

This folder contains the main page components for the RGFX Hub application. Each page is a React functional component that renders a full-page view accessible via React Router.

**Import convention:** Use deep imports for `@mui/icons-material` (e.g., `import SaveIcon from '@mui/icons-material/Save'`). Barrel imports cause EMFILE errors in vitest.

---

## Pages

### System Status Page

**File:** [system-status-page.tsx](system-status-page.tsx)

**Route:** `/` (home)

**Purpose:** Main dashboard showing system health and all connected drivers.

**Features:**
- Displays system status (MQTT broker, UDP server, event reader, hub IP, etc.)
- Shows a sortable table of all known drivers with connection status
- Uses `SystemStatus` and `DriverListTable` components

---

### Driver Detail Page

**File:** [driver-detail-page.tsx](driver-detail-page.tsx)

**Route:** `/driver/:mac`

**Purpose:** Shows detailed information for a single driver.

**Features:**
- Looks up driver by MAC address (immutable identifier)
- Renders full `DriverCard` component with telemetry, stats, and actions
- Shows error state if driver not found

---

### Driver Config Page

**File:** [driver-config-page.tsx](driver-config-page.tsx)

**Route:** `/driver/:mac/config`

**Purpose:** Configuration form for editing driver settings.

**Features:**
- Form fields: Driver ID, description, remote logging level
- LED configuration: hardware selection, GPIO pin (chip-aware selector), offset, reverse direction (strips), brightness limit, dithering, power settings, RGBW mode (for 4-channel strips)
- Passes `chipModel` from driver telemetry to enable board-specific GPIO pin validation
- Default values applied when first configuring LED hardware: globalBrightnessLimit=128, maxPowerMilliamps=500
- Existing values preserved when switching hardware types on already-configured drivers
- Uses `react-hook-form` with Zod validation (`ConfiguredDriverSchema`) with `normalizeLedConfig()` for backward compatibility
- Form submit handler uses `React.SyntheticEvent` (not deprecated `FormEvent`)
- Loads available LED hardware definitions from hub
- Saves configuration via IPC and auto-pushes to connected drivers (shows info notification on success)
- Handles driver rename (ID change) seamlessly

### Driver Config Subdirectory

**Directory:** [driver-config/](driver-config/)

Refactored components, hooks, and utilities extracted from the main page:

| File | Purpose |
|------|---------|
| `components/identity-section.tsx` | Driver ID and MAC address form fields |
| `components/settings-section.tsx` | Description and remote logging fields |
| `components/led-config-section.tsx` | All LED configuration fields |
| `hooks/use-led-hardware.ts` | Hook to load LED hardware options |
| `utils/led-config-helpers.ts` | Helper functions (display name, RGBW check, normalize) |

---

### Event Monitor Page

**File:** [event-monitor-page.tsx](event-monitor-page.tsx)

**Route:** `/events`

**Purpose:** Displays real-time game event statistics.

**Features:**
- Sortable table showing all event topics received from MAME
- Columns: topic name, occurrence count, last value
- Each row rendered as memoized `EventRow` component (only re-renders when its own props change)
- Uses `EventStore` for reactive updates
- Click-to-simulate: clicking a row triggers that event through the simulator
- Simplified async pattern for event processing

---

### Effects Playground Page

**File:** [effects-playground-page.tsx](effects-playground-page.tsx)

**Route:** `/effects`

**Purpose:** Interactive testing interface for LED effects.

**Features:**
- Dropdown to select effect type (pulse, wipe, explode, etc.)
- Dynamic form generated from Zod schemas with `EffectForm` component
- Per-effect randomize functions for quick testing
- Driver selection checkboxes with "select all" option
- Triggers effects via UDP broadcast to selected drivers
- Preset selection modal for gradient and plasma effects
- State persisted in `UiStore` across navigation
- Code generation tab showing JavaScript code for transformers
- **Per-effect form defaults:** `getDefaultProps()` merges `effectFormDefaults` on top of schema defaults (e.g., bitmap endX/endY default to 'random' in the form without changing wire schema)
- **Form validation gate:** Trigger and Random Trigger buttons are disabled when the form has validation errors (`isFormValid` state, fed by `EffectForm.onValidityChange`)
- **Debounced store writes:** `handlePropsChange` uses lodash `debounce` (150ms) with `useRef` for stable callback identity, preventing rapid keystrokes from thrashing the store. Debounce is flushed before triggering effects or randomizing to ensure store is current
- **Single driver store subscription:** uses one `drivers` subscription with `useMemo` to derive `connectedDrivers` and `connectedDriverIds`, avoiding redundant store subscriptions
- **Driver selection:** uses shared `useDriverSelection` hook for driver picker state (removed local auto-reselect useEffect)

### Effects Playground Subdirectory

**Directory:** [effects-playground/](effects-playground/)

Refactored components and utilities extracted from the main page:

| File | Purpose |
|------|---------|
| `components/tab-panel.tsx` | Tab panel wrapper for tabbed interface |
| `effect-helpers.ts` | Effect manipulation helpers (randomize, defaults) |
| `utils/code-generator.ts` | Generic JavaScript code generator; per-effect overrides via `effectCodeGenerators` and `effectCodePropsTransforms` maps from schemas |
| `utils/value-formatter.ts` | Formats values for code output (escapes single quotes and backslashes in strings) |

---

### Simulator Page

**File:** [simulator-page.tsx](simulator-page.tsx)

**Route:** `/simulator`

**Purpose:** Manual event simulation for testing event-to-effect mappings.

**Features:**
- 12 configurable event rows (persisted across sessions)
- Each row rendered as isolated `SimulatorRow` component (per-row Zustand subscriptions, local input state with debounced store sync)
- Each row has: event input field, trigger button, auto-trigger interval selector
- Event format: `topic payload` (space-delimited)
- Auto-trigger intervals: off, 1 second, 5 seconds
- Events processed through mapping engine just like real MAME events

---

### Firmware Page

**File:** [firmware-page.tsx](firmware-page.tsx)

**Route:** `/firmware`

**Purpose:** Firmware flashing interface for ESP32 drivers.

**Features:**
- Two flash methods: USB Serial and OTA WiFi
- Defaults to USB Serial when no drivers exist (first-time setup); OTA WiFi otherwise
- Flash method is read directly from `firmware-flash-store` (no local state) — eliminates the bidirectional sync that caused infinite loops on Windows
- Uses shared `useDriverSelection` hook for driver picker state
- **USB Serial:**
  - Serial port selection via Web Serial API
  - Uses `esptool-js` for direct ESP32 flashing
  - Automatically detects chip type and loads correct firmware variant
  - Loads and verifies firmware files against manifest checksums
  - Progress reporting and device reset after flash
  - WiFi config button using `useWifiConfigDialog` hook
- **OTA WiFi:**
  - Driver selection dropdown (connected drivers only)
  - Uses `esp-ota` library via IPC handler
  - Real-time progress events via `useOtaFlashEvents` hook
  - WiFi config OTA button for multi-driver credential configuration
- Chip-aware update detection: uses `mapChipNameToVariant()` to compare each driver's firmware against its chip type's target version
- Error alerts hidden during active flashing to prevent stale validation errors from displaying alongside progress bars (race condition between Zustand and React state batching)
- Log display showing flash progress
- Confirmation dialog for USB flashing
- Result dialog showing success/failure with context-appropriate help text
- Responsive layout with button grouping that wraps on narrow viewports

---

### Settings Page

**File:** [settings-page.tsx](settings-page.tsx)

**Route:** `/settings`

**Purpose:** Application settings and preferences.

**Layout:** Uses `Stack` with `spacing={3}` for consistent section spacing.

**Features:**
- **Appearance:** Theme mode selection (system/light/dark) via MUI color scheme
- **Driver Fallback:** Toggle to route effects targeting non-existent/offline drivers to the first available online driver (default: enabled)
- **Effect Modifiers:** Strip lifespan scaling setting for LED strips
- **Directories:**
  - RGFX Config Directory (required) - for interceptors, transformers, driver configs
  - MAME ROMs Directory (optional) - for ROM file location
  - Directory validation with folder picker dialogs
  - Uses `SuperButton` for save action with busy state
- **Backup:** One-click zip backup of entire `~/.rgfx` config directory via native save dialog
- **Logs:** Log file management with size display and clear functionality
- Saves to `UiStore` (localStorage persistence)
- Gets default paths from `AppInfoStore`

---

### Games Page

**File:** [games-page.tsx](games-page.tsx)

**Route:** `/games`

**Purpose:** View configured games and their associated scripts.

**Features:**
- Sortable table showing all configured games
- Columns: MAME ROM name, interceptor script, transformer script, launch button
- Clickable links to open interceptor/transformer files in default editor
- "Hide unconfigured" toggle filters to games with BOTH interceptor AND transformer
- Launch column (visible when ROMs directory is configured): play button for games with ROM, interceptor, and transformer; fires `window.rgfx.launchMame(romName)` (extension stripped) to launch MAME via the user's launch script
- Data loaded via `window.rgfx.listGames()` IPC call

---

### Help Page

**File:** [help-page.tsx](help-page.tsx)

**Route:** `/help`

**Purpose:** Documentation and help resources.

**Features:**
- Button to open online documentation (rgfx.io/docs) in default browser via `openExternal`
- No dependency on `AppInfoStore` — docs URL is a constant

---

### About Page

**File:** [about-page.tsx](about-page.tsx)

**Route:** `/about`

**Purpose:** Application information and credits.

**Features:**
- Application name and description
- Version number
- System architecture overview (Hub, Drivers, Communication)
- Technology stack details
- License and copyright information (MPL 2.0)

---

## Testing Notes

- **Do NOT call `cleanup()` in page tests.** Global `afterEach(cleanup)` in `setup.ts` handles this automatically.

## Cross-Platform Considerations

**CRITICAL: All fixes for Windows issues MUST NOT break existing macOS code.** The app must work on both platforms. Always test fixes on macOS or ensure the change is logically compatible.

### Windows vs macOS Timing Issues

The renderer runs on both macOS and Windows. **Windows has different timer resolution and event loop timing** which can expose bugs that don't manifest on macOS.

**Pattern to avoid:** Bidirectional sync between local state and Zustand store:
```tsx
// DANGEROUS - creates infinite loop when both effects fire in same render cycle
useEffect(() => {
  setLocalState(storedValue);  // Store → Local
}, [storedValue]);

useEffect(() => {
  updateStore(localState);  // Local → Store
}, [localState]);
```

**Preferred solution:** Read directly from the store — no local state, no sync:
```tsx
const value = useUiStore((state) => state.someValue);
const setValue = useUiStore((state) => state.setSomeValue);
// Use value and setValue directly — no local copy, no effects
```

**Fallback for forms** (where local state is needed for typing before save):
Use a ref to initialize from store only once:
```tsx
const initialized = useRef(false);

useEffect(() => {
  if (!initialized.current && storedValue) {
    initialized.current = true;
    setLocalState(storedValue);
  }
}, [storedValue]);
```

---

## ESLint Rules to Remember

Before writing code, review these rules from `eslint.config.mjs`:

1. **Blank line before control statements** (`padding-line-between-statements`):
   ```tsx
   const value = something;

   if (condition) { ... }  // ✅ Blank line required before if/for/while/switch/try
   ```

2. **No unused imports** (`@typescript-eslint/no-unused-vars`):
   - Prefix unused vars with `_` to ignore: `const _unused = value;`

3. **Single quotes** (`@stylistic/quotes`): Use `'string'` not `"string"`

4. **Max line length** (`@stylistic/max-len`): 100 chars (URLs, strings, templates exempt)

5. **Trailing commas** (`@stylistic/comma-dangle`): Required in multiline

6. **Object shorthand** (`object-shorthand`): Use `{ foo }` not `{ foo: foo }`

<!-- No per-file license headers — see root LICENSE -->
