-- Optional: Enable FFT audio analysis for visual effects
-- local fft = require("fft")
-- fft.init({
-- 	emit_events = true,
-- 	log_bars = false,
-- 	fps = 15,
-- 	boot_delay = 3,
--   devices = { "ymsnd" },
-- })

_G.boot_delay(6)

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

-- Shot counter at 0x3000C3 (increments by 1 each time player fires during gameplay)
-- Enemy explosion sound trigger at 0x2ff02c bit 0x80 (TRIRAM shared scratch)
local SHOT_COUNTER_ADDR = 0x3000C3
local prev_shots = 0
local prev_explosion = 0

emu.register_frame_done(function()
	local shots = c117_mem:read_u8(SHOT_COUNTER_ADDR)
	if shots > prev_shots then
		_G.event("galaga88/player/fire", shots)
	end
	prev_shots = shots

	local explosion = c117_mem:read_u8(0x2ff02c)
	if (explosion & 0x80) ~= 0 and (prev_explosion & 0x80) == 0 then
		_G.event("galaga88/enemy/destroy")
	end
	prev_explosion = explosion
end, "galaga88_sound")

-- Text detection across all 6 C123 tilemap layers using byte-level search
-- Tile code is the odd byte of each 2-byte tile entry
-- Screen is rotated 90°: horizontal text = vertical column in VRAM
-- Stride = row_width * 2 bytes (row-major storage, TILEMAP_SCAN_ROWS)
local VRAM_LAYERS = {
	{ base = 0x2f7010, bytes = 36 * 28 * 2, stride = 0x48 },  -- fixed F4
	{ base = 0x2f7810, bytes = 36 * 28 * 2, stride = 0x48 },  -- fixed F5
	{ base = 0x2f0000, bytes = 64 * 64 * 2, stride = 0x80 },  -- scroll 0
	{ base = 0x2f2000, bytes = 64 * 64 * 2, stride = 0x80 },  -- scroll 1
	{ base = 0x2f4000, bytes = 64 * 64 * 2, stride = 0x80 },  -- scroll 2
	{ base = 0x2f6000, bytes = 64 * 32 * 2, stride = 0x80 },  -- scroll 3 (half-height)
}

-- Convert character to masked tile code (& 0x3F) for multi-font-bank matching
local function char_to_mask(ch)
	local b = string.byte(ch)
	if b >= 0x41 and b <= 0x5A then return (0xA1 + b - 0x41) & 0x3F end
	if b >= 0x30 and b <= 0x39 then return (0x90 + b - 0x30) & 0x3F end
	if b == 0x21 then return 0x81 & 0x3F end
	return nil  -- space, hyphen → skip position
end

local watches = {}

local function watch_text(str)
	local masks = {}
	for i = 1, #str do
		masks[i] = char_to_mask(str:sub(i, i))
	end
	local text = str:gsub("%s+", " ")
	watches[#watches + 1] = { text = text, masks = masks, len = #str, m1 = masks[1], prev = false, gone = 0 }
end

-- Pre-allocated tables reused every frame (zero GC pressure in hot path)
local tiles = {}
local lut = {}
local lut_n = {}
for m = 0, 63 do
	lut[m] = {}
	lut_n[m] = 0
end

local function search_layer(num_tiles, arr_stride, w)
	local masks = w.masks
	local len = w.len
	local span = (len - 1) * arr_stride
	local num_cands = lut_n[w.m1]
	if num_cands == 0 then return false end
	local candidates = lut[w.m1]

	for ci = 1, num_cands do
		local start = candidates[ci]

		-- Backward direction
		if start >= span then
			local ok = true
			for j = 2, len do
				local mj = masks[j]
				if mj and (tiles[start - arr_stride * (j - 1)] & 0x3F) ~= mj then
					ok = false; break
				end
			end
			if ok then return true end
		end

		-- Forward direction
		if start + span < num_tiles then
			local ok = true
			for j = 2, len do
				local mj = masks[j]
				if mj and (tiles[start + arr_stride * (j - 1)] & 0x3F) ~= mj then
					ok = false; break
				end
			end
			if ok then return true end
		end
	end

	return false
end

watch_text("READY")
-- watch_text("STAGE")
-- watch_text("DIMENSION")
watch_text("GAME  OVER")
watch_text("INSERT COIN")
-- watch_text("SCORE")
watch_text("SELECT MODE")
watch_text("START!")
watch_text("FIGHTER CAPTURED")
watch_text("GALACTIC DANCIN")
watch_text("PERFECT")
-- watch_text("NUMBER OF HITS")
-- watch_text("SPECIAL BONUS")
watch_text("DIMENSION WARP")
-- watch_text("SHOTS FIRED")
-- watch_text("HITS-MISS RATIO")

local layer_idx = 0
local num_layers = #VRAM_LAYERS
local last_emitted = nil

emu.register_frame_done(function()
	layer_idx = layer_idx % num_layers + 1
	local layer = VRAM_LAYERS[layer_idx]
	local base = layer.base
	local num_tiles = layer.bytes / 2
	local arr_stride = layer.stride / 2
	local read = c117_mem.read_u8

	-- Reset LUT counts (no table allocation)
	for m = 0, 63 do lut_n[m] = 0 end

	for i = 0, num_tiles - 1 do
		local raw = read(c117_mem, base + i * 2 + 1)
		tiles[i] = raw
		local m = raw & 0x3F
		local c = lut_n[m] + 1
		lut_n[m] = c
		lut[m][c] = i
	end

	for _, w in ipairs(watches) do
		if search_layer(num_tiles, arr_stride, w) then
			if not w.prev and w.text ~= last_emitted then
				_G.event("galaga88/screen/text", w.text)
				last_emitted = w.text
			end
			w.prev = true
			w.gone = 0
		else
			w.gone = w.gone + 1
			if w.gone >= num_layers then
				w.prev = false
			end
		end
	end
end, "text_detect")

