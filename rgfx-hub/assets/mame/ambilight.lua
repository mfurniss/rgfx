-- Ambilight Screen Edge Sampling Module
-- Samples screen edges clockwise from bottom-left: left, top, right, bottom

local M = {}

local floor = math.floor
local concat = table.concat
local byte = string.byte

local config = {
	zones = 16,
	depth = 16,
	event_interval = 4,  -- average N frames, then emit event
	brightness = 0.5,      -- 0-1, scales RGB output
}

local initialized = false
local last_payload = ""
local accum_count = 0    -- frames accumulated

-- Hex lookup for 8-bit to 4-bit conversion
local HEX = {}
for i = 0, 255 do
	HEX[i] = string.format("%X", floor(i / 16))
end

-- Brightness-applied hex LUT: BRIGHT_HEX[v] = HEX[floor(v * brightness)]
-- Built at init time after brightness is known
local BRIGHT_HEX = {}

-- Cached config values (set at init)
local zones, depth, event_interval

-- Flat accumulator arrays: 4 edges * zones entries each
-- Indices 1..zones=left, zones+1..2*zones=top, 2*zones+1..3*zones=right, 3*zones+1..4*zones=bottom
local acc_r, acc_g, acc_b = {}, {}, {}

-- Per-frame zone work buffers (reused, never reallocated)
local zr, zg, zb, zn = {}, {}, {}, {}

-- Pre-allocated output tables (reused each emit)
local parts = {}
local payloads = {}

-- Zone maps: pixel position -> zone index (1-based)
-- Rebuilt only when screen dimensions change
local vt_zone = {}   -- [y] -> zone for vertical edges (left/right)
local hz_zone = {}   -- [x] -> zone for horizontal edges (top/bottom)
local cached_w, cached_h = 0, 0

-- Build zone maps for current dimensions
local function rebuild_zone_maps(w, h)
	-- Vertical edges: map each row (0-based y) to zone 1..zones
	-- Left edge traverses bottom-to-top, so y=height-1 is zone 1
	-- We store the "forward" zone (top-to-bottom), caller reverses for left edge
	for y = 0, h - 1 do
		vt_zone[y] = floor(y * zones / h) + 1
	end
	-- Horizontal edges: map each column (0-based x) to zone 1..zones
	for x = 0, w - 1 do
		hz_zone[x] = floor(x * zones / w) + 1
	end
	cached_w, cached_h = w, h
end

