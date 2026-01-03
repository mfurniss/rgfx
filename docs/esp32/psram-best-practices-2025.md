# ESP32-S3 PSRAM Best Practices for 2025

**Source:** ESP-IDF v5.5+ Official Documentation
**Fetched:** 2026-01-02
**Target Platform:** ESP32-S3 (up to 8MB PSRAM)

---

## Table of Contents

1. [Overview](#overview)
2. [Runtime Detection](#runtime-detection)
3. [Memory Allocation APIs](#memory-allocation-apis)
4. [Performance Characteristics](#performance-characteristics)
5. [Best Practices for Real-Time Graphics](#best-practices-for-real-time-graphics)
6. [Memory Monitoring](#memory-monitoring)
7. [Code Examples](#code-examples)

---

## Overview

The ESP32-S3 provides up to 32 MB of virtual addresses for external PSRAM (pseudo-static RAM), significantly expanding beyond the chip's limited internal RAM (few hundred KB). However, PSRAM integration requires careful consideration for real-time applications like LED graphics.

### Key Memory Types

- **DRAM**: Data RAM connected to CPU data bus (general purpose)
- **IRAM**: Instruction RAM connected to CPU instruction bus (executable code)
- **D/IRAM**: Dual-use RAM accessible via both buses
- **PSRAM/SPIRAM**: External SPI RAM accessed through cache system

---

## Runtime Detection

### Method 1: Check Available PSRAM Heap

The most reliable runtime detection method:

```cpp
#include <esp_heap_caps.h>

bool isPsramAvailable() {
    return heap_caps_get_free_size(MALLOC_CAP_SPIRAM) > 0;
}

void printMemoryInfo() {
    size_t psram_total = heap_caps_get_total_size(MALLOC_CAP_SPIRAM);
    size_t psram_free = heap_caps_get_free_size(MALLOC_CAP_SPIRAM);
    size_t internal_free = heap_caps_get_free_size(MALLOC_CAP_INTERNAL);

    Serial.printf("PSRAM Total: %u bytes\n", psram_total);
    Serial.printf("PSRAM Free: %u bytes\n", psram_free);
    Serial.printf("Internal RAM Free: %u bytes\n", internal_free);
}
```

### Method 2: Configuration Check

```cpp
#ifdef CONFIG_SPIRAM
    // PSRAM is configured in build
    if (heap_caps_get_free_size(MALLOC_CAP_SPIRAM) > 0) {
        // PSRAM is actually available at runtime
    }
#endif
```

---

## Memory Allocation APIs

### heap_caps_malloc() - Capability-Based Allocation

The primary API for explicit PSRAM allocation:

```cpp
#include <esp_heap_caps.h>

// Allocate from PSRAM only
void* psram_buffer = heap_caps_malloc(size, MALLOC_CAP_SPIRAM);

// Allocate DMA-capable internal memory (excludes PSRAM)
void* dma_buffer = heap_caps_malloc(size, MALLOC_CAP_DMA);

// Allocate 32-bit aligned memory
void* aligned_buffer = heap_caps_malloc(size, MALLOC_CAP_32BIT);

// Allocate DMA-capable PSRAM (ESP32-S3 only with EDMA)
void* psram_dma = heap_caps_malloc(size, MALLOC_CAP_SPIRAM | MALLOC_CAP_DMA);

// Always check for allocation failure
if (buffer == nullptr) {
    Serial.println("Allocation failed!");
}

// Free with standard API
heap_caps_free(buffer);
```

### Memory Capability Flags

Common capability flags (can be OR-combined):

| Flag | Purpose | Notes |
|------|---------|-------|
| `MALLOC_CAP_SPIRAM` | External PSRAM | Slower than internal RAM |
| `MALLOC_CAP_INTERNAL` | Internal RAM only | Excludes PSRAM |
| `MALLOC_CAP_DMA` | Hardware DMA compatible | Usually excludes PSRAM (except ESP32-S3 EDMA) |
| `MALLOC_CAP_8BIT` | Single-byte accessible | General purpose |
| `MALLOC_CAP_32BIT` | 32-bit aligned access | **ONLY** 32-bit access allowed |
| `MALLOC_CAP_DEFAULT` | Default malloc() capability | Byte-addressable memory |

### ps_malloc() and ps_calloc()

Convenience wrappers for PSRAM allocation (Arduino-ESP32):

```cpp
// Allocate from PSRAM (uninitialized)
void* buffer = ps_malloc(size);

// Allocate from PSRAM (zero-initialized)
void* buffer = ps_calloc(count, size);

// Free with standard API
free(buffer);
```

**Note:** These are convenience macros that call `heap_caps_malloc(size, MALLOC_CAP_SPIRAM)` internally.

### Standard malloc() Behavior

Behavior depends on `CONFIG_SPIRAM_USE` setting:

- **CONFIG_SPIRAM_USE_CAPS_ALLOC**: `malloc()` uses internal RAM only; must use `heap_caps_malloc()` for PSRAM
- **CONFIG_SPIRAM_USE_MALLOC** (default): `malloc()` can allocate from PSRAM based on size thresholds
- **CONFIG_SPIRAM_MALLOC_ALWAYSINTERNAL**: Small allocations prefer internal RAM
- **CONFIG_SPIRAM_MALLOC_RESERVE_INTERNAL**: Reserves internal RAM for DMA buffers

---

## Performance Characteristics

### Access Speed Comparison

| Memory Type | Typical Access Speed | Cache Benefit |
|-------------|---------------------|---------------|
| Internal IRAM/DRAM | ~40-80 MHz CPU speed | Direct access |
| PSRAM (Octal, 80 MHz) | ~40 MB/s read | Cache-dependent |
| PSRAM (Quad, 40 MHz) | ~10-20 MB/s read | Cache-dependent |
| Flash (XiP) | ~5-15 MB/s read | Cache-dependent |

### Critical Limitations for Real-Time Applications

1. **Cache Dependency**
   - PSRAM access goes through CPU cache system
   - When flash cache is disabled (e.g., during flash writes), PSRAM becomes inaccessible
   - Large data chunks (&gt;32 KB) exceed cache capacity, reducing to raw PSRAM speed

2. **Concurrent Core Access**
   - ESP32-S3 has dual cores sharing memory bus
   - Simultaneous PSRAM access from both cores reduces bandwidth
   - Critical for LED graphics with parallel processing

3. **DMA Constraints**
   - DMA transaction descriptors **cannot** reside in PSRAM (ESP32, ESP32-S2)
   - ESP32-S3 EDMA allows DMA buffers in PSRAM with alignment constraints
   - Use `MALLOC_CAP_SPIRAM | MALLOC_CAP_DMA` for ESP32-S3 DMA buffers

4. **Task Stack Limitations**
   - PSRAM unsuitable for task stacks without `CONFIG_FREERTOS_TASK_CREATE_ALLOW_EXT_MEM`
   - Stack access during cache-disabled periods causes crashes

---

## Best Practices for Real-Time Graphics

### Memory Allocation Strategy for LED Graphics

```cpp
class MemoryManager {
public:
    static void* allocateFramebuffer(size_t size) {
        // Large framebuffers go to PSRAM if available
        if (heap_caps_get_free_size(MALLOC_CAP_SPIRAM) > size) {
            void* buffer = heap_caps_malloc(size, MALLOC_CAP_SPIRAM);
            if (buffer) {
                Serial.println("Allocated framebuffer in PSRAM");
                return buffer;
            }
        }
        // Fallback to internal RAM
        Serial.println("Allocated framebuffer in internal RAM");
        return heap_caps_malloc(size, MALLOC_CAP_INTERNAL);
    }

    static void* allocateDmaBuffer(size_t size) {
        // DMA buffers MUST be in internal RAM (ESP32/ESP32-S2)
        // or DMA-capable PSRAM (ESP32-S3)
        #if CONFIG_IDF_TARGET_ESP32S3
            // ESP32-S3 EDMA supports PSRAM DMA
            void* buffer = heap_caps_malloc(size, MALLOC_CAP_DMA);
        #else
            // Other chips: DMA excludes PSRAM
            void* buffer = heap_caps_malloc(size, MALLOC_CAP_DMA | MALLOC_CAP_INTERNAL);
        #endif

        if (!buffer) {
            Serial.println("DMA buffer allocation failed!");
        }
        return buffer;
    }

    static void* allocateWorkBuffer(size_t size) {
        // Small work buffers in internal RAM for speed
        if (size < 4096) {
            void* buffer = heap_caps_malloc(size, MALLOC_CAP_INTERNAL);
            if (buffer) return buffer;
        }
        // Large work buffers can go to PSRAM
        return heap_caps_malloc(size, MALLOC_CAP_SPIRAM);
    }
};
```

### Recommended Allocation Strategy

| Buffer Type | Size | Location | Reason |
|-------------|------|----------|--------|
| Framebuffer (RGB888) | 256x256x3 = 192KB | PSRAM | Large, sequential access cached well |
| Framebuffer (RGB565) | 256x256x2 = 128KB | PSRAM | Large, sequential access cached well |
| LED output buffer | &lt;64KB | Internal RAM | DMA constraint, real-time critical |
| Effect scratch buffer | &gt;32KB | PSRAM | Temporary calculations, not latency-sensitive |
| Palette/LUT | &lt;4KB | Internal RAM | Frequent random access |
| Animation state | &lt;1KB | Internal RAM | Frequent updates |
| GIF/image assets | &gt;100KB | PSRAM | Large sequential reads |

### Hybrid Allocation Example

```cpp
class RgfxMemoryManager {
private:
    uint8_t* framebuffer_psram;      // Large framebuffer in PSRAM
    uint8_t* led_output_internal;    // DMA buffer in internal RAM
    uint8_t* palette_internal;       // Lookup table in internal RAM

public:
    bool initialize(uint16_t width, uint16_t height) {
        size_t fb_size = width * height * 3; // RGB888
        size_t led_size = 512 * 3;           // 512 LEDs, RGB

        // Framebuffer in PSRAM
        framebuffer_psram = (uint8_t*)heap_caps_malloc(
            fb_size, MALLOC_CAP_SPIRAM
        );

        // LED output in internal RAM (DMA-capable)
        led_output_internal = (uint8_t*)heap_caps_malloc(
            led_size, MALLOC_CAP_DMA | MALLOC_CAP_INTERNAL
        );

        // Palette in internal RAM (fast random access)
        palette_internal = (uint8_t*)heap_caps_malloc(
            256 * 3, MALLOC_CAP_INTERNAL
        );

        if (!framebuffer_psram || !led_output_internal || !palette_internal) {
            cleanup();
            return false;
        }

        return true;
    }

    void cleanup() {
        heap_caps_free(framebuffer_psram);
        heap_caps_free(led_output_internal);
        heap_caps_free(palette_internal);
    }
};
```

---

## Memory Monitoring

### Comprehensive Memory Diagnostics

```cpp
#include <esp_heap_caps.h>

class HeapMonitor {
public:
    struct MemoryStats {
        size_t total;
        size_t free;
        size_t largest_block;
        size_t min_free;  // Low watermark

        float fragmentation() const {
            if (free == 0) return 0.0f;
            return 100.0f * (1.0f - (float)largest_block / (float)free);
        }
    };

    static MemoryStats getInternalStats() {
        return getStats(MALLOC_CAP_INTERNAL);
    }

    static MemoryStats getPsramStats() {
        return getStats(MALLOC_CAP_SPIRAM);
    }

    static MemoryStats getDmaStats() {
        return getStats(MALLOC_CAP_DMA);
    }

    static void printAllStats() {
        Serial.println("=== Memory Statistics ===");

        printRegionStats("Internal RAM", MALLOC_CAP_INTERNAL);
        printRegionStats("PSRAM", MALLOC_CAP_SPIRAM);
        printRegionStats("DMA Capable", MALLOC_CAP_DMA);

        Serial.println("========================");
    }

private:
    static MemoryStats getStats(uint32_t caps) {
        MemoryStats stats;
        stats.total = heap_caps_get_total_size(caps);
        stats.free = heap_caps_get_free_size(caps);
        stats.largest_block = heap_caps_get_largest_free_block(caps);
        stats.min_free = heap_caps_get_minimum_free_size(caps);
        return stats;
    }

    static void printRegionStats(const char* name, uint32_t caps) {
        MemoryStats stats = getStats(caps);

        if (stats.total == 0) {
            Serial.printf("%s: Not available\n", name);
            return;
        }

        Serial.printf("%s:\n", name);
        Serial.printf("  Total: %u bytes\n", stats.total);
        Serial.printf("  Free: %u bytes (%.1f%%)\n",
                     stats.free, 100.0f * stats.free / stats.total);
        Serial.printf("  Largest block: %u bytes\n", stats.largest_block);
        Serial.printf("  Low watermark: %u bytes\n", stats.min_free);
        Serial.printf("  Fragmentation: %.1f%%\n", stats.fragmentation());
    }
};
```

### Fragmentation Detection

Heap fragmentation occurs when free memory becomes scattered. Detect it by comparing largest free block to total free memory:

```cpp
void checkFragmentation() {
    auto internal = HeapMonitor::getInternalStats();
    auto psram = HeapMonitor::getPsramStats();

    if (internal.fragmentation() > 25.0f) {
        Serial.printf("WARNING: Internal RAM fragmentation: %.1f%%\n",
                     internal.fragmentation());
    }

    if (psram.fragmentation() > 25.0f) {
        Serial.printf("WARNING: PSRAM fragmentation: %.1f%%\n",
                     psram.fragmentation());
    }
}
```

### Periodic Monitoring

```cpp
void setup() {
    // Print initial memory state
    HeapMonitor::printAllStats();

    // Schedule periodic monitoring
    static uint32_t lastCheck = 0;
    if (millis() - lastCheck > 60000) {  // Every 60 seconds
        checkFragmentation();
        lastCheck = millis();
    }
}
```

---

## Code Examples

### Example 1: Smart Allocation with Fallback

```cpp
void* smartAlloc(size_t size, bool prefer_psram = true) {
    void* ptr = nullptr;

    if (prefer_psram) {
        // Try PSRAM first
        ptr = heap_caps_malloc(size, MALLOC_CAP_SPIRAM);
        if (ptr) {
            Serial.printf("Allocated %u bytes in PSRAM\n", size);
            return ptr;
        }
        Serial.printf("PSRAM allocation failed, trying internal RAM\n");
    }

    // Fallback to internal RAM
    ptr = heap_caps_malloc(size, MALLOC_CAP_INTERNAL);
    if (ptr) {
        Serial.printf("Allocated %u bytes in internal RAM\n", size);
    } else {
        Serial.printf("Allocation failed completely!\n");
    }

    return ptr;
}
```

### Example 2: Buffer Pool with Mixed Allocation

```cpp
template<size_t BUFFER_SIZE, size_t POOL_SIZE>
class BufferPool {
private:
    uint8_t* buffers[POOL_SIZE];
    bool used[POOL_SIZE];
    uint32_t caps;

public:
    BufferPool(uint32_t capability_flags) : caps(capability_flags) {
        for (size_t i = 0; i < POOL_SIZE; i++) {
            buffers[i] = (uint8_t*)heap_caps_malloc(BUFFER_SIZE, caps);
            used[i] = false;

            if (!buffers[i]) {
                Serial.printf("Failed to allocate buffer %u\n", i);
            }
        }
    }

    ~BufferPool() {
        for (size_t i = 0; i < POOL_SIZE; i++) {
            heap_caps_free(buffers[i]);
        }
    }

    uint8_t* acquire() {
        for (size_t i = 0; i < POOL_SIZE; i++) {
            if (!used[i] && buffers[i]) {
                used[i] = true;
                return buffers[i];
            }
        }
        return nullptr;
    }

    void release(uint8_t* buffer) {
        for (size_t i = 0; i < POOL_SIZE; i++) {
            if (buffers[i] == buffer) {
                used[i] = false;
                return;
            }
        }
    }
};

// Usage
BufferPool<65536, 4> psram_pool(MALLOC_CAP_SPIRAM);    // 4x64KB in PSRAM
BufferPool<4096, 8> internal_pool(MALLOC_CAP_INTERNAL); // 8x4KB in internal
```

### Example 3: Detecting and Handling Low Memory

```cpp
class MemoryGuard {
private:
    static constexpr size_t MIN_INTERNAL_FREE = 32768;  // 32KB reserve
    static constexpr size_t MIN_PSRAM_FREE = 131072;    // 128KB reserve

public:
    static bool canAllocateInternal(size_t size) {
        size_t free = heap_caps_get_free_size(MALLOC_CAP_INTERNAL);
        return free > (size + MIN_INTERNAL_FREE);
    }

    static bool canAllocatePsram(size_t size) {
        size_t free = heap_caps_get_free_size(MALLOC_CAP_SPIRAM);
        return free > (size + MIN_PSRAM_FREE);
    }

    static bool isMemoryLow() {
        return !canAllocateInternal(0) || !canAllocatePsram(0);
    }

    static void* safeAlloc(size_t size, uint32_t caps) {
        if (caps & MALLOC_CAP_INTERNAL) {
            if (!canAllocateInternal(size)) {
                Serial.println("Insufficient internal RAM!");
                return nullptr;
            }
        }

        if (caps & MALLOC_CAP_SPIRAM) {
            if (!canAllocatePsram(size)) {
                Serial.println("Insufficient PSRAM!");
                return nullptr;
            }
        }

        return heap_caps_malloc(size, caps);
    }
};
```

### Example 4: Complete Initialization Sequence

```cpp
void setup() {
    Serial.begin(115200);
    delay(1000);

    Serial.println("=== RGFX Driver Initialization ===");

    // 1. Check PSRAM availability
    bool has_psram = heap_caps_get_free_size(MALLOC_CAP_SPIRAM) > 0;
    Serial.printf("PSRAM Available: %s\n", has_psram ? "YES" : "NO");

    if (!has_psram) {
        Serial.println("WARNING: No PSRAM detected. Limited memory available.");
    }

    // 2. Print initial memory state
    HeapMonitor::printAllStats();

    // 3. Allocate framebuffer (prefer PSRAM for large buffers)
    size_t fb_size = 256 * 256 * 3;  // RGB888
    uint8_t* framebuffer = (uint8_t*)smartAlloc(fb_size, true);

    if (!framebuffer) {
        Serial.println("FATAL: Cannot allocate framebuffer!");
        return;
    }

    // 4. Allocate DMA buffer (must be internal RAM)
    size_t dma_size = 512 * 3;  // 512 RGB LEDs
    uint8_t* led_buffer = (uint8_t*)heap_caps_malloc(
        dma_size, MALLOC_CAP_DMA | MALLOC_CAP_INTERNAL
    );

    if (!led_buffer) {
        Serial.println("FATAL: Cannot allocate LED DMA buffer!");
        heap_caps_free(framebuffer);
        return;
    }

    // 5. Verify allocations
    Serial.println("\n=== After Allocation ===");
    HeapMonitor::printAllStats();

    Serial.println("\nInitialization complete!");
}
```

---

## Configuration Recommendations

### PlatformIO Configuration for PSRAM

Add to `platformio.ini` for ESP32-S3 with PSRAM:

```ini
[env:rgfx-driver]
platform = espressif32
board = esp32-s3-devkitc-1
framework = arduino

build_flags =
    -DBOARD_HAS_PSRAM
    -DCONFIG_SPIRAM_USE_MALLOC=1
    -DCONFIG_SPIRAM_MALLOC_ALWAYSINTERNAL=16384  ; <16KB uses internal RAM

board_build.arduino.memory_type = qio_opi      ; Octal PSRAM (faster)
board_build.partitions = huge_app.csv          ; More app space if needed
```

### menuconfig Settings (ESP-IDF)

For native ESP-IDF projects:

```
Component config → ESP32S3-Specific
  → Support for external, SPI-connected RAM: [✓]
  → SPI RAM config
    → Initialize SPI RAM during startup: [✓]
    → SPI RAM access method: (Integrate RAM into memory map)
    → Malloc() strategy: (Make RAM allocatable using heap_caps_malloc(..., MALLOC_CAP_SPIRAM))
    → Always try to allocate internal memory first, only if this fails allocate PSRAM: 16384
```

---

## Summary

### Quick Decision Matrix

**Use PSRAM for:**
- Large framebuffers (&gt;64KB)
- GIF/image asset storage
- Effect scratch buffers
- Non-latency-critical data structures

**Use Internal RAM for:**
- DMA buffers (ESP32/ESP32-S2) or use EDMA flags (ESP32-S3)
- Task stacks
- ISR buffers
- Lookup tables with random access
- Small, frequently-accessed structures (&lt;4KB)
- Real-time critical data

**Monitor:**
- Fragmentation levels (warn at &gt;25%)
- Low watermarks (minimum free since boot)
- Largest free block vs total free

**Avoid:**
- Storing DMA descriptors in PSRAM
- Allocating task stacks in PSRAM without explicit config
- Assuming PSRAM is always available (check at runtime)
- Mixing cache-disabled operations with PSRAM access

---

## References

- [ESP-IDF Heap Memory Allocation](https://docs.espressif.com/projects/esp-idf/en/latest/esp32s3/api-reference/system/mem_alloc.html)
- [ESP-IDF External RAM Support](https://docs.espressif.com/projects/esp-idf/en/latest/esp32s3/api-guides/external-ram.html)
- [ESP-IDF Heap Debugging](https://docs.espressif.com/projects/esp-idf/en/latest/esp32s3/api-reference/system/heap_debug.html)
- [ESP32 Forum: PSRAM Usage Discussions](https://www.esp32.com/)
