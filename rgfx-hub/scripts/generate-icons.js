#!/usr/bin/env node

/**
 * Generate platform-specific application icons from a source image
 *
 * Usage: node scripts/generate-icons.js (from rgfx-hub directory)
 *
 * Requires:
 * - Source image: assets/icons/source/app-icon.{png,webp,jpg}
 * - electron-icon-builder package (cross-platform, works on macOS/Linux/Windows)
 *
 * Supports: PNG (recommended), other formats require conversion to PNG first
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const RGFX_HUB_ROOT = path.resolve(__dirname, '..');
const SOURCE_DIR = path.join(RGFX_HUB_ROOT, 'assets/icons/source');
const OUTPUT_DIR = path.join(RGFX_HUB_ROOT, 'assets/icons');

function findSourceIcon() {
  const supportedExtensions = ['png', 'webp', 'jpg', 'jpeg'];

  for (const ext of supportedExtensions) {
    const iconPath = path.join(SOURCE_DIR, `app-icon.${ext}`);
    if (fs.existsSync(iconPath)) {
      return iconPath;
    }
  }

  return null;
}

function main() {
  console.log('🎨 RGFX Icon Generator\n');

  const sourceIcon = findSourceIcon();

  if (!sourceIcon) {
    console.error(`❌ Source icon not found in ${SOURCE_DIR}`);
    console.error('\nPlease save your icon as:');
    console.error('   assets/icons/source/app-icon.png');
    console.error('\nSupported formats: PNG (recommended), WebP, JPEG');
    process.exit(1);
  }

  const sourceExt = path.extname(sourceIcon).slice(1).toUpperCase();
  console.log(`✅ Found source icon: ${path.basename(sourceIcon)} (${sourceExt})\n`);

  console.log('🔄 Generating platform-specific icons...\n');

  try {
    const eibPath = path.join(RGFX_HUB_ROOT, '../node_modules/.bin/electron-icon-builder');
    execSync(`"${eibPath}" --input="${sourceIcon}" --output="${OUTPUT_DIR}" --flatten`, {
      stdio: 'inherit',
    });

    // electron-icon-builder puts files in icons/ subdirectory despite --flatten
    // Move them to parent directory
    const iconsSubdir = path.join(OUTPUT_DIR, 'icons');
    const icnsSource = path.join(iconsSubdir, 'icon.icns');
    const icoSource = path.join(iconsSubdir, 'icon.ico');
    const icnsTarget = path.join(OUTPUT_DIR, 'icon.icns');
    const icoTarget = path.join(OUTPUT_DIR, 'icon.ico');

    if (fs.existsSync(icnsSource)) {
      fs.renameSync(icnsSource, icnsTarget);
    }
    if (fs.existsSync(icoSource)) {
      fs.renameSync(icoSource, icoTarget);
    }

    console.log('\n✨ Icon generation complete!\n');
    console.log('Generated files:');
    console.log(`  - ${icnsTarget} (macOS)`);
    console.log(`  - ${icoTarget} (Windows)`);
    console.log(`  - ${iconsSubdir}/ (Linux PNG set)`);
  } catch (error) {
    console.error('\n❌ Icon generation failed:', error.message);
    process.exit(1);
  }
}

main();
