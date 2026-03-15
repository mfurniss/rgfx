# RGFX Public Documentation

## CRITICAL REQUIREMENTS

**Documentation accuracy is paramount.** Every page must be technically accurate and reflect the current state of the RGFX codebase.

### Minimize HTML

Use standard markdown wherever possible. HTML should only be used where there is no markdown alternative (e.g., `<video>` embeds). Do not use HTML for layout, styling, or features that can be achieved with markdown or MkDocs Material features.

Accepted exceptions:

- LED test pattern visualizations in `getting-started/test-leds.md` — CSS-driven diagrams with no markdown equivalent
- Download and YouTube buttons on `index.md` — wrapped in a `.hero-buttons` flex div (CSS in `custom.css`) with `md_in_html` extension and `{ .md-button .md-button--primary }` attribute syntax; stacks vertically on mobile via `flex-wrap`

### Before Making Documentation Changes

1. **Verify against source code** - Never document features based on assumptions. Always read the actual implementation in:
   - `/rgfx-hub/src/` for Hub features
   - `/esp32/src/` for ESP32 driver features
   - `/rgfx-hub/assets/interceptors/` and `/rgfx-hub/assets/mame/` for MAME integration

2. **Cross-reference architecture docs** - Consult `/.claude/docs/architecture.md` for system design context

3. **Test examples** - Any code examples must be verified to work with the current implementation

### Documentation Standards

- Link to relevant subreddits (r/led, r/esp32, r/MAME) and external resources in the FAQ "Still stuck?" section
- The FAQ Troubleshooting section includes a macOS Sequoia EHOSTUNREACH workaround (Local Network privacy toggle) and a macOS Gatekeeper workaround (right-click → Open). The Windows app is now code-signed so no SmartScreen workaround is needed.
- Use precise technical terminology
- Include actual configuration options with correct defaults
- Document all parameters, not just common ones
- Show real examples from the codebase when possible
- Keep API references synchronized with actual function signatures

### Platform Support

RGFX Hub supports **macOS and Windows only**. Do not reference Linux support in the documentation.

### Terminology

- Included game scripts are **examples**, not "supported games." Never imply a fixed compatibility list.
- Do not hardcode counts of games or effects (e.g., "11 games", "13 effects"). Just say "example games" or "visual effects."
- Frame community contributions as encouraged — interceptors and transformers are starting points, not definitive versions.

### Voice

Use neutral voice for most content and first person "I" for personal opinions or recommendations. Do not use "we" — this is a single-author project.

### Site Structure

```
docs/
├── index.md                    # Landing page with hero video, download button, and feature highlights
├── example-games.md            # Example games & community scripts
├── faq.md                      # FAQ and troubleshooting
├── getting-started/            # 6-page onboarding flow (requirements → hub-setup → first-driver → test-leds → configure-mame → play)
├── hub-app/                    # Hub application reference (9 pages, settings includes driver fallback toggle)
├── hub-app/effects.md          # Visual Effects reference (standalone top-level nav item, not a Hub page)
├── hardware/                   # LED hardware (choosing, wiring, configure, definitions, examples)
├── interceptors/               # Lua interceptor docs (8 pages incl. sprite-extraction.md, all examples use _G.event() with real game events)
├── transformers/               # JS transformer docs (6 pages, bitmaps.md covers inline + GIF + JSON sprites + movement/easing, ambilight has single/multi driver modes)
└── acknowledgements.md         # Credits and open-source project acknowledgements
```

### Config Directory References

Never hardcode `~/.rgfx` paths. Use "config directory" with a link to `getting-started/hub-setup.md#config-directory` on first mention per page. The hub-setup page has the canonical platform table (macOS/Windows).

### Build Artifacts

Generated site files in `public-docs/site/` must be committed. After updating documentation source files, regenerate the site and commit both source and generated files.

**Do NOT run `npm run docs:build` or `mkdocs build` yourself.** The user has a watch process that rebuilds automatically.

The build script (`public-docs/build.sh`) downloads the latest mermaid.min.js from jsDelivr on every rebuild. The source copy at `docs/assets/js/mermaid.min.js` should be committed when it changes.

### Key Technical Facts (Verified Feb 2026)

- ROM-to-interceptor mapping uses `rom_map.json` (not `.lua`). The framework auto-loads `{romname}_rgfx.lua` by convention; `rom_map.json` is only needed for variant/clone ROMs whose name differs from the interceptor base name. Writing interceptors Step 3 reflects this.
- Boot delay API is `_G.boot_delay()` (defined in event.lua), NOT `ram.set_boot_delay()`. It suppresses events during the power-on self test — it does not skip title screens or attract modes.
- Transformer cascade tiers: game → subject → property → default (the third tier is "Property", not "Pattern")
- Transformer utils are provided via the `utils` object on the transformer context (not imported from files); includes `debounce` (leading-edge), `throttleLatest` (leading+trailing), `sleep`, `trackedTimeout`, `trackedInterval`, `exclusive`, `scaleLinear`, `randomInt`, `randomElement`, `hslToRgb`, `pick`, `formatNumber`
- Transformer context services include: `broadcast`, `send`, `drivers`, `log`, `state`, `hslToHex`, `udp`, `mqtt`, `http`, `loadGif`, `loadSprite`, `parseAmbilight`, `utils`
- Init events (`<game>/init`) are emitted automatically by the framework ~500ms after interceptor load; they bypass boot delay
- Sprite extraction (`sprite-extract.lua`) reads ROM graphics at runtime; manifests declared in interceptors; outputs JSON to `transformers/bitmaps/`
- `loadSprite(path)` loads JSON sprite files; returns same format as `loadGif` but `palette` is optional (defaults to PICO-8)
- Requirements page lists WS2812B (RGB) as recommended starter LEDs; SK6812 (RGBW) noted as supported alternative in a tip admonition
- Wiring page covers basic 3-wire connection (DATA, GND, 5V) and simple power guidance; links to r/led for advanced setups
- Configure MAME page (`getting-started/configure-mame.md`) documents the launch script installed to `~/.rgfx/` by the Hub on first launch, the `-autoboot_script` flag for manual/frontend use, and how to customize paths by editing the script
- Effects page (`hub-app/effects.md`, top-level nav) includes a strip/matrix compatibility table; Bitmap, Text, Scroll Text, Spectrum, Music, and Video are matrix-only
- Video effect requires ffmpeg; documented with an admonition on effects.md and listed as optional dependency on requirements.md
- FX Playground page (`hub-app/fx-playground.md`) includes a Video Playback subsection explaining the file picker and play/stop controls
- Writing interceptors page has an expanded MAME debugger section with command table and link to official debugger reference
- First-driver page includes a Windows USB driver admonition linking to the Silicon Labs CP210x driver download page
- ESP32 firmware variants: `esp32dev` (WROOM) and `lolin_s3_mini` (S3) — no ESP32-C3 firmware exists
- GPIO valid range is 0-48 (ESP32-S3 has higher GPIO numbers than original ESP32)
- FFT module requires `emit_events = true` to emit events (defaults to false)
- Interceptor and transformer docs are cross-linked — related pages link to their counterpart (e.g., ambilight interceptor ↔ ambilight transformer, events → transformers, writing-interceptors → writing-transformers)
- Acknowledgements page uses concise project descriptions (no redundant context in table cells)
- Trademark disclaimers appear as italicized footer text on `index.md` and `example-games.md` — any page that references specific game titles should include a similar disclaimer

### When Adding New Features

If you implement a new feature in the codebase, you MUST update the corresponding documentation page. Undocumented features are bugs.
