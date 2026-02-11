-- MAME Lua API type definitions for lua-language-server
-- This file is not executed, it only provides type hints

---@meta

---@class MameManager
---@field machine MameMachine
manager = {}

---@class MameMachine
---@field devices table<string, MameDevice>
---@field ioport MameIoport
---@field video MameVideo

---@class MameVideo
---@field snapshot_size fun(self: MameVideo): integer, integer
---@field snapshot_pixels fun(self: MameVideo): string|nil

---@class MameDevice
---@field spaces table<string, MameMemorySpace>

---@class MameMemorySpace
---@field read_u8 fun(self: MameMemorySpace, addr: integer): integer
---@field read_u16 fun(self: MameMemorySpace, addr: integer): integer
---@field read_u32 fun(self: MameMemorySpace, addr: integer): integer
---@field write_u8 fun(self: MameMemorySpace, addr: integer, value: integer)
---@field write_u16 fun(self: MameMemorySpace, addr: integer, value: integer)
---@field write_u32 fun(self: MameMemorySpace, addr: integer, value: integer)

---@class MameIoport
---@field ports table<string, MameIoportPort>

---@class MameIoportPort
---@field read fun(self: MameIoportPort): integer

---@class MameEmu
emu = {}

---@param callback fun()
---@param name? string
function emu.register_frame_done(callback, name) end

---@param callback fun()
---@param name string
function emu.register_frame(callback, name) end

---@param callback fun()
---@param name string
function emu.register_periodic(callback, name) end

-- RGFX globals injected by rgfx.lua
_G.event = function(topic, value) end
_G.game_name = ""
