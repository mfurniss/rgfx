#!/usr/bin/env bash
# Sync interceptors, transformers, and led-hardware from ~/.rgfx to bundled assets.
# Run this before committing to ensure assets match the working config.

set -euo pipefail

RGFX_HOME="$HOME/.rgfx"
ASSETS_DIR="$(cd "$(dirname "$0")/../rgfx-hub/assets" && pwd)"

if [ ! -d "$RGFX_HOME" ]; then
  echo "Error: $RGFX_HOME does not exist" >&2
  exit 1
fi

rsync -av --delete \
  --exclude='.DS_Store' \
  "$RGFX_HOME/interceptors/" "$ASSETS_DIR/interceptors/"

rsync -av --delete \
  --exclude='.DS_Store' \
  --exclude='CLAUDE.md' \
  "$RGFX_HOME/transformers/" "$ASSETS_DIR/transformers/"

rsync -av --delete \
  --exclude='.DS_Store' \
  "$RGFX_HOME/led-hardware/" "$ASSETS_DIR/led-hardware/"

echo "Assets synced from $RGFX_HOME"
