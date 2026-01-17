# RGFX ESP32 Driver - Development Commands
# Provides convenient shortcuts for formatting, linting, and testing

.PHONY: help format format-check lint cppcheck test test-native test-generate-digests compile clean check-tools all ci \
        test-coverage coverage-report coverage-json coverage-html coverage coverage-clean

# Tool detection
CLANG_FORMAT := $(shell command -v clang-format 2> /dev/null)

# Default target - show help
help:
	@echo "RGFX ESP32 Driver - Available Commands:"
	@echo ""
	@echo "  make all           - Run everything: format, lint, test, compile"
	@echo "  make ci            - CI pipeline: format-check, lint, cppcheck, test, compile"
	@echo "  make format        - Format all C++ source files with clang-format"
	@echo "  make format-check  - Check formatting without modifying files"
	@echo "  make lint          - Run clang-tidy static analysis"
	@echo "  make cppcheck      - Run cppcheck static analysis"
	@echo "  make test          - Run all unit tests (native)"
	@echo "  make test-native   - Run unit tests on host machine (fast)"
	@echo "  make test-generate-digests - Generate new digest hashes for snapshot tests"
	@echo "  make compile       - Compile firmware for ESP32"
	@echo "  make clean         - Clean build artifacts"
	@echo "  make check-tools   - Verify required tools are installed"
	@echo ""
	@echo "Coverage Commands:"
	@echo "  make coverage        - Run tests with coverage (text + JSON reports)"
	@echo "  make coverage-json   - Generate JSON coverage report"
	@echo "  make coverage-html   - Generate HTML coverage report"
	@echo "  make coverage-clean  - Remove coverage data"
	@echo ""
	@echo "Setup Instructions:"
	@echo "  brew install clang-format   # Install clang-format for code formatting"
	@echo "  brew install cppcheck       # Install cppcheck for additional static analysis"
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

# Run cppcheck static analysis (complementary to clang-tidy)
cppcheck:
	@command -v cppcheck >/dev/null 2>&1 || { echo "❌ cppcheck not found. Install with: brew install cppcheck"; exit 1; }
	@echo "Running cppcheck static analysis..."
	@cppcheck --enable=warning,performance --error-exitcode=1 \
		--suppress=missingIncludeSystem \
		--suppress=unknownMacro \
		--suppress=ignoredReturnValue \
		--suppress=normalCheckLevelMaxBranches \
		-I include -I src src/
	@echo "✅ cppcheck passed!"

# Run unit tests on native platform (fast)
test-native:
	@echo "Running unit tests on native platform..."
	@pio test -e native
	@echo "Tests complete!"

# Alias for test-native
test: test-native

# Generate new digest hashes for snapshot tests
# Use when intentionally changing effect rendering behavior
# Note: PlatformIO filters stdout, so we use verbose mode and grep for DIGEST lines
test-generate-digests:
	@echo "Running tests with GENERATE_DIGESTS flag..."
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "DIGEST HASHES (copy to test assertions):"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@pio test -e native-generate-digests -vvv 2>&1 | grep "^DIGEST:" | sort -u || echo "  (no digest tests found - add tests with assertDigest)"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

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

# CI pipeline: format-check (no modifications), lint, cppcheck, test, compile
ci: format-check lint cppcheck test compile
	@echo ""
	@echo "✅ CI pipeline completed successfully!"

# ============================================================================
# Code Coverage (using LLVM instrumentation)
# Reference: https://alastairs-place.net/blog/2016/05/20/code-coverage-from-the-command-line-with-clang/
# ============================================================================

COVERAGE_DIR := .pio/build/native-coverage/coverage
PROFDATA := $(COVERAGE_DIR)/coverage.profdata

# Exclusion patterns for coverage reports
COVERAGE_EXCLUDE := \
    --ignore-filename-regex='.*test.*' \
    --ignore-filename-regex='.*\.pio.*' \
    --ignore-filename-regex='.*/hal/esp32/.*' \
    --ignore-filename-regex='.*/hal/test/.*'

