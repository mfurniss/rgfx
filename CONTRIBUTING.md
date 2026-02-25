# Contributing to RGFX

Thanks for your interest in contributing to RGFX! Whether it's a bug report, new game interceptor, LED effect, documentation improvement, or a code fix - all contributions are welcome.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Ways to Contribute](#ways-to-contribute)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Making Changes](#making-changes)
- [Code Standards](#code-standards)
- [Testing](#testing)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Reporting Bugs](#reporting-bugs)
- [Requesting Features](#requesting-features)

## Code of Conduct

This project follows the [Contributor Covenant v2.1](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Ways to Contribute

- **Bug reports** - Found something broken? [Open an issue](#reporting-bugs)
- **Game interceptors** - Add support for a new retro game
- **LED effects** - Create new visual effects for the ESP32 drivers
- **Code improvements** - Bug fixes, refactoring, performance
- **Documentation** - Fix typos, improve guides, add examples
- **Testing** - Write meaningful tests, improve coverage

## Development Setup

RGFX has three components: the **Hub** (Electron app), **ESP32 Driver** (firmware), and **MAME scripts** (Lua). You don't need all three to contribute - set up only what you need.

### Prerequisites

#### macOS

```bash
# Node.js 18+ (for Hub)
brew install node

# PlatformIO (for ESP32 firmware)
brew install platformio

# MAME 0.281+ (for game emulation)
brew install mame

# Lua tools (for Lua script linting)
brew install luacheck
brew install stylua
```

#### Windows

```powershell
# Node.js 18+ - download from https://nodejs.org or use winget:
winget install OpenJS.NodeJS.LTS

# PlatformIO - install via pip or the VSCode extension:
pip install platformio
# Or install the PlatformIO IDE extension in VSCode

# MAME 0.281+ - download from https://www.mamedev.org/release.html

# Lua tools (for Lua script linting)
# Install luacheck and stylua via LuaRocks or download binaries from GitHub
```

> **Windows note:** RGFX is primarily developed on macOS. The Hub and ESP32 firmware work cross-platform, but the MAME launch script (`scripts/launch-mame.sh`) is a bash script. On Windows, use **Git Bash**, **WSL**, or run MAME manually with the `-autoboot_script` flag pointing to `rgfx-hub/assets/mame/rgfx.lua`.

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

### ESP32 Firmware

```bash
cd esp32
pio run              # Compile firmware
pio run -t upload    # Flash via USB (requires connected ESP32)
pio test -e native   # Run unit tests
```

### MAME Integration

Launch MAME with RGFX game monitoring:

**macOS:**
```bash
./scripts/launch-mame.sh pacman
```

**Windows (Git Bash or WSL):**
```bash
./scripts/launch-mame.sh pacman
```

**Windows (manual):**
```powershell
mame pacman -rompath ~/mame-roms -window -autoboot_script path\to\rgfx-hub\assets\mame\rgfx.lua
```

### Running All Checks

Before submitting any changes, run the check script:

```bash
./scripts/check-code.sh --all
```

This runs TypeScript compilation, ESLint, unit tests, ESP32 build verification, and Lua linting - depending on which files you changed. The same checks run in CI.

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
4. **Make your changes** - keep commits focused and atomic
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

## Code Standards

### TypeScript (Hub)

- Zero TypeScript errors - strict mode, no `any` types
- Zero ESLint warnings - all warnings are treated as errors
- camelCase for variables and functions, PascalCase for types/interfaces/classes
- No unused exports
- Separation of concerns - keep modules focused

### C++ (ESP32 Firmware)

- Follow existing patterns in `esp32/src/`
- Use `.clang-format` for formatting
- Firmware must compile with `pio run`

### Lua (MAME Scripts)

- Must pass `luacheck` and `stylua` formatting
- Follow the interceptor pattern used in existing game scripts
- See `rgfx-hub/assets/interceptors/` for examples

### General

- Comments explain **why**, not what
- No unnecessary abstractions - three similar lines beats a premature helper function
- Keep functions small and focused
- Update documentation for significant changes

## Testing

### Hub Tests

```bash
cd rgfx-hub
npm test             # Run all tests
npm run typecheck    # TypeScript compilation check
npm run lint         # ESLint
```

### ESP32 Tests

```bash
cd esp32
pio test -e native   # Run unit tests
pio run              # Verify firmware compiles
```

### Testing Philosophy

- **Tests must be meaningful** - test real behavior, not mocks
- Don't write tests that only verify mock setup
- Quality over coverage - a few good integration tests beat many shallow unit tests
- If a test is difficult to write, that's often a signal the code needs restructuring

## Submitting a Pull Request

1. Ensure all checks pass: `./scripts/check-code.sh --all`
2. Update `CHANGELOG.md` under the `[Unreleased]` section
3. Push your branch and create a pull request on GitHub
4. Fill in the [pull request template](.github/PULL_REQUEST_TEMPLATE.md)
5. Wait for CI to pass and a maintainer to review

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
