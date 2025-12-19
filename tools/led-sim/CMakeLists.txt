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

# Native HAL implementation (local to led-sim)
set(HAL_SOURCES
    src/hal/platform.cpp
    src/hal/log_stub.cpp
    src/hal/driver_config_stub.cpp
    src/hal/led_controller.cpp
)

# Source files from esp32/src that we need
set(ESP32_SOURCES
    # Graphics
    ${ESP32_SRC_DIR}/graphics/canvas.cpp
    ${ESP32_SRC_DIR}/graphics/coordinate_transforms.cpp
    ${ESP32_SRC_DIR}/graphics/matrix.cpp

    # Effects
    ${ESP32_SRC_DIR}/effects/effect_processor.cpp
    ${ESP32_SRC_DIR}/effects/effect_utils.cpp
    ${ESP32_SRC_DIR}/effects/pulse.cpp
    ${ESP32_SRC_DIR}/effects/wipe.cpp
    ${ESP32_SRC_DIR}/effects/explode.cpp
    ${ESP32_SRC_DIR}/effects/bitmap.cpp
    ${ESP32_SRC_DIR}/effects/background.cpp
    ${ESP32_SRC_DIR}/effects/plasma.cpp
    ${ESP32_SRC_DIR}/effects/test_leds.cpp
    ${ESP32_SRC_DIR}/effects/projectile.cpp
    ${ESP32_SRC_DIR}/effects/text.cpp
    ${ESP32_SRC_DIR}/effects/scroll_text.cpp
    ${ESP32_SRC_DIR}/effects/text_rendering.cpp

    # Fonts
    ${ESP32_SRC_DIR}/fonts/den_8x8.cpp

    # Utils
    ${ESP32_SRC_DIR}/utils/easing_impl.cpp
)

# Simulator sources
set(SIM_SOURCES
    src/main.cpp
    src/config.cpp
    src/demo.cpp
    src/sim_display.cpp
    src/udp_listener.cpp
    src/window.cpp
    src/window_state.cpp
)

# Create executable
add_executable(led-sim ${SIM_SOURCES} ${HAL_SOURCES} ${ESP32_SOURCES})

# Include directories - native HAL first so it overrides ESP32 headers
target_include_directories(led-sim PRIVATE
    ${CMAKE_SOURCE_DIR}/src
    ${CMAKE_SOURCE_DIR}/src/hal
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
