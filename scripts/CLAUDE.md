# Scripts

## E2E Smoke Test (`e2e-smoke-test.py`)

Soaks the Hub and connected drivers with randomized game events while monitoring process health. Requires the Hub to be already running and `psutil` (`pip install psutil`).

### Usage

```bash
python scripts/e2e-smoke-test.py                  # 60s, medium density
python scripts/e2e-smoke-test.py -d 300 -D high   # 5 minute stress test
python scripts/e2e-smoke-test.py -v                # Verbose per-second stats
python scripts/e2e-smoke-test.py -o results.json   # Save results to JSON
```

### Density Levels

| Level | Approximate Rate |
|-------|-----------------|
| low | ~5 events/sec |
| medium | ~20 events/sec |
| high | ~100 events/sec |
| stress | ~200 events/sec |

### What It Does

1. Finds the running Hub Electron process (main + renderer)
2. Sends `init` events for all supported games
3. Generates randomized events at the configured density
4. Samples CPU and memory every second
5. Monitors Hub and driver logs for errors
6. Watches for driver disconnections and crash recovery
7. Runs a 10-second cooldown after event generation stops
8. Sends `shutdown` events and reports results

### Pass/Fail

- **PASS** — No errors, no disconnections, no crashes, memory stable
- **WARN** — Memory trend is growing (possible leak)
- **FAIL** — Log errors, driver disconnections, or driver crashes

Exits with code 0 on PASS, 1 otherwise.

### Adding Events for New Games

Add entries to `GAME_EVENTS` in the script. Each entry is `(topic, payload_options)`:
- `None` — no payload
- `list` — picks a random value
- `"_score_"` — random integer (100–99999)
- `"_fm_"` — pipe-delimited hex pairs for FM channel data
