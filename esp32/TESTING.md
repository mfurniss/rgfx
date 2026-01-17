# ESP32 Driver - Testing, Linting, and Formatting

This document describes the code quality tools and testing setup for the RGFX ESP32 Driver.

## Quick Start

```bash
# Install required tools (macOS)
brew install clang-format

# Run all tests
make test

# Format code
make format

# Run linting
make lint

# Compile firmware
make compile
```

## Available Commands

Run `make help` to see all available commands:

```bash
make format        # Format all C++ source files with clang-format
make format-check  # Check formatting without modifying files
make lint          # Run clang-tidy static analysis
make test          # Run all unit tests (native)
make test-native   # Run unit tests on host machine (fast)
make compile       # Compile firmware for ESP32
make clean         # Clean build artifacts
make check-tools   # Verify required tools are installed
```

## Code Formatting (clang-format)

### Configuration

Code formatting is configured in [.clang-format](./.clang-format) using LLVM style with customizations for embedded C++:

- **Style**: LLVM-based
- **Standard**: C++11
- **Indentation**: 4 spaces
- **Column Limit**: 100 characters
- **Pointer Alignment**: Left (`int* ptr`)
- **Braces**: Attach style

### Usage

Format all source files:
```bash
make format
```

Check if files are properly formatted (CI-friendly):
```bash
make format-check
```

Format specific files manually:
```bash
clang-format -i src/utils.cpp src/utils.h
```

### Installation

```bash
# macOS
brew install clang-format

# Linux
sudo apt-get install clang-format

# Windows (via LLVM)
# Download from: https://releases.llvm.org/
```

## Static Analysis (clang-tidy)

### Configuration

Static analysis is configured in [.clang-tidy](./.clang-tidy) with embedded-friendly checks:

**Enabled Check Groups:**
- `bugprone-*` - Common programming errors
- `performance-*` - Performance optimizations
- `readability-*` - Code clarity and maintainability
- `modernize-*` - Modern C++ patterns
- `cppcoreguidelines-*` - C++ Core Guidelines

**Disabled Checks:**
- Magic numbers (common in embedded: pin numbers, delays, etc.)
- C-array warnings (standard in Arduino/ESP32)
- Global variable warnings (common pattern in embedded)
- Various bounds checks (too restrictive for embedded)

### Usage

Run static analysis:
```bash
make lint
```

Or using PlatformIO directly:
```bash
pio check --verbose
```

### Notes

- clang-tidy runs automatically via PlatformIO's `pio check` command
- Configuration is in `.clang-tidy` file
- Only project code is analyzed (libraries are excluded via `check_skip_packages`)

## Unit Testing (Unity Framework)

### Overview

Unit tests use the **Unity** testing framework built into PlatformIO. Tests run on the native platform (host machine) for fast iteration without requiring hardware.

### Test Structure

Tests are organized following PlatformIO best practices:

```
test/
├── test_utils/              # Utils class tests
│   └── test_utils.cpp       # Test cases for getDeviceId(), getDeviceName()
└── test_<module>/           # Additional test modules (add as needed)
    └── test_<module>.cpp
```

Each `test_*` directory is a separate test application, run independently by PlatformIO.

### Running Tests

Run all tests on native platform (fast, no hardware needed):
```bash
make test
```

Or using PlatformIO directly:
```bash
pio test -e native
```

Run with verbose output:
```bash
pio test -e native -vvv
```

### Writing Tests

Create a new test module:

1. Create directory: `test/test_<module>/`
2. Create test file: `test/test_<module>/test_<module>.cpp`
3. Follow this structure:

