-- This Source Code Form is subject to the terms of the Mozilla Public
-- License, v. 2.0. If a copy of the MPL was not distributed with this
-- file, You can obtain one at http://mozilla.org/MPL/2.0/.
--
-- Copyright (c) 2025 Matt Furniss <furniss@gmail.com>

-- FFT Audio Analysis Module
-- Provides 5-band FFT analysis with auto-gain normalization for visual effects
--
-- Usage:
--   local fft = require("fft")
--   fft.init({ game_name = "smb", emit_events = true })
--
-- Options:
--   game_name     - Game identifier for event topics (required if emit_events = true)
--   emit_events   - Send FFT data via _G.event() (default: false)
--   log_bars      - Print bar graph to console (default: false)
--   fps           - Target update rate (default: 10)
--   on_update     - Callback function(bands) called each update with normalized 0-9 values

local M = {}

--------------------------------------------------------------------------------
-- Upvalue caching for hot path (avoid global lookups in tight loops)
--------------------------------------------------------------------------------
local floor = math.floor
local sqrt = math.sqrt
local cos = math.cos
local sin = math.sin
local pi = math.pi
local max = math.max
local concat = table.concat
local insert = table.insert
local rep = string.rep
local format = string.format

-- Configuration
local config = {
	game_name = nil,
	emit_events = false,
	log_bars = false,
	fps = 10,
	on_update = nil,
	devices = nil, -- nil = all devices, or array of device tag patterns to include
	boot_delay = 0, -- seconds to wait before starting FFT monitoring
}

-- State
local sample_rate = 48000
local band_freqs = { 110, 330, 660, 1320, 2640 } -- Bass, Low, Mid, High, Treble
local band_accum = { 0, 0, 0, 0, 0 }
local accum_count = 0
local band_peak = { 0.0001, 0.0001, 0.0001, 0.0001, 0.0001 }
local attack_rate = 0.3
local release_rate = 0.02
local callback_count = 0
local emit_every_n = 6
local frame_count = 0
local initialized = false
local last_was_zero = false
local delay_start_time = 0
local delay_active = false

--------------------------------------------------------------------------------
-- Precomputed Goertzel coefficients LUT
-- Indexed by band (1-5), computed at init() for the actual buffer size
--------------------------------------------------------------------------------
local goertzel_lut = nil -- { coeff, cos_omega, sin_omega, inv_n } per band
local cached_buffer_size = 0

-- Precompute coefficients for a given buffer size
local function build_goertzel_lut(n)
	if n == cached_buffer_size and goertzel_lut then
		return -- Already computed for this size
	end

	goertzel_lut = {}
	local inv_n = 1 / n
	local two_pi_over_n = (2 * pi) / n

	for i = 1, 5 do
		local freq = band_freqs[i]
		local k = floor(0.5 + (n * freq) / sample_rate)
		local omega = two_pi_over_n * k
		local cos_omega = cos(omega)
		local sin_omega = sin(omega)
		goertzel_lut[i] = {
			coeff = 2 * cos_omega,
			cos_omega = cos_omega,
			sin_omega = sin_omega,
			inv_n = inv_n,
		}
	end
	cached_buffer_size = n
end

-- Optimized Goertzel: uses precomputed LUT, minimal operations in tight loop
local function goertzel_fast(samples, band_idx)
	local lut = goertzel_lut[band_idx]
	local coeff = lut.coeff
	local n = #samples

	-- Core Goertzel IIR filter - keep this loop as tight as possible
	local s1, s2 = 0, 0
	for i = 1, n do
		local s0 = samples[i] + coeff * s1 - s2
		s2 = s1
		s1 = s0
	end

	-- Final magnitude calculation
	local cos_omega = lut.cos_omega
	local real = s1 - s2 * cos_omega
	local imag = s2 * lut.sin_omega
	return sqrt(real * real + imag * imag) * lut.inv_n
end

-- Check if a device tag matches configured patterns
local function device_matches(tag)
	if not config.devices then return true end -- nil = all devices
	for _, pattern in ipairs(config.devices) do
		if tag:find(pattern) then return true end
	end
	return false
end

-- Combine multiple buffers by summing samples (optimized: no ipairs, direct indexing)
local function combine_buffers(buffers)
	local num_buffers = #buffers
	if num_buffers == 0 then return nil end
	if num_buffers == 1 then return buffers[1] end

	-- Find max length using numeric for
	local max_len = 0
	for b = 1, num_buffers do
		local len = #buffers[b]
		if len > max_len then max_len = len end
	end

	-- Sum all buffers - tight loop with direct indexing
	local combined = {}
	for i = 1, max_len do
		local sum = 0
		for b = 1, num_buffers do
			local sample = buffers[b][i]
			if sample then sum = sum + sample end
		end
		combined[i] = sum
	end
	return combined
