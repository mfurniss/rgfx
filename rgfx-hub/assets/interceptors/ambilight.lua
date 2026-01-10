-- This Source Code Form is subject to the terms of the Mozilla Public
-- License, v. 2.0. If a copy of the MPL was not distributed with this
-- file, You can obtain one at http://mozilla.org/MPL/2.0/.
--
-- Copyright (c) 2025 Matt Furniss <furniss@gmail.com>

-- Ambilight Screen Edge Sampling Module
-- Captures screen edge colors and emits them as events for LED ambient lighting
--
-- Usage:
--   local ambilight = require("ambilight")
--   ambilight.init({ edges = { "top", "bottom" }, zones_per_edge = 10, inset = 8 })
--
-- Options:
--   edges           - Array of edges to process: "top", "bottom", "left", "right" (default: all)
--   zones_per_edge  - Number of color zones per edge (default: 10)
--   sample_depth    - Pixels to sample inward from edge (default: 8)
--   inset           - Pixel offset from screen edge (default: 0)
--   frame_skip      - Frames to skip between samples (default: 5, ~10fps at 60fps)
--   smoothing_frames - Frames to average for temporal smoothing (default: 8)

local M = {}

--------------------------------------------------------------------------------
-- Upvalue caching for hot path
--------------------------------------------------------------------------------
local floor = math.floor
local concat = table.concat
local byte = string.byte

-- Configuration
local config = {
	edges = { "top", "bottom", "left", "right" },
	zones_per_edge = 10,
	sample_depth = 8,
	inset = 0,
	frame_skip = 5,        -- ~10fps at 60fps source
	smoothing_frames = 8,  -- Average over 8 samples for smoother output
}

-- State
local initialized = false
local frame_count = 0
local smoothing_buffer = {} -- [edge][zone][frame_idx] = {r, g, b}
local edge_set = {} -- Quick lookup for enabled edges

--------------------------------------------------------------------------------
-- Pre-computed LUTs (built at init time)
--------------------------------------------------------------------------------

-- LUT: 8-bit value (0-255) -> hex nibble char ('0'-'F')
local HEX_NIBBLE = {}
for i = 0, 255 do
	HEX_NIBBLE[i] = string.format("%X", floor(i / 16))
end

-- Pre-built topic strings per edge (avoids concat in hot path)
local EDGE_TOPICS = {}

-- Reusable tables to avoid allocations in hot path
local zone_colors = {}      -- Reused for payload building
local smoothed_zones = {}   -- Reused for smoothing output

-- Pre-computed zone boundaries per edge (computed once when dimensions known)
local zone_bounds = nil     -- { edge = { {x1,y1,x2,y2}, ... } }
local cached_width = 0
local cached_height = 0

--------------------------------------------------------------------------------
-- Build zone boundaries for all edges (called once when dimensions change)
--------------------------------------------------------------------------------
local function build_zone_bounds(width, height)
	if width == cached_width and height == cached_height and zone_bounds then
		return
	end

	cached_width = width
	cached_height = height
	zone_bounds = {}

	local num_zones = config.zones_per_edge
	local depth = config.sample_depth
	local inset = config.inset

	-- Top edge
	zone_bounds["top"] = {}
	local zone_width = floor((width - 2 * inset) / num_zones)
	for i = 1, num_zones do
		local x1 = inset + (i - 1) * zone_width
		zone_bounds["top"][i] = {
			x1 = x1,
			y1 = inset,
			x2 = x1 + zone_width - 1,
			y2 = inset + depth - 1
		}
	end

	-- Bottom edge
	zone_bounds["bottom"] = {}
	for i = 1, num_zones do
		local x1 = inset + (i - 1) * zone_width
		zone_bounds["bottom"][i] = {
			x1 = x1,
			y1 = height - inset - depth,
			x2 = x1 + zone_width - 1,
			y2 = height - inset - 1
		}
	end

	-- Left edge
	zone_bounds["left"] = {}
	local zone_height = floor((height - 2 * inset) / num_zones)
	for i = 1, num_zones do
		local y1 = inset + (i - 1) * zone_height
		zone_bounds["left"][i] = {
			x1 = inset,
			y1 = y1,
			x2 = inset + depth - 1,
			y2 = y1 + zone_height - 1
		}
	end

	-- Right edge
	zone_bounds["right"] = {}
	for i = 1, num_zones do
		local y1 = inset + (i - 1) * zone_height
		zone_bounds["right"][i] = {
			x1 = width - inset - depth,
			y1 = y1,
			x2 = width - inset - 1,
			y2 = y1 + zone_height - 1
		}
	end
end

--------------------------------------------------------------------------------
-- Sample a region and return averaged RGB (inlined pixel extraction)
--------------------------------------------------------------------------------
local function sample_region_inline(pixels, width, x1, y1, x2, y2)
	local r_sum, g_sum, b_sum = 0, 0, 0
	local count = 0

	for y = y1, y2 do
		local row_base = y * width * 4 + 1  -- Pre-compute row offset
		for x = x1, x2 do
			local offset = row_base + x * 4
			-- Read B, G, R directly (little endian BGRA)
			local b, g, r = byte(pixels, offset, offset + 2)
			if b then
				r_sum = r_sum + (r or 0)
				g_sum = g_sum + (g or 0)
				b_sum = b_sum + (b or 0)
				count = count + 1
			end
		end
	end

	if count > 0 then
		return floor(r_sum / count), floor(g_sum / count), floor(b_sum / count)
	end
	return 0, 0, 0
end

