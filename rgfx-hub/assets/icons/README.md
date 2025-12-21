# RGFX Hub Application Icons

This directory contains the application icon assets for RGFX Hub.

## Quick Start

1. **Add your icon**: Save your icon as `source/app-icon.png` (recommended: 1024x1024)
2. **Generate platform icons**: Run `node scripts/generate-icons.js` (from rgfx-hub directory)
3. **Build the app**: Run `npm run package`

## Supported Source Formats

The icon generator supports:
- PNG (recommended)
- WebP
- JPEG

## Generated Files

After running the generator script:

- `icon.icns` - macOS application icon
- `icon.ico` - Windows application icon
- `icons/` - Linux icon set (multiple PNG sizes)

## Directory Structure

```
assets/icons/
├── source/
│   └── app-icon.png       # Your source icon (you provide this)
├── icon.icns              # Generated macOS icon
├── icon.ico               # Generated Windows icon
└── icons/                 # Generated Linux icon set
```

## Important Notes

- Keep your source file (`app-icon.*`) for future regeneration
- Icon only appears in **packaged builds**, not in development mode (`npm start`)
- On macOS, you may need to restart Finder or log out/in to see icon changes
- The generator uses `sharp` + `png2icons` (pure JavaScript, no native deps)
- Works on macOS, Linux, and Windows (including GitLab CI)

## Icon Design Tips

- Use a **1024x1024 canvas** (1:1 aspect ratio)
- Design should be **simple and recognizable** at small sizes (16x16)
- Use **transparent background** for PNG
- Test visibility on both light and dark backgrounds
- Avoid fine details that disappear when scaled down
