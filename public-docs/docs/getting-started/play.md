# Play a Game

Everything is connected — time to see RGFX in action.

## Pick a Game

Check the [Example Games](../example-games.md) page for the full list of included games. For your first run, **Pac-Man** (`pacman`) is a great choice — its example interceptor and transformer cover events like scoring, ghost eating, power pellets, and level completion.

## Launch MAME

Start the game in MAME as you normally would. RGFX works behind the scenes — when MAME launches, the `rgfx.lua` script automatically detects which game is running and loads the matching interceptor.

## What to Expect

For example, as you play Pac-Man:

- **Eat dots** and a Pac-Man sprite animates across the matrix while wipe effects sweep the strips
- **Eat an energizer** and a scared ghost sprite chases across the matrix with a blue pulse on the strips
- **Eat a ghost** and the ghost's score (200, 400, 800, 1600) displays on the matrix with floating ghost eyes
- **Die** and a yellow pulse fires across all drivers
- **Complete a level** and the background flashes between blue and white

Open the Hub's [Event Monitor](../hub-app/event-monitor.md) to see events streaming in real-time as you play. Each row shows the event topic, how many times it has fired, and its last value.

## Next Steps

Now that you're up and running, here's where to go from here:

- **Try more games** — load up Galaga, Star Wars, Robotron, or any of the other [example games](../example-games.md)
- **Experiment with effects** — use the [FX Playground](../hub-app/fx-playground.md) to explore the visual effects and find your favorites
- **Add more drivers** — connect additional ESP32 boards with LED strips or matrices for a bigger setup
- **Add your favorite game** — the [Writing Interceptors](../interceptors/writing-interceptors.md) guide walks you through adding RGFX support for any game in MAME
- **Customize effect mappings** — write a [transformer](../transformers/writing-transformers.md) to control exactly which effects play for each event
