-- MAME Lua API type definitions for lua-language-server
-- This file is not executed, it only provides type hints

---@meta

---@class MameEmu
---@field app_name fun(): string
---@field app_version fun(): string
---@field romname fun(): string
---@field register_prestart fun(callback: function)
---@field add_machine_frame_notifier fun(callback: function)
---@field add_machine_stop_notifier fun(callback: function)
emu = {}

---@class MameManager
---@field machine MameMachine
manager = {}

---@class MameMachine
---@field devices table<string, MameDevice>
---@field images table<string, MameImage>
---@field screens table<string, MameScreen>

---@class MameDevice
---@field spaces table<string, MameMemorySpace>

---@class MameImage
---@field exists boolean
---@field filename string|nil

---@class MameScreen
---@field width integer
---@field height integer
---@field refresh number

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
