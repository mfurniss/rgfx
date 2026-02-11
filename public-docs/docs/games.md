# Example Games & Community Scripts

RGFX ships with example interceptors and transformers for several classic arcade games. These are meant to get you up and running quickly, but the real fun is making them your own — or adding support for your favorite game.

Any game that runs in MAME can work with RGFX. The included scripts are starting points, not a fixed list.

## Included Examples

### Full Examples

These games have both an interceptor (detects game events) and a transformer (maps events to LED effects):

| Game | ROM | Events Detected |
|------|-----|----------------|
| Pac-Man | `pacman` | Score, lives, ghost eaten, power pellet, level complete |
| Galaga | `galaga` | Score, lives, enemy destroyed, challenging stage |
| Galaga '88 | `galaga88` | Score, lives, enemy destroyed |
| Star Wars | `starwars` | Score, shields, wave complete, enemy destroyed |
| Robotron: 2084 | `robotron` | Score, lives, sound effects (laser, explosion, rescue) |
| Super Mario Bros | `smb` | Score, lives, coins, power-ups |

### Interceptor Only

These games have interceptors that detect events but use default effect mappings rather than custom transformers. They work out of the box — writing a custom transformer lets you fine-tune exactly which effects play for each event.

| Game | ROM | Events Detected |
|------|-----|----------------|
| Super Street Fighter II | `ssf2` | Score, round, health, actions |
| Space Harrier | `sharrier` | Score, lives |
| OutRun | `outrun` | Score, speed, stage |
| G-Force 2 | `gforce2` | Score, lives |
| Castlevania III (NES) | `nes_castlevania3` | Score, lives, health |

## Create Your Own

Picked a game that isn't listed above? Every game in MAME can be given RGFX support. The [Writing Interceptors](interceptors/writing-interceptors.md) guide walks you through the process step by step — from finding memory addresses with MAME's debugger to emitting your first event.

You don't need to be an expert programmer. If you can edit a text file and follow a tutorial, you can write an interceptor. The existing game scripts are good examples to study and adapt.

For mapping events to effects, see the [Transformers](transformers/index.md) documentation.

## Contribute Your Scripts

RGFX is a community project. If you've written an interceptor or transformer for a game, consider contributing it back so everyone can enjoy it.

### How to Contribute

1. **Write your script** following the patterns in the [Writing Interceptors](interceptors/writing-interceptors.md) guide
2. **Test it** with several plays through the game to make sure events fire reliably
3. **Submit it** via pull request on GitHub (link coming when project is open-sourced)

### What Makes a Good Submission

- **Naming convention**: `gamename_rgfx.lua` for interceptors, `gamename.js` for transformers
- **Common events covered**: score, lives/health, and level changes at minimum
- **Tested across game modes**: single-player, attract mode, and game over should all behave correctly
- **Clean code**: comments explaining any non-obvious memory addresses or data formats

### Enhance Existing Scripts

The included examples detect common gameplay events, but there's always room to improve. Maybe you've found additional memory addresses for events I missed, or you've written a transformer that creates a better effect sequence. Improvements to existing scripts are just as welcome as entirely new games.
