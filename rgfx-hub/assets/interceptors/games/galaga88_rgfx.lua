-- Optional: Enable FFT audio analysis for visual effects
local fft = require("fft")
fft.init({
	emit_events = true,
	log_bars = false,
	fps = 15,
	boot_delay = 3,
  devices = { "ymsnd" },
})

boot_delay(6)

-- Access RAM via C117's program space (not maincpu which goes through bank switching)
local c117 = manager.machine.devices[":c117"]
local c117_mem = c117.spaces["program"]

-- Score at virtual address 0x300a14 in C117's address space
-- Format: unpacked BCD, 6 digits
local SCORE_ADDR = 0x300a14

local function read_score()
	local b0 = c117_mem:read_u8(SCORE_ADDR)     -- hundred-thousands
	local b1 = c117_mem:read_u8(SCORE_ADDR + 1) -- ten-thousands
	local b2 = c117_mem:read_u8(SCORE_ADDR + 2) -- thousands
	local b3 = c117_mem:read_u8(SCORE_ADDR + 3) -- hundreds
	local b4 = c117_mem:read_u8(SCORE_ADDR + 4) -- tens
	local b5 = c117_mem:read_u8(SCORE_ADDR + 5) -- ones
	return b0 * 100000 + b1 * 10000 + b2 * 1000 + b3 * 100 + b4 * 10 + b5
end

-- Score delta to enemy type lookup
local SCORE_LUT = {
	[50]   = "zako",          -- zako in formation
	[80]   = "goei",          -- goei in formation
	[100]  = "zako",          -- zako attacking
	[150]  = "boss",          -- boss in formation
	[160]  = "goei",          -- goei attacking
	[200]  = "don",           -- don attacking
	[400]  = "boss",          -- boss attacking solo
	[600]  = "hiyoko",        -- formation escort (4 hits)
	[800]  = "boss-convoy",   -- boss + 1 escort
	[900]  = "pan",
	[1000] = "pan",
	[1100] = "pan",
	[1200] = "daruma",        -- formation escort (4 hits)
	[1300] = "pan",
	[1400] = "pan",
	[1600] = "kan",
	[1800] = "kan",
	[2000] = "babito",        -- formation escort (4 hits)
	[2200] = "kan",
}

-- Monitor score changes
local last_score = -1

emu.register_frame_done(function()
	local score = read_score()
	if score ~= last_score then
		if last_score >= 0 and score > last_score then
			local delta = score - last_score
			local enemy = SCORE_LUT[delta]
			if enemy then
				_G.event("galaga88/enemy/destroy/" .. enemy, delta)
			end
		end
		_G.event("galaga88/player/score/p1", score)
		last_score = score
	end
end)

-- Sound command addresses discovered via research:
-- 0x2ff027: Player fire (bit 0x10 = fire sound)
-- 0x2ff02c: Enemy explosion (bit 0x80 = explosion)
-- 0x2ff026: Various sounds (0x01, 0x02, 0x10 = different effects)

local prev_fire = 0
local prev_explosion = 0
local prev_sound = 0

emu.register_frame_done(function()
	-- Player fire detection (0x2ff027 bit 0x10)
	local fire = c117_mem:read_u8(0x2ff027)
	if (fire & 0x10) ~= 0 and (prev_fire & 0x10) == 0 then
		_G.event("galaga88/player/fire")
	end
	prev_fire = fire

	-- Enemy explosion detection (0x2ff02c bit 0x80)
	local explosion = c117_mem:read_u8(0x2ff02c)
	if (explosion & 0x80) ~= 0 and (prev_explosion & 0x80) == 0 then
		_G.event("galaga88/enemy/destroy")
	end
	prev_explosion = explosion

	-- Other sound effects (0x2ff026)
	-- Note: bit 0x10 is fire input, not a sound effect
	-- local sound = c117_mem:read_u8(0x2ff026)
	-- if sound ~= prev_sound then
	-- 	if (sound & 0x80) ~= 0 and (prev_sound & 0x80) == 0 then
	-- 		print("EVENT: galaga88/sound/music_start")
	-- 		_G.event("galaga88/sound/music_start")
	-- 	end
	-- 	if (sound & 0x02) ~= 0 and (prev_sound & 0x02) == 0 then
	-- 		print("EVENT: galaga88/sound/effect 2")
	-- 		_G.event("galaga88/sound/effect", 2)
	-- 	end
	-- 	if (sound & 0x01) ~= 0 and (prev_sound & 0x01) == 0 then
	-- 		print("EVENT: galaga88/sound/effect 3")
	-- 		_G.event("galaga88/sound/effect", 3)
	-- 	end
	-- end
	-- prev_sound = sound
end, "galaga88_sound")


