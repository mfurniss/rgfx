# coverage_link.py - Adds coverage linker flags for native-coverage environment
# Required because PlatformIO doesn't pass coverage flags to linker via build_flags alone
# Reference: https://community.platformio.org/t/codecoverage-running-natively-on-osx/30461
Import("env")

env.Append(LINKFLAGS=["-fprofile-instr-generate"])
