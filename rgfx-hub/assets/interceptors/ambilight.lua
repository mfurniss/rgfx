-- This Source Code Form is subject to the terms of the Mozilla Public
-- License, v. 2.0. If a copy of the MPL was not distributed with this
-- file, You can obtain one at http://mozilla.org/MPL/2.0/.
--
-- Copyright (c) 2025 Matt Furniss <furniss@gmail.com>

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
local accumulator = {}   -- running sum per zone
local accum_count = 0    -- frames accumulated

-- Hex lookup for 8-bit to 4-bit conversion
local HEX = {}
for i = 0, 255 do
	HEX[i] = string.format("%X", floor(i / 16))
end

-- Get pixel at (x, y) from MAME snapshot buffer
-- MAME uses row-major BGRA format, y=0 at top
local function get_pixel(pixels, width, x, y)
	local offset = y * width * 4 + x * 4 + 1
	local b, g, r = byte(pixels, offset, offset + 2)
	return r or 0, g or 0, b or 0
end

-- Sample an edge and return array of {r, g, b} colors
-- edge: "left", "right", "top", "bottom"
-- Returns colors in clockwise order from bottom-left start
local function sample_edge(pixels, width, height, edge)
	local colors = {}
	local depth = config.depth

	if edge == "left" then
		-- Bottom to top (y from height-1 down to 0)
		for y = height - 1, 0, -1 do
			local r_sum, g_sum, b_sum, count = 0, 0, 0, 0
			for x = 0, depth - 1 do
				local r, g, b = get_pixel(pixels, width, x, y)
				r_sum, g_sum, b_sum = r_sum + r, g_sum + g, b_sum + b
				count = count + 1
			end
			colors[#colors + 1] = {
				r = floor(r_sum / count),
				g = floor(g_sum / count),
				b = floor(b_sum / count)
			}
		end
	elseif edge == "top" then
		-- Left to right (x from 0 to width-1)
		for x = 0, width - 1 do
			local r_sum, g_sum, b_sum, count = 0, 0, 0, 0
			for y = 0, depth - 1 do
				local r, g, b = get_pixel(pixels, width, x, y)
				r_sum, g_sum, b_sum = r_sum + r, g_sum + g, b_sum + b
				count = count + 1
			end
			colors[#colors + 1] = {
				r = floor(r_sum / count),
				g = floor(g_sum / count),
				b = floor(b_sum / count)
			}
		end
	elseif edge == "right" then
		-- Top to bottom (y from 0 to height-1)
		for y = 0, height - 1 do
			local r_sum, g_sum, b_sum, count = 0, 0, 0, 0
			for x = width - depth, width - 1 do
				local r, g, b = get_pixel(pixels, width, x, y)
				r_sum, g_sum, b_sum = r_sum + r, g_sum + g, b_sum + b
				count = count + 1
			end
			colors[#colors + 1] = {
				r = floor(r_sum / count),
				g = floor(g_sum / count),
				b = floor(b_sum / count)
			}
		end
	elseif edge == "bottom" then
		-- Right to left (x from width-1 down to 0)
		for x = width - 1, 0, -1 do
			local r_sum, g_sum, b_sum, count = 0, 0, 0, 0
			for y = height - depth, height - 1 do
				local r, g, b = get_pixel(pixels, width, x, y)
				r_sum, g_sum, b_sum = r_sum + r, g_sum + g, b_sum + b
				count = count + 1
			end
			colors[#colors + 1] = {
				r = floor(r_sum / count),
				g = floor(g_sum / count),
				b = floor(b_sum / count)
			}
		end
	end

	return colors
end

-- Downsample colors array to target count
local function downsample(colors, target_count)
	local result = {}
	local src_len = #colors

	for i = 1, target_count do
		local start_idx = floor((i - 1) * src_len / target_count) + 1
		local end_idx = floor(i * src_len / target_count)

		local r_sum, g_sum, b_sum, count = 0, 0, 0, 0
		for j = start_idx, end_idx do
			local c = colors[j]
			if c then
				r_sum = r_sum + c.r
				g_sum = g_sum + c.g
				b_sum = b_sum + c.b
				count = count + 1
			end
		end

		if count > 0 then
			result[i] = {
				r = floor(r_sum / count),
				g = floor(g_sum / count),
				b = floor(b_sum / count)
			}
		else
			result[i] = { r = 0, g = 0, b = 0 }
		end
	end

	return result
end

-- Convert colors to hex payload string with brightness applied
local function to_payload(colors)
	local parts = {}
	local bright = config.brightness
	for i, c in ipairs(colors) do
		parts[i] = HEX[floor(c.r * bright)] .. HEX[floor(c.g * bright)] .. HEX[floor(c.b * bright)]
	end
	return concat(parts, ",")
end

local function on_frame()
	local video = manager.machine.video
	if not video then return end

	local width, height = video:snapshot_size()
	local pixels = video:snapshot_pixels()
	if not pixels or width == 0 or height == 0 then return end

	-- Sample all 4 edges clockwise from bottom-left
	local edges = { "left", "top", "right", "bottom" }
	local all_colors = {}

	for _, edge in ipairs(edges) do
		local colors = sample_edge(pixels, width, height, edge)
		local downsampled = downsample(colors, config.zones)
		for _, c in ipairs(downsampled) do
			all_colors[#all_colors + 1] = c
		end
	end

	-- Accumulate colors
	for i, c in ipairs(all_colors) do
		if not accumulator[i] then
			accumulator[i] = { r = 0, g = 0, b = 0 }
		end
		accumulator[i].r = accumulator[i].r + c.r
		accumulator[i].g = accumulator[i].g + c.g
		accumulator[i].b = accumulator[i].b + c.b
	end
	accum_count = accum_count + 1

	-- Emit when interval reached
	if accum_count >= config.event_interval then
		local averaged = {}
		for i, acc in ipairs(accumulator) do
			averaged[i] = {
				r = floor(acc.r / accum_count),
				g = floor(acc.g / accum_count),
				b = floor(acc.b / accum_count)
			}
			accumulator[i] = { r = 0, g = 0, b = 0 }
		end
		accum_count = 0

		-- Build payloads
		local payloads = {}
		for i = 0, 3 do
			local edge_colors = {}
			for j = 1, config.zones do
				edge_colors[j] = averaged[i * config.zones + j]
			end
			payloads[#payloads + 1] = to_payload(edge_colors)
		end

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

	print(string.format("Ambilight: zones=%d, depth=%d, interval=%d, brightness=%.2f",
		config.zones, config.depth, config.event_interval, config.brightness))

	emu.register_frame_done(on_frame)
	initialized = true
end

return M