--------------------------------------------------------------------------------
-- Sample one edge using pre-computed bounds
--------------------------------------------------------------------------------
local function sample_edge(pixels, width, edge)
	if not zone_bounds then
		return nil
	end
	local bounds = zone_bounds[edge]
	if not bounds then
		return nil
	end

	-- Reuse smoothed_zones table structure
	for i = 1, config.zones_per_edge do
		local b = bounds[i]
		local r, g, b_val = sample_region_inline(pixels, width, b.x1, b.y1, b.x2, b.y2)

		if not smoothed_zones[i] then
			smoothed_zones[i] = { r = 0, g = 0, b = 0 }
		end
		smoothed_zones[i].r = r
		smoothed_zones[i].g = g
		smoothed_zones[i].b = b_val
	end

	return smoothed_zones
end

--------------------------------------------------------------------------------
-- Apply temporal smoothing (reuses tables)
--------------------------------------------------------------------------------
local function apply_smoothing(edge, zones, frame_idx)
	if not smoothing_buffer[edge] then
		smoothing_buffer[edge] = {}
	end

	local num_frames = config.smoothing_frames
	local buf_idx = (frame_idx % num_frames) + 1

	for i = 1, config.zones_per_edge do
		local zone = zones[i]
		if not smoothing_buffer[edge][i] then
			smoothing_buffer[edge][i] = {}
		end

		-- Store current frame (reuse table if exists)
		if not smoothing_buffer[edge][i][buf_idx] then
			smoothing_buffer[edge][i][buf_idx] = { r = 0, g = 0, b = 0 }
		end
		smoothing_buffer[edge][i][buf_idx].r = zone.r
		smoothing_buffer[edge][i][buf_idx].g = zone.g
		smoothing_buffer[edge][i][buf_idx].b = zone.b

		-- Average all frames in buffer
		local r_sum, g_sum, b_sum = 0, 0, 0
		local count = 0
		for j = 1, num_frames do
			local f = smoothing_buffer[edge][i][j]
			if f then
				r_sum = r_sum + f.r
				g_sum = g_sum + f.g
				b_sum = b_sum + f.b
				count = count + 1
			end
		end

		-- Update zone in-place
		if count > 0 then
			zone.r = floor(r_sum / count)
			zone.g = floor(g_sum / count)
			zone.b = floor(b_sum / count)
		end
	end

	return zones
end

--------------------------------------------------------------------------------
-- Convert zone colors to payload string using LUT
--------------------------------------------------------------------------------
local function zones_to_payload(zones)
	for i = 1, config.zones_per_edge do
		local zone = zones[i]
		-- Use LUT for hex conversion (avoids format() call)
		zone_colors[i] = HEX_NIBBLE[zone.r] .. HEX_NIBBLE[zone.g] .. HEX_NIBBLE[zone.b]
	end
	return concat(zone_colors, ",", 1, config.zones_per_edge)
end

--------------------------------------------------------------------------------
-- Cached pixel access method (detected on first call)
--------------------------------------------------------------------------------
local pixel_method = nil -- "snapshot" or "disabled"

--------------------------------------------------------------------------------
-- Frame callback - sample screen and emit events
--------------------------------------------------------------------------------
local function on_frame()
	frame_count = frame_count + 1

	-- Skip frames for target FPS
	if frame_count % (config.frame_skip + 1) ~= 0 then
		return
	end

	-- Already determined no API available
	if pixel_method == "disabled" then
		return
	end

	local video = manager.machine.video
	if not video then
		return
	end

	local pixels, width, height

	-- Use cached method or detect on first call
	if pixel_method == "snapshot" then
		width, height = video:snapshot_size()
		pixels = video:snapshot_pixels()
	elseif pixel_method == nil then
		-- First call - detect available API
		local ok, w, h = pcall(function()
			return video:snapshot_size()
		end)

		if ok and w and h then
			pixel_method = "snapshot"
			width, height = w, h
			pixels = video:snapshot_pixels()
			print(string.format("Ambilight: Using snapshot_pixels API (%dx%d)", width, height))
		else
			pixel_method = "disabled"
			print("Ambilight: ERROR - No pixel access API available in this MAME version")
			return
		end
	end

	if not pixels or width == 0 or height == 0 then
		return
	end

	-- Build zone boundaries if dimensions changed
	build_zone_bounds(width, height)

	-- Process each enabled edge
	for _, edge in ipairs(config.edges) do
		if edge_set[edge] then
			local zones = sample_edge(pixels, width, edge)
			if zones then
				local smoothed = apply_smoothing(edge, zones, frame_count)
				local payload = zones_to_payload(smoothed)
				_G.event(EDGE_TOPICS[edge], payload)
			end
		end
	end
end

--------------------------------------------------------------------------------
-- Initialize ambilight processing
--------------------------------------------------------------------------------
function M.init(opts)
	if initialized then
		return
	end

	-- Apply options
	if opts then
		for k, v in pairs(opts) do
			config[k] = v
		end
	end

	-- Build edge lookup set and pre-build topic strings
	edge_set = {}
	for _, edge in ipairs(config.edges) do
		edge_set[edge] = true
		EDGE_TOPICS[edge] = "rgfx/ambilight/" .. edge
	end

	-- Pre-allocate zone_colors table
	for i = 1, config.zones_per_edge do
		zone_colors[i] = "000"
		smoothed_zones[i] = { r = 0, g = 0, b = 0 }
	end

	-- Log configuration
	print(string.format("Ambilight: edges=%s, zones=%d, depth=%d, inset=%d, skip=%d, smooth=%d",
		concat(config.edges, ","),
		config.zones_per_edge,
		config.sample_depth,
		config.inset,
		config.frame_skip,
		config.smoothing_frames
	))

	-- Register frame callback
	emu.register_frame_done(on_frame)

	initialized = true
	print("Ambilight: initialized")
end

return M
