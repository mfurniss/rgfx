cmake_minimum_required(VERSION 3.16)
project(led-sim LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Find raylib
find_package(raylib QUIET)
if(NOT raylib_FOUND)
    message(STATUS "raylib not found via find_package, trying pkg-config...")
    find_package(PkgConfig REQUIRED)
    pkg_check_modules(RAYLIB REQUIRED raylib)
endif()

# ESP32 source directory
set(ESP32_SRC_DIR "${CMAKE_SOURCE_DIR}/../../esp32/src")

# Source files from esp32/src that we need
set(ESP32_SOURCES
    # HAL native implementation (display defined locally to avoid raylib conflicts)
    ${ESP32_SRC_DIR}/hal/native/platform.cpp
    ${ESP32_SRC_DIR}/hal/native/log_stub.cpp
    ${ESP32_SRC_DIR}/hal/native/driver_config_stub.cpp

    # Graphics
    ${ESP32_SRC_DIR}/graphics/canvas.cpp
    ${ESP32_SRC_DIR}/graphics/coordinate_transforms.cpp
    ${ESP32_SRC_DIR}/graphics/downsample.cpp
    ${ESP32_SRC_DIR}/graphics/matrix.cpp

    # Effects
    ${ESP32_SRC_DIR}/effects/effect_processor.cpp
    ${ESP32_SRC_DIR}/effects/effect_utils.cpp
    ${ESP32_SRC_DIR}/effects/pulse.cpp
    ${ESP32_SRC_DIR}/effects/wipe.cpp
    ${ESP32_SRC_DIR}/effects/explode.cpp
    ${ESP32_SRC_DIR}/effects/bitmap.cpp
    ${ESP32_SRC_DIR}/effects/background.cpp
    ${ESP32_SRC_DIR}/effects/test_leds.cpp

    # Utils
    ${ESP32_SRC_DIR}/utils/easing_impl.cpp
)

# Simulator main
set(SIM_SOURCES
    src/main.cpp
)

# Create executable
add_executable(led-sim ${SIM_SOURCES} ${ESP32_SOURCES})

# Include directories - native HAL first so it overrides ESP32 headers
target_include_directories(led-sim PRIVATE
    ${ESP32_SRC_DIR}/hal/native
    ${ESP32_SRC_DIR}
    ${CMAKE_SOURCE_DIR}/../../esp32/.pio/libdeps/rgfx-driver/ArduinoJson/src
)

# Compile definitions
target_compile_definitions(led-sim PRIVATE
    NATIVE_BUILD=1
)

# Link raylib
if(raylib_FOUND)
    target_link_libraries(led-sim PRIVATE raylib)
else()
    target_include_directories(led-sim PRIVATE ${RAYLIB_INCLUDE_DIRS})
    target_link_libraries(led-sim PRIVATE ${RAYLIB_LIBRARIES})
    target_link_directories(led-sim PRIVATE ${RAYLIB_LIBRARY_DIRS})
endif()

# macOS specific
if(APPLE)
    target_link_libraries(led-sim PRIVATE
        "-framework CoreVideo"
        "-framework IOKit"
        "-framework Cocoa"
        "-framework GLUT"
        "-framework OpenGL"
    )
endif()
