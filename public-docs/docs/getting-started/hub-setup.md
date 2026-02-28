# Set Up RGFX Hub

The RGFX Hub is the desktop application that ties everything together. It watches for game events from MAME, decides which LED effects to trigger, and sends commands to your ESP32 drivers over WiFi. It also handles firmware updates and driver configuration.

## Config Directory

RGFX stores all user-editable files in a single config directory:

| Platform | Default Path |
|----------|-------------|
| macOS | `/Users/<username>/.rgfx/` |
| Windows | `C:\Users\<username>\.rgfx\` |

The directory structure:

```
interceptors/          # Lua scripts for MAME game monitoring
transformers/          # JavaScript scripts mapping events to effects
led-hardware/          # LED hardware definitions
drivers.json           # Driver configurations (auto-generated)
logs/                  # Log files (auto-generated)
interceptor-events.log # Event output (auto-generated)
```

You can change this location in [Settings](../hub-app/settings.md), but the default is recommended.

## First Launch

On first launch, the Hub copies default interceptor and transformer scripts to the config directory. This gives you a working set of [example game scripts](../example-games.md).

The Hub also starts an embedded MQTT message broker automatically — this is how your ESP32 drivers communicate with the Hub. You don't need to install or configure a separate broker.

## Configure Settings

Go to **[Settings](../hub-app/settings.md)** in the sidebar and configure:

![Settings](../assets/images/rgfx-hub-settings.png)

### MAME ROMs Directory

Point this to the folder where your MAME ROM files are stored. This allows the [Games](../hub-app/games.md) page to show which ROMs have matching interceptors and transformers.

## Next Step

[Flash your first driver :material-arrow-right:](first-driver.md)