end

-- Reusable output table to avoid allocation every emit cycle
local bands_out = { 0, 0, 0, 0, 0 }

-- Process audio buffer and emit results at configured FPS
local function process_buffer(buffer)
	-- Handle boot delay
	if delay_active then
		if delay_start_time == 0 then
			delay_start_time = os.time()
		end
		if os.time() - delay_start_time < config.boot_delay then
			return
		end
		delay_active = false
		print("FFT: monitoring ACTIVE")
	end

	-- Build LUT on first call (or if buffer size changes)
	local n = #buffer
	if n ~= cached_buffer_size then
		build_goertzel_lut(n)
	end

	-- Accumulate FFT values using optimized Goertzel (numeric for, no ipairs)
	for i = 1, 5 do
		band_accum[i] = band_accum[i] + goertzel_fast(buffer, i)
	end
	accum_count = accum_count + 1

	-- Check if it's time to emit
	callback_count = callback_count + 1
	if callback_count % emit_every_n ~= 0 then return end

	-- Calculate averaged and normalized bands with auto-gain
	-- Reuse bands_out table to avoid allocation
	local inv_accum = 1 / accum_count
	for i = 1, 5 do
		local avg = band_accum[i] * inv_accum

		-- Update peak tracker (compressor-style envelope follower)
		local peak = band_peak[i]
		if avg > peak then
			peak = peak + (avg - peak) * attack_rate
		else
			peak = peak - peak * release_rate
		end
		if peak < 0.0001 then peak = 0.0001 end
		band_peak[i] = peak

		-- Normalize using per-band peak (floor with +0.5 = round)
		local normalized = floor((avg / peak) * 9 + 0.5)
		-- Clamp 0-9 without function calls
		if normalized < 0 then normalized = 0 end
		if normalized > 9 then normalized = 9 end
		bands_out[i] = normalized
		band_accum[i] = 0
	end
	accum_count = 0
	frame_count = frame_count + 1

	-- Skip consecutive zero states (unrolled comparison)
	local b1, b2, b3, b4, b5 = bands_out[1], bands_out[2], bands_out[3], bands_out[4], bands_out[5]
	local is_zero = b1 == 0 and b2 == 0 and b3 == 0 and b4 == 0 and b5 == 0
	if is_zero and last_was_zero then
		return
	end
	last_was_zero = is_zero

	-- Emit event if configured
	if config.emit_events then
		_G.event("rgfx/audio/fft", "[" .. concat(bands_out, ", ") .. "]")
	end

	-- Log bar graph if configured
	if config.log_bars then
		local bars = {}
		for i = 1, 5 do
			bars[i] = rep("█", bands_out[i]) .. rep("░", 9 - bands_out[i])
		end
		print(format("[%05d] %s %s %s %s %s", frame_count, bars[1], bars[2], bars[3], bars[4], bars[5]))
	end

	-- Call user callback if provided
	if config.on_update then
		config.on_update(bands_out)
	end
end

-- Initialize and start FFT processing
function M.init(opts)
	if initialized then return end

	-- Apply options
	if opts then
		for k, v in pairs(opts) do
			config[k] = v
		end
	end

	-- Calculate emit interval based on FPS
	-- Sound callback runs ~60 times/sec, so emit_every_n = 60 / fps
	emit_every_n = max(1, floor(60 / config.fps))

	-- Set up boot delay if configured
	if config.boot_delay > 0 then
		delay_active = true
		print(format("FFT: delayed %d seconds", config.boot_delay))
	end

	-- Enumerate all sound devices
	print("FFT: Available sound devices:")
	for tag, sound in pairs(manager.machine.sounds) do
		print(format("  %s (outputs=%d)", tag, sound.outputs or 0))
	end

	-- Enable sound hooks on matching sound devices
	local hooked_count = 0
	for tag, sound in pairs(manager.machine.sounds) do
		if device_matches(tag) then
			sound.hook = true
			hooked_count = hooked_count + 1
			print(format("FFT: hooked %s", tag))
		end
	end

	if hooked_count == 0 then
		print("FFT: WARNING - no matching sound devices found")
		return
	end

	-- Register audio callback - combine all device buffers into single FFT
	emu.register_sound_update(function(samples)
		local buffers = {}
		for tag, channels in pairs(samples) do
			if device_matches(tag) then
				local buffer = channels[1]
				if buffer and #buffer >= 256 then
					insert(buffers, buffer)
				end
			end
		end

		local combined = combine_buffers(buffers)
		if combined and #combined >= 256 then
			process_buffer(combined)
		end
	end)

	initialized = true
end

return M
