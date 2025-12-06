-- MAME Lua API type definitions for lua-language-server
-- This file is not executed, it only provides type hints

---@meta

---@class MameManager
---@field machine MameMachine
manager = {}

---@class MameMachine
---@field devices table<string, MameDevice>

---@class MameDevice
---@field spaces table<string, MameMemorySpace>

---@class MameMemorySpace
---@field read_u8 fun(self: MameMemorySpace, addr: integer): integer
---@field read_u16 fun(self: MameMemorySpace, addr: integer): integer
---@field read_u32 fun(self: MameMemorySpace, addr: integer): integer
---@field write_u8 fun(self: MameMemorySpace, addr: integer, value: integer)
---@field write_u16 fun(self: MameMemorySpace, addr: integer, value: integer)
---@field write_u32 fun(self: MameMemorySpace, addr: integer, value: integer)

-- RGFX globals injected by rgfx.lua
_G.event = function(topic, value) end
_G.game_name = ""
