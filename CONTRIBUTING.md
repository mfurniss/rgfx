# Contributing to RGFX

Thanks for your interest in contributing to RGFX! Whether it's a new game interceptor, LED effect, bug fix, or documentation improvement - all contributions are welcome.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Ways to Contribute](#ways-to-contribute)
- [Adding Game Support](#adding-game-support-interceptors--transformers) - for hobbyists and retro gaming enthusiasts
- [Working on the Hub or ESP32 Driver](#working-on-the-hub-or-esp32-driver) - for experienced developers
- [Project Structure](#project-structure)
- [Making Changes](#making-changes)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Reporting Bugs](#reporting-bugs)
- [Requesting Features](#requesting-features)

## Code of Conduct

This project follows the [Contributor Covenant v2.1](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Ways to Contribute

- **Game interceptors** - Add support for a new retro game
- **Event transformers** - Create new visual effects for existing games
- **Code improvements** - Bug fixes, refactoring, performance (Hub or ESP32)
- **Documentation** - Fix typos, improve guides, add examples
- **Bug reports** - Found something broken? [Open an issue](#reporting-bugs)

---

## Adding Game Support (Interceptors & Transformers)

This is the most common way to contribute. You don't need to know TypeScript or C++ — just Lua (for interceptors), JavaScript (for transformers), or both.

### What You Need

- **MAME 0.250+** — [mamedev.org](https://www.mamedev.org/release.html) or `brew install mame` on macOS
- **RGFX Hub** — [download from GitHub](https://github.com/mfurniss/rgfx/releases/latest)
- A text editor
- ROM files for the game you want to support

### What Are Interceptors and Transformers?

**Interceptors** are Lua scripts that run inside MAME. They monitor game RAM — reading memory addresses to detect events like score changes, player deaths, level transitions, and entity spawns. Each interceptor emits events to a log file.

**Transformers** are JavaScript scripts that run in the Hub. They receive events from interceptors and decide what LED effects to trigger — pulses, ripples, scrolling text, sprite rendering, and more.

Together, they form the pipeline: **Game RAM → Interceptor (Lua) → Events → Transformer (JS) → LED Effects**.

### Getting Started

```bash
git clone https://github.com/mfurniss/rgfx.git
cd rgfx
```

Look at existing examples to understand the patterns:

- **Interceptors:** `rgfx-hub/assets/interceptors/games/` — Pac-Man, Galaga, Robotron, and more
- **Transformers:** `rgfx-hub/assets/transformers/games/` — matching transformer for each game

### Writing Guides

Detailed guides are available in the documentation:

- [Writing Interceptors](https://rgfx.io/docs/interceptors/writing-interceptors/) — covers MAME debugger workflow, RAM monitoring patterns, BCD decoding, state tracking
- [Writing Transformers](https://rgfx.io/docs/transformers/writing-transformers/) — covers event matching, effect types, driver targeting, sprite loading, sequencing

### Testing Your Changes

Launch MAME with RGFX monitoring:

**macOS:**
```bash
./scripts/launch-mame.sh pacman
```

**Windows:**
```
scripts\launch-mame.bat pacman
```

Use the Hub's **Event Monitor** to see events in real time, or the **Simulator** to test effects without hardware.

Transformer changes are hot-reloaded — no restart needed.

### Linting

Lua scripts must pass linting before submission:

```bash
luacheck path/to/your_interceptor.lua
stylua --check path/to/your_interceptor.lua
```

Install with `brew install luacheck stylua` (macOS) or download from GitHub.

---

## Working on the Hub or ESP32 Driver

This section is for developers contributing to the Hub application (TypeScript/Electron) or the ESP32 driver firmware (C++).

### Prerequisites

#### macOS

```bash
# Node.js 20+ (for Hub)
brew install node

# PlatformIO (for ESP32 firmware)
brew install platformio

# MAME 0.250+ (for game emulation)
brew install mame

# Lua tools (for Lua script linting)
brew install luacheck
brew install stylua
```

#### Windows

```powershell
# Node.js 20+

# PlatformIO - install via pip or the VSCode extension:
pip install platformio
# Or install the PlatformIO IDE extension in VSCode

# MAME 0.250+ - download from https://www.mamedev.org/release.html

# Lua tools (for Lua script linting)
# Install luacheck and stylua via LuaRocks or download binaries from GitHub
```

> **Windows note:** RGFX is primarily developed on macOS. The Hub and ESP32 firmware work cross-platform. Launch scripts are provided for both platforms: `scripts/launch-mame.sh` (macOS) and `scripts/launch-mame.bat` (Windows).

### Clone and Install

```bash
git clone https://github.com/mfurniss/rgfx.git
cd rgfx
```

### Hub (Electron App)

```bash
cd rgfx-hub
npm install
npm start        # Launch the Hub in development mode
```

**Code standards:**

- Zero TypeScript errors — strict mode, no `any` types
- Zero ESLint warnings — all warnings are treated as errors
- camelCase for variables and functions, PascalCase for types/interfaces/classes
- No unused exports
- Separation of concerns — keep modules focused

**Testing:**

```bash
cd rgfx-hub
npm test             # Run all tests
npm run typecheck    # TypeScript compilation check
npm run lint         # ESLint
```

### ESP32 Firmware

```bash
cd esp32
pio run              # Compile firmware
pio run -t upload    # Flash via USB (requires connected ESP32)
pio test -e native   # Run unit tests
```

**Code standards:**

- Follow existing patterns in `esp32/src/`
- Use `.clang-format` for formatting
- Firmware must compile with `pio run`

### Running All Checks

Before submitting any changes, run the check script:

```bash
./scripts/check-code.sh --all
```

This runs TypeScript compilation, ESLint, unit tests, ESP32 build verification, and Lua linting — depending on which files you changed. The same checks run in CI.

### Testing Philosophy

- **Tests must be meaningful** — test real behavior, not mocks
- Don't write tests that only verify mock setup
- Quality over coverage — a few good integration tests beat many shallow unit tests
- If a test is difficult to write, that's often a signal the code needs restructuring

---

## Project Structure

```
rgfx/
├── rgfx-hub/              # Electron Hub application (TypeScript/React)
│   ├── src/               # Application source
│   │   ├── main.ts        # Main process
│   │   └── renderer/      # React UI
│   ├── assets/
│   │   ├── mame/          # Core MAME Lua framework
│   │   └── interceptors/  # Game-specific Lua scripts
│   └── package.json
├── esp32/                 # ESP32 Driver firmware (C++/Arduino)
│   ├── src/               # Firmware source
│   ├── test/              # Unit tests (Unity framework)
│   └── platformio.ini     # Build configuration
├── public-docs/           # User-facing documentation (MkDocs)
├── scripts/               # Build and validation scripts
└── docs/                  # Internal documentation
```

## Making Changes

### Branch Workflow

1. **Fork** the repository on GitHub
2. **Clone** your fork locally
3. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feature/my-change
   ```
4. **Make your changes** — keep commits focused and atomic
5. **Run checks** before pushing:
   ```bash
   ./scripts/check-code.sh --all
   ```
6. **Push** to your fork and open a pull request

### Commit Messages

Use clear, descriptive commit messages. We follow a conventional style:

```
Add new arcade game interceptor with entity tracking

Monitors RAM addresses for player position, entity locations,
and level state. Emits events for entity spawns, collisions,
and level completion.
```

- Start with a verb (Add, Fix, Update, Remove, Refactor)
- First line under 72 characters
- Add detail in the body when the "why" isn't obvious

### General Code Standards

- Comments explain **why**, not what
- No unnecessary abstractions — three similar lines beats a premature helper function
- Keep functions small and focused
- Update documentation for significant changes

### AI-Assisted Contributions

This project was developed with the help of [Claude Code](https://claude.ai/claude-code). Contributions that use generative AI tools (Claude, Copilot, ChatGPT, etc.) are welcome — provided you understand the code you're submitting and have reviewed it for correctness and quality. AI-generated code that the contributor can't explain or defend in review will be sent back.

## Submitting a Pull Request

1. Ensure all checks pass: `./scripts/check-code.sh --all`
2. Push your branch and create a pull request on GitHub
3. Fill in the [pull request template](.github/PULL_REQUEST_TEMPLATE.md)
4. Wait for CI to pass and a maintainer to review

Changelogs are maintained by the project maintainer at release time.

### What to Expect

- **Initial response**: 3-5 business days
- **Full review**: 7-14 days depending on complexity
- **Small fixes**: May be reviewed within 24-48 hours

Maintainers may request changes - this is normal and collaborative. See [MAINTAINERS.md](MAINTAINERS.md) for review criteria and project governance.

## Reporting Bugs

Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md) when opening an issue. Include:

- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Your environment (OS, Hub version, firmware version, ESP32 board, MAME version)
- Relevant logs or screenshots

## Requesting Features

Use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.md). Describe:

- The problem your feature would solve
- Your proposed solution
- Which component it affects (Hub, Driver, Interceptor)
- Any alternatives you've considered

### Features That Are Typically Welcomed

- New game interceptors
- New LED effects
- Performance improvements
- Documentation improvements
- Bug fixes

### Features That Need Discussion First

- New hardware platform support
- Major UI changes
- Breaking API changes
- New dependencies

## Security

Found a security vulnerability? Please report it privately - see [SECURITY.md](SECURITY.md).

---

Thank you for contributing to RGFX!
