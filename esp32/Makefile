# RGFX ESP32 Driver - Development Commands
# Provides convenient shortcuts for formatting, linting, and testing

.PHONY: help format format-check lint test test-native compile clean check-tools all ci

# Tool detection
CLANG_FORMAT := $(shell command -v clang-format 2> /dev/null)

# Default target - show help
help:
	@echo "RGFX ESP32 Driver - Available Commands:"
	@echo ""
	@echo "  make all           - Run everything: format, lint, test, compile"
	@echo "  make ci            - CI pipeline: format-check, lint, test, compile"
	@echo "  make format        - Format all C++ source files with clang-format"
	@echo "  make format-check  - Check formatting without modifying files"
	@echo "  make lint          - Run clang-tidy static analysis"
	@echo "  make test          - Run all unit tests (native)"
	@echo "  make test-native   - Run unit tests on host machine (fast)"
	@echo "  make compile       - Compile firmware for ESP32"
	@echo "  make clean         - Clean build artifacts"
	@echo "  make check-tools   - Verify required tools are installed"
	@echo ""
	@echo "Setup Instructions:"
	@echo "  brew install clang-format   # Install clang-format for code formatting"
	@echo ""

# Check for required tools
check-tools:
	@echo "Checking for required tools..."
	@command -v clang-format >/dev/null 2>&1 || { echo "❌ clang-format not found. Install with: brew install clang-format"; exit 1; }
	@command -v pio >/dev/null 2>&1 || { echo "❌ PlatformIO CLI not found. Install from: https://platformio.org/"; exit 1; }
	@echo "✅ All required tools are installed!"

# Format all C++ source files
format:
ifndef CLANG_FORMAT
	@echo "❌ clang-format not found. Install with: brew install clang-format"
	@exit 1
endif
	@echo "Formatting C++ files with clang-format..."
	@find src -name "*.cpp" -o -name "*.h" | xargs clang-format -i
	@find test -name "*.cpp" -o -name "*.h" | xargs clang-format -i
	@echo "✅ Done!"

# Check formatting without modifying files
format-check:
ifndef CLANG_FORMAT
	@echo "❌ clang-format not found. Install with: brew install clang-format"
	@exit 1
endif
	@echo "Checking C++ formatting..."
	@find src -name "*.cpp" -o -name "*.h" | xargs clang-format --dry-run -Werror
	@find test -name "*.cpp" -o -name "*.h" | xargs clang-format --dry-run -Werror
	@echo "✅ All files are properly formatted!"

# Run static analysis with clang-tidy
lint:
	@echo "Running clang-tidy static analysis..."
	@pio check --verbose
	@echo "Linting complete!"

# Run unit tests on native platform (fast)
test-native:
	@echo "Running unit tests on native platform..."
	@pio test -e native
	@echo "Tests complete!"

# Alias for test-native
test: test-native

# Compile firmware for ESP32
compile:
	@echo "Compiling firmware for ESP32..."
	@pio run --project-dir /Users/matt/Workspace/rgfx/esp32
	@echo "Compilation complete!"

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	@pio run -t clean
	@echo "Clean complete!"

# Run everything: format, lint, test, compile
all: format lint test compile
	@echo ""
	@echo "✅ All checks passed!"

# CI pipeline: format-check (no modifications), lint, test, compile
ci: format-check lint test compile
	@echo ""
	@echo "✅ CI pipeline completed successfully!"
