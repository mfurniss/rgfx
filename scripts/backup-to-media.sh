#!/bin/bash
#
# RGFX Backup to /Volumes/media/backups
#
# This script uses rsync to create an incremental backup of the RGFX project
# to an external media volume.
#

set -e  # Exit on error

# Configuration
SOURCE_DIR="/Users/matt/Workspace/rgfx"
RGFX_CONFIG_DIR="$HOME/.rgfx"
BACKUP_DEST="/Volumes/media/backups/rgfx"
CONFIG_BACKUP_DEST="/Volumes/media/backups/rgfx-config"
BUNDLE_DEST="/Volumes/media/backups/rgfx-bundles"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
LOG_FILE="$HOME/Library/Logs/rgfx-backup-media.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
  echo "[$(date +"%Y-%m-%d %H:%M:%S")] $1" | tee -a "$LOG_FILE"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Check if media volume is mounted
if [ ! -d "/Volumes/media" ]; then
  log_error "Media volume not mounted at /Volumes/media"
  exit 1
fi

# Create backup directories if they don't exist
mkdir -p "$BACKUP_DEST"
mkdir -p "$CONFIG_BACKUP_DEST"
mkdir -p "$BUNDLE_DEST"

log "Starting RGFX backup to $BACKUP_DEST"
log "Source: $SOURCE_DIR"
log "Config source: $RGFX_CONFIG_DIR"

# rsync options:
# -a  : archive mode (recursive, preserve permissions, timestamps, etc.)
# -h  : human-readable sizes
# --delete : delete files in destination that don't exist in source
# --exclude : exclude patterns (build artifacts, temp files, etc.)
# --info=progress2 : show overall progress with percentage (requires brew rsync)

rsync -avh --delete \
  --exclude='.DS_Store' \
  --exclude='node_modules/' \
  --exclude='.pio/' \
  --exclude='.cache/' \
  --exclude='.vscode/.browse.c_cpp.db*' \
  --exclude='.vscode/c_cpp_properties.json' \
  --exclude='.vscode/launch.json' \
  --exclude='.vscode/ipch' \
  --exclude='esp32-installer/*.bin' \
  --exclude='esp32/src/version.h' \
  --exclude='rgfx-hub/out/' \
  --exclude='rgfx-hub/.vite/' \
  --exclude='*.log' \
  --exclude='.git/logs/' \
  --exclude='.gitlab-ci-local/' \
  "$SOURCE_DIR/" "$BACKUP_DEST/"

if [ $? -eq 0 ]; then
  log_success "Project backup completed successfully"
else
  log_error "Project backup failed"
  exit 1
fi

# Backup ~/.rgfx config directory
log "Backing up ~/.rgfx config directory..."

if [ -d "$RGFX_CONFIG_DIR" ]; then
  rsync -avh --delete \
    --exclude='.DS_Store' \
    "$RGFX_CONFIG_DIR/" "$CONFIG_BACKUP_DEST/"

  if [ $? -eq 0 ]; then
    log_success "Config backup completed successfully"
  else
    log_error "Config backup failed"
    exit 1
  fi
else
  log_warning "Config directory $RGFX_CONFIG_DIR does not exist, skipping"
fi

# Show backup sizes
BACKUP_SIZE=$(du -sh "$BACKUP_DEST" | cut -f1)
log "Project backup size: $BACKUP_SIZE"

if [ -d "$CONFIG_BACKUP_DEST" ]; then
  CONFIG_SIZE=$(du -sh "$CONFIG_BACKUP_DEST" | cut -f1)
  log "Config backup size: $CONFIG_SIZE"
fi

# Create a timestamp marker file
echo "Last backup: $(date)" > "$BACKUP_DEST/.last-backup"

log "Backup marker created: $BACKUP_DEST/.last-backup"

# Create git bundle with all branches and tags
log "Creating git bundle..."

BUNDLE_FILE="$BUNDLE_DEST/rgfx-$(date +"%Y-%m-%d").bundle"

cd "$SOURCE_DIR"
if git bundle create "$BUNDLE_FILE" --all 2>&1 | tee -a "$LOG_FILE"; then
  BUNDLE_SIZE=$(du -sh "$BUNDLE_FILE" | cut -f1)
  log_success "Git bundle created: $BUNDLE_FILE ($BUNDLE_SIZE)"

  # Keep only the 5 most recent bundles
  ls -t "$BUNDLE_DEST"/rgfx-*.bundle 2>/dev/null | tail -n +6 | xargs -r rm -f
  BUNDLE_COUNT=$(ls -1 "$BUNDLE_DEST"/rgfx-*.bundle 2>/dev/null | wc -l | tr -d ' ')
  log "Bundle retention: keeping $BUNDLE_COUNT most recent bundles"
else
  log_error "Git bundle creation failed"
fi

log "Log file: $LOG_FILE"