```cpp
#include <unity.h>

// Mock dependencies for native testing if needed
#ifdef UNIT_TEST
// Mock Arduino classes/functions here
#else
#include <Arduino.h>
#endif

// Include code under test
#include "your_module.h"

// Test setup/teardown
void setUp(void) {
    // Called before each test
}

void tearDown(void) {
    // Called after each test
}

// Test cases
void test_something_works(void) {
    TEST_ASSERT_EQUAL(42, yourFunction());
}

void test_another_thing(void) {
    TEST_ASSERT_TRUE(someCondition());
}

// Main test runner
int main(int argc, char** argv) {
    UNITY_BEGIN();
    RUN_TEST(test_something_works);
    RUN_TEST(test_another_thing);
    return UNITY_END();
}
```

### Testing Principles

Following [CLAUDE.md guidelines](../../.claude/CLAUDE.md#testing-standards):

✅ **DO:**
- Test real behavior and functionality
- Use realistic, dynamic test data
- Test edge cases and error conditions
- Verify state changes and side effects
- Keep tests independent

❌ **DON'T:**
- Write shallow tests just for coverage
- Test static, trivial data structures
- Skip tests or use hacks to make them pass
- Modify application code just to make tests pass
- Use test-driven development (TDD) - tests follow implementation

### Unity Assertions

Common Unity assertion macros:

```cpp
// Equality
TEST_ASSERT_EQUAL(expected, actual)
TEST_ASSERT_EQUAL_STRING(expected, actual)

// Boolean
TEST_ASSERT_TRUE(condition)
TEST_ASSERT_FALSE(condition)

// Null checks
TEST_ASSERT_NULL(pointer)
TEST_ASSERT_NOT_NULL(pointer)

// Numeric comparisons
TEST_ASSERT_GREATER_THAN(threshold, actual)
TEST_ASSERT_LESS_THAN(threshold, actual)

// Messages (custom failure message)
TEST_ASSERT_TRUE_MESSAGE(condition, "Custom message")
```

See [Unity documentation](https://github.com/ThrowTheSwitch/Unity) for full list.

## Pixel Digest Tests (Snapshot Testing)

Digest tests validate the exact pixel output of effects through the full rendering pipeline using FNV-1a 64-bit hashes. This catches unintended rendering changes.

### Test Structure

Digest tests follow this pattern:

```cpp
#include "helpers/pixel_digest.h"

void test_effect_digest() {
    hal::test::setTime(0);
    hal::test::seedRandom(12345);      // Deterministic RNG
    initTestGammaLUT();                // Identity gamma for reproducibility

    Matrix matrix(16, 16);
    Canvas canvas(matrix);
    MyEffect effect(matrix, canvas);

    // Configure and run effect
    JsonDocument props;
    props["color"] = "#FF0000";
    effect.add(props);
    effect.update(0.0f);
    canvas.clear();
    effect.render();
    downsampleToMatrix(canvas, &matrix);

    // Assert digest matches expected value
    uint64_t digest = computeFrameDigest(matrix);
    assertDigest(0x3F06C5B3B369A725ull, digest, "effect_16x16_t0");
}
```

### Regenerating Digests

When intentionally changing effect rendering behavior, regenerate digest values:

```bash
make test-generate-digests
```

This outputs new digest values to copy into your test assertions:

```
DIGEST: pulse_16x16_t0_none = 0x3F06C5B3B369A725ull
DIGEST: pulse_16x16_t400_horizontal = 0xF71F1460E87F54C5ull
...
```

### Test Configurations

Effects are tested on three display configurations:

| Config | Size | Use Case |
|--------|------|----------|
| strip_300 | 300×1 | LED strip (1D) |
| matrix_16x16 | 16×16 | Square matrix |
| matrix_96x8 | 96×8 | Wide panel |

### Property-Based Tests

In addition to exact digest matching, use property-based tests for behavioral invariants:

```cpp
void test_pulse_property_fades_to_black() {
    // Setup effect...
    effect.update(1.2f);  // Past duration
    downsampleToMatrix(canvas, &matrix);

    FrameProperties fp = analyzeFrame(matrix);
    TEST_ASSERT_EQUAL_MESSAGE(0, fp.nonBlackPixels,
        "Pulse should be black after duration expires");
}
```

Property tests remain stable when visual appearance changes but behavior stays correct.

### Helper Functions

From `test/helpers/pixel_digest.h`:

- `computeFrameDigest(matrix)` - FNV-1a 64-bit hash of LED buffer
- `assertDigest(expected, actual, label)` - Assert hash matches with clear error message
- `analyzeFrame(matrix)` - Returns `FrameProperties` (nonBlackPixels, boundingBox, brightness stats)
- `initTestGammaLUT()` - Sets gamma=1.0 for test reproducibility

## Code Coverage

### Quick Start

```bash
# Generate coverage report (text + JSON)
make coverage

# View JSON report (for programmatic analysis)
cat .pio/build/native-coverage/coverage/coverage.json

# Optionally generate HTML report
make coverage-html
open .pio/build/native-coverage/coverage/html/index.html
```

### Coverage Commands

```bash
make coverage          # Run tests with coverage (text + JSON reports)
make coverage-json     # Generate JSON report only
make coverage-html     # Generate HTML report for browsing
make coverage-clean    # Remove all coverage data
```

### Prerequisites

Coverage uses LLVM tools included with Xcode Command Line Tools:

```bash
# Verify tools are available
xcrun llvm-cov --version
xcrun llvm-profdata --version
```

### Excluded from Coverage

The following are excluded from coverage metrics:
- Test files (`test/` directory)
- Test HAL implementations (`hal/test/`)
- ESP32-specific HAL (`hal/esp32/`)
- PlatformIO libraries (`.pio/`)

### Notes

- Coverage runs use a separate PlatformIO environment (`native-coverage`)
- Uses Clang's `-fprofile-instr-generate -fcoverage-mapping` instrumentation
- AddressSanitizer is disabled in the coverage environment to prevent conflicts
- Each test binary is preserved to enable comprehensive coverage merging
- The "mismatched data" warning is expected due to different code paths per test
- JSON output is ideal for programmatic analysis; HTML is for human browsing

## CI/CD Integration

These tools are designed to integrate easily with CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Check formatting
  run: make format-check

- name: Run linting
  run: make lint

- name: Run tests
  run: make test

- name: Compile firmware
  run: make compile
```

## Troubleshooting

### clang-format not found

```bash
# Install on macOS
brew install clang-format

# Verify installation
which clang-format
clang-format --version
```

### Tests fail to build

- Check that you're using the `native` environment: `pio test -e native`
- Ensure Arduino dependencies are properly mocked for native testing
- Review test output with verbose flag: `pio test -e native -vvv`

### Linting reports too many issues

- Review `.clang-tidy` configuration
- Some checks may be too strict for embedded code
- Add specific suppressions with `// NOLINT` comments if justified

### PlatformIO not found

```bash
# Install PlatformIO Core
pip3 install platformio

# Or via Homebrew (macOS)
brew install platformio
```

## Project Structure

```
esp32/
├── .clang-format           # clang-format configuration
├── .clang-tidy             # clang-tidy configuration
├── Makefile                # Convenience commands
├── platformio.ini          # PlatformIO configuration
├── src/                    # Source code
│   ├── *.cpp
│   └── *.h
├── test/                   # Unit tests
│   └── test_*/             # Test modules (test_ prefix required)
└── tools/                  # Utility tools (i2c_scanner, etc.)
```

## Additional Resources

- [PlatformIO Unit Testing](https://docs.platformio.org/en/latest/advanced/unit-testing/)
- [Unity Testing Framework](https://github.com/ThrowTheSwitch/Unity)
- [clang-format Documentation](https://clang.llvm.org/docs/ClangFormat.html)
- [clang-tidy Documentation](https://clang.llvm.org/extra/clang-tidy/)
- [RGFX Project Guidelines](../../.claude/CLAUDE.md)
