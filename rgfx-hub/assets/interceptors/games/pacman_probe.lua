-- Diagnostic probe: dump character sprites from GFX ROM
-- Uses the working Namco strip decoder (same as sprite-extract.lua)
-- Applies 90° CW rotation for Pac-Man's rotated screen

local region = manager.machine.memory.regions[":gfx1"]
if not region then
	print("ERROR: gfx1 region not found")
	return
end

local sprite_offset = 0x1000
local bytes_per_sprite = 64

-- Namco 2bpp strip layout (proven correct for Pac-Man)
local STRIPS = {
	{ offset = 8,  px = 0,  py = 0 },
	{ offset = 16, px = 4,  py = 0 },
	{ offset = 24, px = 8,  py = 0 },
	{ offset = 0,  px = 12, py = 0 },
	{ offset = 40, px = 0,  py = 8 },
	{ offset = 48, px = 4,  py = 8 },
	{ offset = 56, px = 8,  py = 8 },
	{ offset = 32, px = 12, py = 8 },
}

local function decode_sprite(sprite_index)
	local base = sprite_offset + sprite_index * bytes_per_sprite
	local pixels = {}
	for y = 0, 15 do
		pixels[y] = {}
		for x = 0, 15 do
			pixels[y][x] = 0
		end
	end
	for _, strip in ipairs(STRIPS) do
		for yy = 0, 7 do
			local byte_val = region:read_u8(base + strip.offset + yy)
			for xx = 0, 3 do
				local hi = (byte_val >> (7 - xx)) & 1
				local lo = (byte_val >> (3 - xx)) & 1
				pixels[strip.py + yy][strip.px + xx] = (hi << 1) | lo
			end
		end
	end
	return pixels
end

-- Rotate 90° CW (Pac-Man ROT90)
local function rotate_90cw(pixels)
	local rotated = {}
	for y = 0, 15 do
		rotated[y] = {}
		for x = 0, 15 do
			rotated[y][x] = pixels[15 - x][y]
		end
	end
	return rotated
end

local function print_sprite(sprite_index)
	local pixels = decode_sprite(sprite_index)
	pixels = rotate_90cw(pixels)

	print(string.format("\n=== Sprite %d (0x%02X) ===", sprite_index, sprite_index))
	for y = 0, 15 do
		local row = ""
		for x = 0, 15 do
			local px = pixels[y][x]
			if px == 0 then
				row = row .. "."
			else
				row = row .. tostring(px)
			end
		end
		print(row)
	end
end

-- Dump ALL 64 sprites
print("=== ALL SPRITES (indices 0-63) ===")
print("Pixel values: .=transparent, 1-3=palette colors")
print("Rotated 90° CW for Pac-Man's screen orientation")

for i = 0, 63 do
	print_sprite(i)
end
