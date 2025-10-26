-- Luacheck configuration for RGFX MAME Lua scripts
-- https://luacheck.readthedocs.io/

-- MAME provides these globals, and event.lua defines event functions globally
globals = {
	"manager",
	"emu",
	"_G",
	"event",           -- Defined in event.lua
	"event_cleanup",   -- Defined in event.lua
	"event_file",      -- Defined in event.lua
}

-- Allow defining global variables (MAME scripts use _G.event, etc.)
allow_defined = true

-- Don't report unused arguments starting with underscore
unused_args = false

-- Disable line length warnings (we use StyLua for formatting)
max_line_length = false

-- Standard Lua 5.4
std = "lua54"
