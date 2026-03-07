-- Luacheck configuration for MAME Lua scripts

-- MAME provides these globals
globals = {
    "emu",
    "manager",
    "json",
}

-- Modules loaded via require
read_globals = {
    "event",
    "event_cleanup",
}

-- Max line length
max_line_length = 150

-- Ignore specific warnings
ignore = {
    "542",  -- empty if branch (sometimes intentional for clarity)
}
