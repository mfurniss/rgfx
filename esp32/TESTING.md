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
