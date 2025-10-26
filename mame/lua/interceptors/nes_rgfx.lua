package.path = package.path .. ";" .. debug.getinfo(1, "S").source:sub(2):match("(.*/)") .. "?.lua"
local ram = require("ram")

-- Super Mario Bros (NES) RAM Map
-- Reference: https://datacrystal.tcrf.net/wiki/Super_Mario_Bros.:RAM_map
-- Disassembly: https://6502disassembly.com/nes-smb/

local cpu = manager.machine.devices[":maincpu"]
local mem = cpu.spaces["program"]

-- Helper function to read BCD score (6 digits)
-- Score layout: 0x07DD-0x07DF stores 6 BCD digits as nibbles (100000s, 10000s, 1000s, 100s, 10s, 1s)
local function get_score()
  local score = 0
  -- Read 3 bytes, each containing 2 BCD digits in nibbles
  for i = 0, 2 do
    local byte = mem:read_u8(0x07DD + i)
    local hi = (byte >> 4) & 0x0F -- Upper nibble (high digit)
    local lo = byte & 0x0F -- Lower nibble (low digit)
    score = score * 100 + hi * 10 + lo
  end
  return score
end

-- RAM monitoring map
local map = {
  -- Score - monitor the 3 bytes that store the 6-digit BCD score
  score = {
    addr_start = 0x07DD,
    addr_end = 0x07DF,
    callback = function(_, _, _)
      local score = get_score()
      _G.event("player/score", score)
    end,
  },

  -- Jump detection - player float state (0x00 = grounded, 0x01 = airborne by jumping)
  jump = {
    addr_start = 0x001D,
    callback = function(_, current, previous)
      -- Trigger event only when transitioning from grounded (0x00) to jumping (0x01)
      -- Ignore landing transitions (0x01->0x00) and other state changes
      if (previous == 0x00 or previous == nil) and current == 0x01 then
        _G.event("player/jump", "1")
      end
    end,
  },

  -- Coin pickup - sound effect register 2 (0x01 = coin sound)
  coin_pickup = {
    addr_start = 0x00FE,
    callback = function(_, current, _)
      if current == 0x01 then
        _G.event("player/coin", "1")
      end
    end,
  },

  -- Music track - area music register
  music_track = {
    addr_start = 0x00FB,
    callback = function(_, current, _)
      _G.event("game/music", current)
    end,
  },

  -- Fireball - counter increments when Mario shoots a fireball
  fireball = {
    addr_start = 0x06CE,
    callback = function(_, current, previous)
      -- Trigger event when counter increments (fireball shot)
      if previous and current > previous then
        _G.event("player/fireball", "1")
      end
    end,
  },
}

-- Install all RAM monitors
for name, config in pairs(map) do
  ram.install_ram_monitor({
    mem = cpu.spaces["program"],
    start_addr = config.addr_start,
    end_addr = config.addr_end,
    name = name,
    callback = config.callback,
    size = config.size,
  })
end