# Run tests with coverage instrumentation, preserving binaries
test-coverage: coverage-clean
	@echo "Running tests with coverage instrumentation..."
	@mkdir -p $(COVERAGE_DIR)
	@mkdir -p $(COVERAGE_DIR)/binaries
	@for test_dir in test/test_*/; do \
		test_name=$$(basename $$test_dir); \
		echo ""; \
		echo "=== Testing $$test_name ==="; \
		LLVM_PROFILE_FILE="$(COVERAGE_DIR)/$$test_name.profraw" pio test -e native-coverage -f $$test_name && \
		cp .pio/build/native-coverage/program $(COVERAGE_DIR)/binaries/$$test_name 2>/dev/null || true; \
	done
	@echo ""
	@echo "Coverage data collected."

# Merge profraw files into profdata
$(PROFDATA): test-coverage
	@echo "Merging coverage data..."
	@xcrun llvm-profdata merge -sparse $(COVERAGE_DIR)/*.profraw -o $(PROFDATA)

# Build list of all preserved binaries for llvm-cov
BINARY_OBJECTS = $(shell find $(COVERAGE_DIR)/binaries -type f 2>/dev/null | sed 's/^/-object /')

# Generate text coverage report (summary)
coverage-report: $(PROFDATA)
	@echo "Generating coverage report..."
	@BINARIES=$$(find $(COVERAGE_DIR)/binaries -type f 2>/dev/null | head -1); \
	if [ -z "$$BINARIES" ]; then echo "Error: No test binaries found"; exit 1; fi; \
	OBJECTS=$$(find $(COVERAGE_DIR)/binaries -type f | sed 's/^/-object /' | tr '\n' ' '); \
	xcrun llvm-cov report \
		$$(find $(COVERAGE_DIR)/binaries -type f | head -1) \
		$$(find $(COVERAGE_DIR)/binaries -type f | tail -n +2 | sed 's/^/-object /') \
		-instr-profile=$(PROFDATA) \
		$(COVERAGE_EXCLUDE) \
		| tee $(COVERAGE_DIR)/coverage.txt
	@echo ""
	@echo "Coverage report saved to $(COVERAGE_DIR)/coverage.txt"

# Generate JSON coverage report (for programmatic analysis)
coverage-json: $(PROFDATA)
	@echo "Generating JSON coverage report..."
	@BINARIES=$$(find $(COVERAGE_DIR)/binaries -type f 2>/dev/null | head -1); \
	if [ -z "$$BINARIES" ]; then echo "Error: No test binaries found"; exit 1; fi; \
	xcrun llvm-cov export \
		$$(find $(COVERAGE_DIR)/binaries -type f | head -1) \
		$$(find $(COVERAGE_DIR)/binaries -type f | tail -n +2 | sed 's/^/-object /') \
		-instr-profile=$(PROFDATA) \
		$(COVERAGE_EXCLUDE) \
		> $(COVERAGE_DIR)/coverage.json
	@echo "JSON report: $(COVERAGE_DIR)/coverage.json"

# Generate HTML coverage report
coverage-html: $(PROFDATA)
	@echo "Generating HTML coverage report..."
	@BINARIES=$$(find $(COVERAGE_DIR)/binaries -type f 2>/dev/null | head -1); \
	if [ -z "$$BINARIES" ]; then echo "Error: No test binaries found"; exit 1; fi; \
	xcrun llvm-cov show \
		$$(find $(COVERAGE_DIR)/binaries -type f | head -1) \
		$$(find $(COVERAGE_DIR)/binaries -type f | tail -n +2 | sed 's/^/-object /') \
		-instr-profile=$(PROFDATA) \
		-format=html \
		-output-dir=$(COVERAGE_DIR)/html \
		$(COVERAGE_EXCLUDE) \
		-show-line-counts-or-regions \
		-show-instantiations=false
	@echo ""
	@echo "HTML report: $(COVERAGE_DIR)/html/index.html"
	@echo "Open with: open $(COVERAGE_DIR)/html/index.html"

# Run all coverage steps (text + JSON reports)
coverage: coverage-report coverage-json
	@echo ""
	@echo "=============================================="
	@echo "Coverage complete!"
	@echo "  Text report: $(COVERAGE_DIR)/coverage.txt"
	@echo "  JSON report: $(COVERAGE_DIR)/coverage.json"
	@echo "=============================================="

# Clean coverage artifacts
coverage-clean:
	@echo "Cleaning coverage data..."
	@rm -rf $(COVERAGE_DIR)
	@rm -rf .pio/build/native-coverage
	@find . -name "*.profraw" -delete 2>/dev/null || true
	@find . -name "*.profdata" -delete 2>/dev/null || true
