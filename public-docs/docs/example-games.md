# Example Games & Community Scripts

RGFX ships with example interceptors and transformers for several classic arcade games. These are meant to get you up and running quickly, but the real fun is making them your own — or adding support for your favorite game.

Any game that runs in MAME can work with RGFX. The included scripts are starting points, not a fixed list.

## Included Examples

These games have both an interceptor (detects game events) and a transformer (maps events to LED effects):

| Game | ROM | Events Detected |
|------|-----|----------------|
| Pac-Man | `pacman` | Score deltas (dot, energizer, fruit types, ghosts), ghost states, sound, game mode, dots remaining, level complete |
| Galaga | `galaga` | P1/P2 score, enemy destroy, tractor beam, fighter capture, perfect bonus, bonus scores, stage, fire count |
| Galaga '88 | `galaga88` | Score, enemy destroy (with type), fire count, screen text detection |
| Star Wars | `starwars` | Score (with enemy type), shields, player fire, game state, death star destruction |
| Robotron: 2084 | `robotron` | Score, lives, wave tracking, fire direction, enemy counts (6 types), family rescue, sound effects (20+ types) |
| Super Mario Bros | `smb` | Score, lives, coins, power-ups |
| Defender | `defender` | Score, lives, smart bombs, humanoid count/lost, enemy counts (6 types), player explosion |
| OutRun | `outrun` | Ambilight, game time, music channels (FM) |
| Super Hang-On | `shangon` | Ambilight, music channels (FM) |
| Super Street Fighter II | `ssf2` | Sound commands, ambilight |

### Interceptor Only

These games have interceptors that detect events but use default effect mappings rather than custom transformers. They work out of the box — writing a custom transformer lets you fine-tune exactly which effects play for each event.

| Game | ROM | Events Detected |
|------|-----|----------------|
| Space Harrier | `sharrier` | Ambilight |
| G-Force 2 | `gforce2` | Ambilight |

## Create Your Own

Any game in MAME can be given RGFX support. The [Writing Interceptors](interceptors/writing-interceptors.md) guide covers the process — finding memory addresses with MAME's debugger, monitoring them in Lua, and emitting events. The existing scripts are good references to study and adapt.

For mapping events to effects, see the [Writing Transformers](transformers/writing-transformers.md) guide.

## Contribute Your Scripts

RGFX is a community project. If you've written an interceptor or transformer for a game, consider contributing it back.

### How to Contribute

1. **Write your script** following the patterns in the [Writing Interceptors](interceptors/writing-interceptors.md) guide
2. **Test it** with several plays through the game to make sure events fire reliably
3. **Submit it** — contributions are accepted via pull request on [GitHub](https://github.com/mfurniss/rgfx)

### What Makes a Good Submission

- **Naming convention**: `romname_rgfx.lua` for interceptors, `romname.js` for transformers
- **Common events covered**: score, lives/health, and level changes at minimum
- **Tested across game modes**: single-player, attract mode, and game over should all behave correctly
- **Clean code**: comments explaining any non-obvious memory addresses or data formats

### Enhance Existing Scripts

The included examples detect common gameplay events, but there's always room to improve. Maybe you've found additional memory addresses for events I missed, or you've written a transformer that creates a better effect sequence. Improvements to existing scripts are just as welcome as entirely new games.
