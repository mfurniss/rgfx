#!/bin/bash

ARCH=$(uname -m)

cd ~/Workspace/mame0281-arm64 || exit 1

./mame "$@" -console -window -skip_gameinfo -video opengl -autoboot_script ~/Workspace/rgfx/rgfx.lua
