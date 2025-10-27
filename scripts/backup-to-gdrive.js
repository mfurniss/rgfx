#!/usr/bin/env node
/**
 * Automated Git Bundle Backup to Google Drive
 *
 * Creates a complete Git bundle backup of the RGFX repository and saves it
 * to Google Drive. Keeps the last 30 daily backups and removes older ones.
 *
 * Usage:
 *   node scripts/backup-to-gdrive.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Configuration
const GDRIVE_BACKUP_DIR = path.join(os.homedir(), 'Google Drive/My Drive/Backups/rgfx');
const REPO_DIR = path.join(__dirname, '..');
const TIMESTAMP = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
const BUNDLE_NAME = `rgfx-backup-${TIMESTAMP}.bundle`;
const BUNDLE_PATH = path.join(GDRIVE_BACKUP_DIR, BUNDLE_NAME);
const KEEP_BACKUPS = 30; // Keep last 30 days

console.log('🔄 RGFX Git Bundle Backup');
console.log('========================\n');

// Ensure Google Drive backup directory exists
try {
  if (!fs.existsSync(GDRIVE_BACKUP_DIR)) {
    console.log(`📁 Creating backup directory: ${GDRIVE_BACKUP_DIR}`);
    fs.mkdirSync(GDRIVE_BACKUP_DIR, { recursive: true });
  }
} catch (error) {
  console.error(`❌ Error creating backup directory: ${error.message}`);
  process.exit(1);
}

// Check if backup for today already exists
if (fs.existsSync(BUNDLE_PATH)) {
  console.log(`⚠️  Backup already exists for today: ${BUNDLE_NAME}`);
  console.log(`   Skipping backup creation.\n`);
} else {
  // Create Git bundle
  try {
    console.log(`📦 Creating Git bundle: ${BUNDLE_NAME}`);
    execSync(`git bundle create "${BUNDLE_PATH}" --all`, {
      cwd: REPO_DIR,
      stdio: 'inherit'
    });
    console.log(`✅ Bundle created successfully\n`);
  } catch (error) {
    console.error(`❌ Error creating Git bundle: ${error.message}`);
    process.exit(1);
  }

  // Verify the bundle
  try {
    console.log(`🔍 Verifying bundle integrity...`);
    execSync(`git bundle verify "${BUNDLE_PATH}"`, {
      cwd: REPO_DIR,
      stdio: 'pipe'
    });
    console.log(`✅ Bundle verified successfully\n`);
  } catch (error) {
    console.error(`❌ Bundle verification failed: ${error.message}`);
    process.exit(1);
  }
}

// Get bundle size
const stats = fs.statSync(BUNDLE_PATH);
const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
console.log(`📊 Bundle size: ${sizeMB} MB`);
console.log(`📍 Location: ${BUNDLE_PATH}\n`);

// Clean up old backups (keep last N days)
console.log(`🧹 Cleaning up old backups (keeping last ${KEEP_BACKUPS})...`);
try {
  const files = fs.readdirSync(GDRIVE_BACKUP_DIR)
    .filter(f => f.startsWith('rgfx-backup-') && f.endsWith('.bundle'))
    .map(f => ({
      name: f,
      path: path.join(GDRIVE_BACKUP_DIR, f),
      mtime: fs.statSync(path.join(GDRIVE_BACKUP_DIR, f)).mtime
    }))
    .sort((a, b) => b.mtime - a.mtime); // Sort by newest first

  console.log(`   Found ${files.length} backup(s) total`);

  if (files.length > KEEP_BACKUPS) {
    const filesToDelete = files.slice(KEEP_BACKUPS);
    console.log(`   Deleting ${filesToDelete.length} old backup(s):`);
    filesToDelete.forEach(f => {
      fs.unlinkSync(f.path);
      console.log(`   ❌ Deleted: ${f.name}`);
    });
  } else {
    console.log(`   No old backups to delete`);
  }
} catch (error) {
  console.error(`⚠️  Warning: Error cleaning up old backups: ${error.message}`);
}

console.log('\n✅ Backup complete!\n');
