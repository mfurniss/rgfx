# RGFX Public Documentation

## CRITICAL REQUIREMENTS

**Documentation accuracy is paramount.** Every page must be technically accurate and reflect the current state of the RGFX codebase.

### Minimize HTML

Use standard markdown wherever possible. HTML should only be used where there is no markdown alternative (e.g., `<video>` embeds). Do not use HTML for layout, styling, or features that can be achieved with markdown or MkDocs Material features.

Accepted exceptions:

- LED test pattern visualizations in `getting-started/test-leds.md` — CSS-driven diagrams with no markdown equivalent
- Download button on `index.md` — uses `md_in_html` extension with `{ .md-button .md-button--primary }` attribute syntax

### Before Making Documentation Changes

1. **Verify against source code** - Never document features based on assumptions. Always read the actual implementation in:
   - `/rgfx-hub/src/` for Hub features
   - `/esp32/src/` for ESP32 driver features
   - `/rgfx-hub/assets/interceptors/` and `/rgfx-hub/assets/mame/` for MAME integration

2. **Cross-reference architecture docs** - Consult `/.claude/docs/architecture.md` for system design context

3. **Test examples** - Any code examples must be verified to work with the current implementation

### Documentation Standards

- Link to relevant subreddits (r/led, r/esp32, r/MAME) and external resources in the FAQ "Still stuck?" section
- The FAQ Troubleshooting section includes a macOS Gatekeeper workaround (right-click → Open) and requirements.md has a matching admonition
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
├── index.md                    # Landing page with hero video and download button
├── example-games.md            # Example games & community scripts
├── faq.md                      # FAQ and troubleshooting
├── getting-started/            # 6-page onboarding flow (requirements → hub-setup → first-driver → test-leds → configure-mame → play)
├── hub-app/                    # Hub application reference (9 pages, settings includes driver fallback toggle)
├── hardware/                   # LED hardware (choosing, wiring, configure, definitions, effects with blend modes + compatibility table, examples)
├── interceptors/               # Lua interceptor docs (8 pages incl. sprite-extraction.md, all examples use _G.event() with real game events)
└── transformers/               # JS transformer docs (6 pages, bitmaps.md covers inline + GIF + JSON sprites + movement/easing, ambilight has single/multi driver modes)
```

### Config Directory References

Never hardcode `~/.rgfx` paths. Use "config directory" with a link to `getting-started/hub-setup.md#config-directory` on first mention per page. The hub-setup page has the canonical platform table (macOS/Windows).

### Build Artifacts

Generated site files in `public-docs/site/` must be committed. After updating documentation source files, regenerate the site and commit both source and generated files.

**Do NOT run `npm run docs:build` or `mkdocs build` yourself.** The user has a watch process that rebuilds automatically.

### Key Technical Facts (Verified Feb 2026)

- Boot delay API is `_G.boot_delay()` (defined in event.lua), NOT `ram.set_boot_delay()`. It suppresses events during the power-on self test — it does not skip title screens or attract modes.
- Transformer cascade tiers: game → subject → property → default (the third tier is "Property", not "Pattern")
- Transformer utils live in `transformers/utils/` directory (import from `../utils/index.js`); async utils include `debounce` (leading-edge), `throttleLatest` (leading+trailing), `sleep`, `trackedTimeout`, `trackedInterval`
- Transformer context services include: `broadcast`, `send`, `drivers`, `log`, `state`, `hslToHex`, `udp`, `mqtt`, `http`, `loadGif`, `loadSprite`, `parseAmbilight`
- Init events (`<game>/init`) are emitted automatically by the framework ~500ms after interceptor load; they bypass boot delay
- Sprite extraction (`sprite-extract.lua`) reads ROM graphics at runtime; manifests declared in interceptors; outputs JSON to `transformers/bitmaps/`
- `loadSprite(path)` loads JSON sprite files; returns same format as `loadGif` but `palette` is optional (defaults to PICO-8)
- Requirements page lists WS2812B (RGB) as recommended starter LEDs; SK6812 (RGBW) noted as supported alternative in a tip admonition; includes budget estimate ($25-35 strip, $45-60 with matrix)
- Configure MAME page (`getting-started/configure-mame.md`) documents the `-autoboot_script` flag, rgfx.lua locations per platform, launch-mame.sh script, and frontend integration
- Effects page includes a strip/matrix compatibility table; Bitmap, Text, Scroll Text, Spectrum, and Music are matrix-only
- Writing interceptors page has an expanded MAME debugger section with command table and link to official debugger reference
- ESP32 firmware variants: `esp32dev` (WROOM) and `lolin_s3_mini` (S3) — no ESP32-C3 firmware exists
- GPIO valid range is 0-48 (ESP32-S3 has higher GPIO numbers than original ESP32)
- FFT module requires `emit_events = true` to emit events (defaults to false)
- Interceptor and transformer docs are cross-linked — related pages link to their counterpart (e.g., ambilight interceptor ↔ ambilight transformer, events → transformers, writing-interceptors → writing-transformers)

### When Adding New Features

If you implement a new feature in the codebase, you MUST update the corresponding documentation page. Undocumented features are bugs.
