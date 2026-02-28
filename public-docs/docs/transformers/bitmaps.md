# Bitmaps

The bitmap effect displays sprite images on LED matrices. Bitmaps can be defined inline as string arrays or loaded from GIF files.

![Bitmap sprite displayed on an LED matrix](../assets/images/rgfx-bitmap-bub.jpg)

## Inline Bitmaps

Bitmaps can be defined directly as string arrays. Each character is a hex palette index (`0`–`F`), and `.` represents a transparent pixel:

```javascript
broadcast({
  effect: 'bitmap',
  props: {
    reset: false,
    centerX: 0,
    centerY: 0,
    duration: 1500,
    fadeIn: 300,
    fadeOut: 300,
    images: [[
      '.......A........',
      '......AAA.......',
      '....BBBBBAAAA...',
      '...BBBBBBBAA....',
      '..B7B77BBBB.....',
      '..70B077BBBAAA..',
      '..70B077BBBBA...',
      '.B70B077AABB....',
      '.A70B077AAABAA..',
      '.BB7B77BA0BBA...',
      '..0070000BEB....',
      '..BBBBBBBEEEB...',
      '...7777BEEEEB...',
      '..777777BEEBBA..',
      'EEE777EEBBBBBBA.',
      '.EE77EEEEEBBBBBB',
    ]],
  },
});
```

This is useful for small, hand-crafted sprites or when you want to embed bitmap data directly in a transformer without managing separate GIF files.

When no `palette` is provided, the bitmap effect uses the **PICO-8 palette** as the default. The hex characters in your image data map directly to these 16 colors:

<div class="pico8-palette">
  <span style="background:#000000;color:#fff">0 Black</span>
  <span style="background:#1D2B53;color:#fff">1 Dark Blue</span>
  <span style="background:#7E2553;color:#fff">2 Purple</span>
  <span style="background:#008751;color:#fff">3 Dark Green</span>
  <span style="background:#AB5236;color:#fff">4 Brown</span>
  <span style="background:#5F574F;color:#fff">5 Dark Gray</span>
  <span style="background:#C2C3C7;color:#000">6 Light Gray</span>
  <span style="background:#FFF1E8;color:#000">7 White</span>
  <span style="background:#FF004D;color:#fff">8 Red</span>
  <span style="background:#FFA300;color:#000">9 Orange</span>
  <span style="background:#FFEC27;color:#000">A Yellow</span>
  <span style="background:#00E436;color:#000">B Green</span>
  <span style="background:#29ADFF;color:#000">C Blue</span>
  <span style="background:#83769C;color:#fff">D Lavender</span>
  <span style="background:#FF77A8;color:#000">E Pink</span>
  <span style="background:#FFCCAA;color:#000">F Peach</span>
</div>

## Loading GIF Files

The `loadGif` function loads animated GIF files and converts them to the bitmap effect format.

```javascript
const sprite = await loadGif('bitmaps/cherry.gif');
```

The function is available on the transformer context object:

```javascript
export async function transform({ subject, property, payload }, { broadcast, loadGif }) {
  const sprite = await loadGif('bitmaps/my-sprite.gif');
  // ...
}
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `path` | string | Path to the GIF file, relative to the `transformers/` folder in your [config directory](../getting-started/hub-setup.md#config-directory) |

### Return Value

Returns a `GifBitmapResult` object:

| Property | Type | Description |
|----------|------|-------------|
| `images` | `string[][]` | Array of frames. Each frame is an array of row strings using hex characters (0-F) for palette indices. |
| `palette` | `string[]` | Array of up to 16 hex color strings extracted from the GIF's color table. |
| `width` | `number` | Width of the GIF in pixels. |
| `height` | `number` | Height of the GIF in pixels. |
| `frameCount` | `number` | Number of frames in the GIF. |
| `frameRate` | `number` | Frames per second (only present for animated GIFs with more than 1 frame). |

### Using with Bitmap Effect

The result from `loadGif` provides everything needed for the `bitmap` effect:

```javascript
const sprite = await loadGif('bitmaps/cherry.gif');

broadcast({
  effect: 'bitmap',
  props: {
    images: sprite.images,
    palette: sprite.palette,
    centerX: 50,
    centerY: 50,
    duration: 2000,
  },
});
```

### Animation Support

For animated GIFs, the `frameRate` property indicates the playback speed:

```javascript
const animatedSprite = await loadGif('bitmaps/explosion.gif');

