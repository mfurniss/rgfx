# native_platform_flags.py - Platform-specific build flag adjustments for native tests
# Disables AddressSanitizer on Windows (MinGW doesn't ship libasan)
import platform

Import("env")

if platform.system() == "Windows":
    # Remove ASan flags that MinGW doesn't support
    flags_to_remove = ["-fsanitize=address", "-fno-omit-frame-pointer"]
    build_flags = env.get("BUILD_FLAGS", [])
    env.Replace(BUILD_FLAGS=[f for f in build_flags if f not in flags_to_remove])

    cxxflags = env.get("CXXFLAGS", [])
    env.Replace(CXXFLAGS=[f for f in cxxflags if f not in flags_to_remove])

    linkflags = env.get("LINKFLAGS", [])
    env.Replace(LINKFLAGS=[f for f in linkflags if f not in flags_to_remove])
