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

log "Starting RGFX backup to $BACKUP_DEST"
log "Source: $SOURCE_DIR"
log "Config source: $RGFX_CONFIG_DIR"

# rsync options:
# -a  : archive mode (recursive, preserve permissions, timestamps, etc.)
# -h  : human-readable sizes
# --delete : delete files in destination that don't exist in source
# --exclude : exclude patterns (build artifacts, temp files, etc.)
# --info=progress2 : show overall progress with percentage (requires brew rsync)

rsync -ah --delete \
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
  --info=progress2 \
  "$SOURCE_DIR/" "$BACKUP_DEST/" 2>&1 | tee -a "$LOG_FILE"

if [ ${PIPESTATUS[0]} -eq 0 ]; then
  log_success "Project backup completed successfully"
else
  log_error "Project backup failed"
  exit 1
fi

# Backup ~/.rgfx config directory
log "Backing up ~/.rgfx config directory..."

if [ -d "$RGFX_CONFIG_DIR" ]; then
  rsync -ah --delete \
    --exclude='.DS_Store' \
    --info=progress2 \
    "$RGFX_CONFIG_DIR/" "$CONFIG_BACKUP_DEST/" 2>&1 | tee -a "$LOG_FILE"

  if [ ${PIPESTATUS[0]} -eq 0 ]; then
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
log "Log file: $LOG_FILE"
