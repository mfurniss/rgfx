# Games

!!! warning "Draft"
    This page is a placeholder and is under active development.

The Games page shows all configured games with their interceptor and transformer scripts.

## Games Table

| Column | Description |
|--------|-------------|
| MAME ROM File | ROM filename (if MAME ROMs directory configured) |
| MAME Interceptor | Lua script monitoring game state |
| RGFX Hub Transformer | JavaScript transforming events to effects |

Click interceptor or transformer names to open the script in your default editor.

## Filtering

Toggle **Hide unconfigured** to show only games with interceptors or transformers. When disabled, all ROMs in the MAME directory are listed.

## Prerequisites

Configure the **MAME ROMs Directory** in [Settings](settings.md) to see which ROMs have matching interceptors and transformers.

## Adding Game Support

- **Interceptors**: See [Writing Interceptors](../interceptors/writing-interceptors.md)
- **Transformers**: See [Transformers](../transformers/index.md)
