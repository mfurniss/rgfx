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
├── getting-started/            # 5-page onboarding flow (requirements has download links, test-leds moved here)
├── hub-app/                    # Hub application reference (9 pages, settings includes driver fallback toggle)
├── hardware/                   # LED hardware (choosing, wiring, configure, effects with blend modes, examples)
├── interceptors/               # Lua interceptor docs (7 pages, all examples use _G.event() with real game events)
└── transformers/               # JS transformer docs (6 pages, ambilight has single/multi driver modes)
```

### Config Directory References

Never hardcode `~/.rgfx` paths. Use "config directory" with a link to `getting-started/hub-setup.md#config-directory` on first mention per page. The hub-setup page has the canonical platform table (macOS/Windows).

### Build Artifacts

Generated site files in `public-docs/site/` must be committed. After updating documentation source files, regenerate the site and commit both source and generated files.

**Do NOT run `npm run docs:build` or `mkdocs build` yourself.** The user has a watch process that rebuilds automatically.

### When Adding New Features

If you implement a new feature in the codebase, you MUST update the corresponding documentation page. Undocumented features are bugs.
