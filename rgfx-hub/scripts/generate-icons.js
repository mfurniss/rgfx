#!/usr/bin/env node

/**
 * Generate platform-specific application icons from a source image
 *
 * Usage: node scripts/generate-icons.js (from rgfx-hub directory)
 *
 * Requires:
 * - Source image: assets/icons/source/app-icon.png (1024x1024 recommended)
 * - sharp package (image processing)
 * - png2icons package (ICO/ICNS generation)
 */

const fs = require('fs');
const path = require('path');

const RGFX_HUB_ROOT = path.resolve(__dirname, '..');
const SOURCE_DIR = path.join(RGFX_HUB_ROOT, 'assets/icons/source');
const OUTPUT_DIR = path.join(RGFX_HUB_ROOT, 'assets/icons');
const LINUX_OUTPUT_DIR = path.join(OUTPUT_DIR, 'icons');

// Icon sizes for each platform
const LINUX_SIZES = [16, 24, 32, 48, 64, 128, 256, 512, 1024];

async function findSourceIcon() {
  const supportedExtensions = ['png', 'webp', 'jpg', 'jpeg'];

  for (const ext of supportedExtensions) {
    const iconPath = path.join(SOURCE_DIR, `app-icon.${ext}`);
    if (fs.existsSync(iconPath)) {
      return iconPath;
    }
  }

  return null;
}

async function main() {
  console.log('🎨 RGFX Icon Generator\n');

  // Dynamic imports for ESM modules
  const sharp = (await import('sharp')).default;
  const png2icons = (await import('png2icons')).default;

  const sourceIcon = await findSourceIcon();

  if (!sourceIcon) {
    console.error(`❌ Source icon not found in ${SOURCE_DIR}`);
    console.error('\nPlease save your icon as:');
    console.error('   assets/icons/source/app-icon.png');
    console.error('\nSupported formats: PNG (recommended), WebP, JPEG');
    process.exit(1);
  }

  const sourceExt = path.extname(sourceIcon).slice(1).toUpperCase();
  console.log(`✅ Found source icon: ${path.basename(sourceIcon)} (${sourceExt})\n`);

  // Ensure output directories exist
  fs.mkdirSync(LINUX_OUTPUT_DIR, { recursive: true });

  console.log('🔄 Generating platform-specific icons...\n');

  try {
    // Read and convert source to PNG buffer (1024x1024)
    const sourceBuffer = await sharp(sourceIcon)
      .resize(1024, 1024, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    // Generate ICO (Windows)
    console.log('  📦 Generating Windows ICO...');
    const icoBuffer = png2icons.createICO(sourceBuffer, png2icons.BEZIER, 0, true, true);
    if (icoBuffer) {
      fs.writeFileSync(path.join(OUTPUT_DIR, 'icon.ico'), icoBuffer);
      console.log('  ✅ icon.ico');
    } else {
      console.error('  ❌ Failed to generate ICO');
    }

    // Generate ICNS (macOS)
    console.log('  🍎 Generating macOS ICNS...');
    const icnsBuffer = png2icons.createICNS(sourceBuffer, png2icons.BEZIER, 0);
    if (icnsBuffer) {
      fs.writeFileSync(path.join(OUTPUT_DIR, 'icon.icns'), icnsBuffer);
      console.log('  ✅ icon.icns');
    } else {
      console.error('  ❌ Failed to generate ICNS');
    }

    // Generate Linux PNG set
    console.log('  🐧 Generating Linux PNG set...');
    for (const size of LINUX_SIZES) {
      await sharp(sourceIcon)
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(path.join(LINUX_OUTPUT_DIR, `${size}x${size}.png`));
      console.log(`  ✅ icons/${size}x${size}.png`);
    }

    console.log('\n✨ Icon generation complete!\n');
    console.log('Generated files:');
    console.log(`  - ${path.join(OUTPUT_DIR, 'icon.icns')} (macOS)`);
    console.log(`  - ${path.join(OUTPUT_DIR, 'icon.ico')} (Windows)`);
    console.log(`  - ${LINUX_OUTPUT_DIR}/ (Linux PNG set)`);
  } catch (error) {
    console.error('\n❌ Icon generation failed:', error.message);
    process.exit(1);
  }
}

main();
