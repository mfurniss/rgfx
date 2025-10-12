print(emu.app_name() .. " " .. emu.app_version())

for tag, screen in pairs(manager.machine.screens) do print(tag) end

local s = manager.machine.screens[':screen']
print(s.width .. 'x' .. s.height)

for tag, device in pairs(manager.machine.devices) do print(tag) end

local cpu = manager.machine.devices[':maincpu']
-- local mem = cpu.spaces['program']
-- print(mem:read_i8(0xc000))




local function decode_bcd_score(byte1, byte2, byte3)
    -- Extract nibbles (4-bit halves) from each byte using math operations
    local digit1 = math.floor(byte3 / 16)      -- High nibble of byte3
    local digit2 = byte3 % 16                   -- Low nibble of byte3
    local digit3 = math.floor(byte2 / 16)      -- High nibble of byte2
    local digit4 = byte2 % 16                   -- Low nibble of byte2
    local digit5 = math.floor(byte1 / 16)      -- High nibble of byte1
    local digit6 = byte1 % 16                   -- Low nibble of byte1
    
    -- Calculate the full score
    local score = digit1 * 100000 + 
                  digit2 * 10000 + 
                  digit3 * 1000 + 
                  digit4 * 100 + 
                  digit5 * 10 + 
                  digit6
    
    return score
end

local function get_player1_score()
    -- Read 3 bytes from Player 1 score addresses
    local byte1 = memory.readbyte(0x4E80)
    local byte2 = memory.readbyte(0x4E81)
    local byte3 = memory.readbyte(0x4E82)
    
    return decode_bcd_score(byte1, byte2, byte3)
end





-- emu.register_periodic(1.0, function()
--     print("This runs every second")
-- end)

-- Enumerate screens (most games have one with tag ':screen')
for tag, screen in pairs(manager.machine.screens) do
    print("Screen tag:", tag)
    print("Refresh rate (Hz):", screen.refresh)
    break
end

local screen = manager.machine.screens[':screen']
-- local screen = manager:machine().screens:first()
print(screen)
local fps = 1 / screen.refresh
print(fps)
-- local counter = 0

local counter = 0
emu.register_frame_done(function()
    counter = counter + 10
    if counter >= screen.refresh then
        print("Every second")
        counter = 0

local cpu = manager.machine.devices[":maincpu"]
local mem = cpu.spaces["program"]


  print(
        string.format("RAM: 0x4C00=0x%02X, 0x4D00=0x%02X",
            mem:read_u8(0x4C00),
            mem:read_u8(0x4D00)
        )
    )


    -- 0x4E80-0x4E82

local score = 0
for i = 3, 0, -1 do  -- Read backwards: 3, 2, 1, 0
    local byte = mem:read_u8(0x4E80 + i)
    print(byte)
    local hi = math.floor(byte / 16)
    local lo = byte % 16
    score = score * 100 + hi * 10 + lo
end
print("Player 1 Score:", score)

local score1 = decode_bcd_score(0x80, 0x45, 0x02)
print(string.format("Bytes: 0x80, 0x45, 0x02 = Score: %d", score1))

    end
end)


-- local function update()
--   print('update')
--     -- Pac-Man score starts at memory address 0x1278 (BCD encoded)
-- local mem = manager.machine.devices[":maincpu"].spaces["program"]
-- local score_low = mem:read_u8(0x1278) or 0
-- local score_mid = mem:read_u8(0x1279) or 0
-- local score_high = mem:read_u8(0x127A) or 0   
--     -- Convert BCD to decimal
--     local score = (tonumber(string.format("%X", score_high)) * 10000 +
--                   tonumber(string.format("%X", score_mid)) * 100 +
--                   tonumber(string.format("%X", score_low)))
--     manager.machine:popmessage("Score: " .. score)
-- end

-- -- Run every 30 frames (~0.5 seconds)
-- -- emu.register_frame_done(update, "60")
-- emu.register_periodic(1, update)


-- emu.register_periodic(1.0, function()
--     print("This runs every second")
-- end)