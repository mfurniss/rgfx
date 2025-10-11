print(emu.app_name() .. " " .. emu.app_version())

for tag, screen in pairs(manager.machine.screens) do print(tag) end

local s = manager.machine.screens[':screen']
print(s.width .. 'x' .. s.height)

for tag, device in pairs(manager.machine.devices) do print(tag) end
