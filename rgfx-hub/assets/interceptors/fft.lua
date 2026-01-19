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
--   fft.init({ devices = { "ym2151" } })
--
-- Options:
--   log_bars      - Print bar graph to console (default: false)
--   fps           - Target update rate (default: 10)
--   on_update     - Callback function(bands) called each update with normalized 0-9 values
--   devices       - Array of device tag patterns to monitor (default: nil = all devices)
--   boot_delay    - Seconds to wait before starting FFT monitoring (default: 0)

local M = {}

-- Configuration
local config = {
	game_name = nil,
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

-- DFT for a single frequency bin (Goertzel algorithm)
local function goertzel(samples, target_freq, sr)
	local n = #samples
	local k = math.floor(0.5 + (n * target_freq) / sr)
	local omega = (2 * math.pi * k) / n
	local cos_omega = math.cos(omega)
	local sin_omega = math.sin(omega)
	local coeff = 2 * cos_omega

	local s0, s1, s2 = 0, 0, 0
	for i = 1, n do
		s0 = samples[i] + coeff * s1 - s2
		s2 = s1
		s1 = s0
	end

	local real = s1 - s2 * cos_omega
	local imag = s2 * sin_omega
	return math.sqrt(real * real + imag * imag) / n
end

-- Check if a device tag matches configured patterns
local function device_matches(tag)
	if not config.devices then return true end -- nil = all devices
	for _, pattern in ipairs(config.devices) do
		if tag:find(pattern) then return true end
	end
	return false
end

-- Combine multiple buffers by summing samples
local function combine_buffers(buffers)
	if #buffers == 0 then return nil end
	if #buffers == 1 then return buffers[1] end

	local combined = {}
	local max_len = 0
	for _, buf in ipairs(buffers) do
		if #buf > max_len then max_len = #buf end
	end

	for i = 1, max_len do
		combined[i] = 0
		for _, buf in ipairs(buffers) do
			if buf[i] then combined[i] = combined[i] + buf[i] end
		end
	end
	return combined
end

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

	-- Accumulate FFT values
	for i, freq in ipairs(band_freqs) do
		band_accum[i] = band_accum[i] + goertzel(buffer, freq, sample_rate)
	end
	accum_count = accum_count + 1

	-- Check if it's time to emit
	callback_count = callback_count + 1
	if callback_count % emit_every_n ~= 0 then return end

	-- Calculate averaged and normalized bands with auto-gain
	local bands = {}
	for i = 1, 5 do
		local avg = band_accum[i] / accum_count

		-- Update peak tracker (compressor-style envelope follower)
		if avg > band_peak[i] then
			band_peak[i] = band_peak[i] + (avg - band_peak[i]) * attack_rate
		else
			band_peak[i] = band_peak[i] - band_peak[i] * release_rate
		end
		if band_peak[i] < 0.0001 then band_peak[i] = 0.0001 end

		-- Normalize using per-band peak
		local normalized = math.floor((avg / band_peak[i]) * 9 + 0.5)
		bands[i] = math.min(9, math.max(0, normalized))
		band_accum[i] = 0
	end
	accum_count = 0
	frame_count = frame_count + 1

	-- Skip consecutive zero states
	local is_zero = bands[1] == 0 and bands[2] == 0 and bands[3] == 0 and bands[4] == 0 and bands[5] == 0
	if is_zero and last_was_zero then
		return
	end
	last_was_zero = is_zero

	-- Emit event
	_G.event("rgfx/audio/fft", "[" .. table.concat(bands, ", ") .. "]")

	-- Log bar graph if configured
	if config.log_bars then
		local bars = {}
		for i = 1, 5 do
			bars[i] = string.rep("█", bands[i]) .. string.rep("░", 9 - bands[i])
		end
		print(string.format("[%05d] %s %s %s %s %s",
			frame_count, bars[1], bars[2], bars[3], bars[4], bars[5]))
	end

	-- Call user callback if provided
	if config.on_update then
		config.on_update(bands)
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
	emit_every_n = math.max(1, math.floor(60 / config.fps))

	-- Set up boot delay if configured
	if config.boot_delay > 0 then
		delay_active = true
		print(string.format("FFT: delayed %d seconds", config.boot_delay))
	end

	-- Enumerate all sound devices
	print("FFT: Available sound devices:")
	for tag, sound in pairs(manager.machine.sounds) do
		print(string.format("  %s (outputs=%d)", tag, sound.outputs or 0))
	end

	-- Enable sound hooks on matching sound devices
	local hooked_count = 0
	for tag, sound in pairs(manager.machine.sounds) do
		if device_matches(tag) then
			sound.hook = true
			hooked_count = hooked_count + 1
			print(string.format("FFT: hooked %s", tag))
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
					table.insert(buffers, buffer)
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