local function on_frame()
	local video = manager.machine.video
	if not video then return end

	local width, height = video:snapshot_size()
	local pixels = video:snapshot_pixels()
	if not pixels or width == 0 or height == 0 then return end

	-- Rebuild zone maps if dimensions changed
	if width ~= cached_w or height ~= cached_h then
		rebuild_zone_maps(width, height)
	end

	local total = zones * 4

	-- Zero per-frame work buffers
	for i = 1, total do
		zr[i] = 0; zg[i] = 0; zb[i] = 0; zn[i] = 0
	end

	local row_stride = width * 4
	local dep = depth

	-- Edge offsets into the flat zone arrays
	local left_off = 0          -- zones 1..zones
	local top_off = zones       -- zones+1..2*zones
	local right_off = zones * 2 -- 2*zones+1..3*zones
	local bottom_off = zones * 3 -- 3*zones+1..4*zones

	-- LEFT edge: bottom-to-top (y from height-1 down to 0), depth pixels from left
	-- Zone mapping is reversed: y=height-1 maps to zone 1
	for y = 0, height - 1 do
		local z = left_off + vt_zone[height - 1 - y]
		local row_base = y * row_stride + 1
		for x = 0, dep - 1 do
			local off = row_base + x * 4
			local b, g, r = byte(pixels, off, off + 2)
			zr[z] = zr[z] + (r or 0)
			zg[z] = zg[z] + (g or 0)
			zb[z] = zb[z] + (b or 0)
			zn[z] = zn[z] + 1
		end
	end

	-- TOP edge: left-to-right (x from 0 to width-1), depth pixels from top
	for x = 0, width - 1 do
		local z = top_off + hz_zone[x]
		for y = 0, dep - 1 do
			local off = y * row_stride + x * 4 + 1
			local b, g, r = byte(pixels, off, off + 2)
			zr[z] = zr[z] + (r or 0)
			zg[z] = zg[z] + (g or 0)
			zb[z] = zb[z] + (b or 0)
			zn[z] = zn[z] + 1
		end
	end

	-- RIGHT edge: top-to-bottom (y from 0 to height-1), depth pixels from right
	local right_x_start = width - dep
	for y = 0, height - 1 do
		local z = right_off + vt_zone[y]
		local row_base = y * row_stride + 1
		for x = right_x_start, width - 1 do
			local off = row_base + x * 4
			local b, g, r = byte(pixels, off, off + 2)
			zr[z] = zr[z] + (r or 0)
			zg[z] = zg[z] + (g or 0)
			zb[z] = zb[z] + (b or 0)
			zn[z] = zn[z] + 1
		end
	end

	-- BOTTOM edge: right-to-left (x from width-1 down to 0), depth pixels from bottom
	-- Zone mapping is reversed: x=width-1 maps to zone 1
	local bottom_y_start = height - dep
	for x = 0, width - 1 do
		local z = bottom_off + hz_zone[width - 1 - x]
		for y = bottom_y_start, height - 1 do
			local off = y * row_stride + x * 4 + 1
			local b, g, r = byte(pixels, off, off + 2)
			zr[z] = zr[z] + (r or 0)
			zg[z] = zg[z] + (g or 0)
			zb[z] = zb[z] + (b or 0)
			zn[z] = zn[z] + 1
		end
	end

	-- Average each zone and accumulate into cross-frame accumulator
	for i = 1, total do
		local n = zn[i]
		if n > 0 then
			acc_r[i] = acc_r[i] + floor(zr[i] / n)
			acc_g[i] = acc_g[i] + floor(zg[i] / n)
			acc_b[i] = acc_b[i] + floor(zb[i] / n)
		end
	end
	accum_count = accum_count + 1

	-- Emit when interval reached
	if accum_count >= event_interval then
		local cnt = accum_count

		-- Build payloads for each edge
		for e = 0, 3 do
			local base = e * zones
			for j = 1, zones do
				local idx = base + j
				parts[j] = BRIGHT_HEX[floor(acc_r[idx] / cnt)]
					.. BRIGHT_HEX[floor(acc_g[idx] / cnt)]
					.. BRIGHT_HEX[floor(acc_b[idx] / cnt)]
				-- Reset accumulator in place
				acc_r[idx] = 0; acc_g[idx] = 0; acc_b[idx] = 0
			end
			payloads[e + 1] = concat(parts, ",")
		end
		accum_count = 0

		local combined = concat(payloads, "|")
		if combined ~= last_payload then
			last_payload = combined
			_G.event("rgfx/ambilight/frame", combined)
		end
	end
end

function M.init(opts)
	if initialized then return end

	if opts then
		if opts.zones then config.zones = opts.zones end
		if opts.depth then config.depth = opts.depth end
		if opts.event_interval then config.event_interval = opts.event_interval end
		if opts.brightness then config.brightness = opts.brightness end
	end

	-- Cache config as upvalue locals for hot path
	zones = config.zones
	depth = config.depth
	event_interval = config.event_interval

	-- Build brightness-applied hex LUT
	local bright = config.brightness
	for i = 0, 255 do
		BRIGHT_HEX[i] = HEX[floor(i * bright)]
	end

	-- Pre-size flat accumulator arrays
	local total = zones * 4
	for i = 1, total do
		acc_r[i] = 0; acc_g[i] = 0; acc_b[i] = 0
		zr[i] = 0; zg[i] = 0; zb[i] = 0; zn[i] = 0
	end

	-- Pre-size output tables
	for i = 1, zones do parts[i] = "" end
	for i = 1, 4 do payloads[i] = "" end

	print(string.format("Ambilight: zones=%d, depth=%d, interval=%d, brightness=%.2f",
		zones, depth, event_interval, bright))

	emu.register_frame_done(on_frame)
	initialized = true
end

return M
