# Settings

Configure the Hub's directories, appearance, and effect behavior.

## Appearance

Choose your preferred theme mode:

- **System** - Follow operating system setting
- **Light** - Light theme
- **Dark** - Dark theme

## Directories

### RGFX Config Directory

**Required.** Location of RGFX configuration files including:

- Interceptor scripts (`interceptors/`)
- Transformer scripts (`transformers/`)
- LED hardware definitions (`led-hardware/`)
- Driver configurations (`drivers/`)

Default: see [Config Directory](../getting-started/hub-setup.md#config-directory)

### MAME ROMs Directory

**Optional.** Path to your MAME ROM files. When configured, the [Games](games.md) page shows which ROMs have interceptors and transformers.

## Effect Modifiers

### Strip Explosions

Adjusts the lifespan of explosion effects on LED strips. Lower values create shorter, snappier explosions. Higher values extend the visual decay.

Range: 0.1 to 1.0 (default: 0.6)

## Saving

Click **Save** to apply directory changes. The Hub validates that directories exist before saving.