broadcast({
  effect: 'bitmap',
  props: {
    images: animatedSprite.images,
    palette: animatedSprite.palette,
    frameRate: animatedSprite.frameRate,  // Use GIF's timing
    centerX: 50,
    centerY: 50,
    duration: 2000,
  },
});
```

Override `frameRate` in props to change playback speed:

```javascript
broadcast({
  effect: 'bitmap',
  props: {
    images: animatedSprite.images,
    palette: animatedSprite.palette,
    frameRate: 12,  // Force 12 FPS regardless of GIF timing
    // ...
  },
});
```

### Caching Loaded Sprites

GIF files should be loaded once and cached for reuse. Loading the same file repeatedly impacts performance:

```javascript
const BONUS_ITEMS = {
  cherry: { score: 100, file: 'pac-bonus-1-cherry.gif' },
  strawberry: { score: 300, file: 'pac-bonus-2-strawberry.gif' },
};

export async function transform({ subject, property, payload }, { broadcast, loadGif }) {
  if (subject === 'player' && property === 'eat') {
    const bonusItem = BONUS_ITEMS[payload];

    if (bonusItem) {
      // Load sprite only once, then cache it
      if (!bonusItem.sprite) {
        bonusItem.sprite = await loadGif(`bitmaps/${bonusItem.file}`);
      }

      broadcast({
        effect: 'bitmap',
        props: {
          images: bonusItem.sprite.images,
          palette: bonusItem.sprite.palette,
          centerX: 50,
          centerY: 50,
          duration: 1000,
        },
      });
    }
  }
}
```

### File Location

Place GIF files in subdirectories under `transformers/` in your config directory:

```
transformers/
├── bitmaps/
│   ├── cherry.gif
│   ├── explosion.gif
│   └── powerup.gif
└── games/
    └── pacman.js
```

### Color Palette Limitations

- GIFs are converted to a 16-color palette
- Colors beyond the first 16 in the GIF's color table are mapped using modulo
- Transparent pixels are preserved (rendered as spaces in the bitmap data)

### Error Handling

Handle loading errors gracefully to prevent transformer failures:

```javascript
try {
  const sprite = await loadGif('bitmaps/bonus.gif');
  // Use sprite...
} catch (err) {
  context.log.error('Failed to load sprite:', err);
  // Fallback behavior or skip the effect
}
```

Common errors:

- File not found at the specified path
- Invalid or corrupted GIF file
- GIF contains no frames
- GIF has no color table

## Movement and Easing

Bitmaps can animate from a start position to an end position over the `duration`. Set `endX` and/or `endY` to define the destination:

```javascript
broadcast({
  effect: 'bitmap',
  props: {
    images: sprite.images,
    palette: sprite.palette,
    centerX: 0,
    centerY: 50,
    endX: 100,
    endY: 50,
    duration: 2000,
    easing: 'cubicInOut',
  },
});
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `endX` | `number` \| `'random'` | — | End X position (0–100 or `'random'`). If omitted, the bitmap stays at `centerX`. |
| `endY` | `number` \| `'random'` | — | End Y position (0–100 or `'random'`). If omitted, the bitmap stays at `centerY`. |
| `easing` | `string` | `'quadraticInOut'` | Easing curve for the movement. Only applies when `endX` or `endY` is set. |

### Available easing functions { #easing-functions }

See [easings.net](https://easings.net/) for visual examples of each curve.

| Family | In | Out | In-Out |
|--------|----|-----|--------|
| Linear | `linear` | | |
| Quadratic | `quadraticIn` | `quadraticOut` | `quadraticInOut` |
| Cubic | `cubicIn` | `cubicOut` | `cubicInOut` |
| Quartic | `quarticIn` | `quarticOut` | `quarticInOut` |
| Quintic | `quinticIn` | `quinticOut` | `quinticInOut` |
| Sine | `sineIn` | `sineOut` | `sineInOut` |
| Circular | `circularIn` | `circularOut` | `circularInOut` |
| Exponential | `exponentialIn` | `exponentialOut` | `exponentialInOut` |
| Elastic | `elasticIn` | `elasticOut` | `elasticInOut` |
| Back | `backIn` | `backOut` | `backInOut` |
| Bounce | `bounceIn` | `bounceOut` | `bounceInOut` |
