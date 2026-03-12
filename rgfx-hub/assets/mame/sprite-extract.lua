-- Sprite Extraction Module
-- Extracts sprite graphics from MAME ROM regions and writes them as JSON files.
-- Each game provides a manifest describing which sprites to extract and how to decode them.
--
-- JSON output matches the GifBitmapResult format used by the hub's loadSprite() function:
-- { images: string[][], palette: string[], width: number, height: number, frameCount: number }

local exports = {}

local HEX_CHARS = "0123456789ABCDEF"

local home = os.getenv("HOME") or os.getenv("USERPROFILE")
if not home then
	error("Could not determine home directory")
end

-- Pac-Man color PROM decoding: R(bits 0-2), G(bits 3-5), B(bits 6-7)
-- Standard Namco resistor network weights
local function decode_pacman_color(byte)
	local r = 0x21 * (byte & 1) + 0x47 * ((byte >> 1) & 1) + 0x97 * ((byte >> 2) & 1)
	local g = 0x21 * ((byte >> 3) & 1) + 0x47 * ((byte >> 4) & 1) + 0x97 * ((byte >> 5) & 1)
	local b = 0x51 * ((byte >> 6) & 1) + 0xAE * ((byte >> 7) & 1)
	return string.format("#%02X%02X%02X", r, g, b)
end

-- Supported color PROM decoders (extensible for future games)
local color_decoders = {
	pacman = decode_pacman_color,
}

-- Namco 2bpp sprite strip layout.
-- Each 16x16 sprite is composed of 8 strips. Each strip is 8 bytes covering
-- a 4-column x 8-row region. Within each byte, the high nibble (bits 7-4) is
-- plane 1 and the low nibble (bits 3-0) is plane 0, MSB = leftmost pixel.
local NAMCO_SPRITE_STRIPS = {
	{ offset = 8,  px = 0,  py = 0 },  -- top-left
	{ offset = 16, px = 4,  py = 0 },  -- top-center-left
	{ offset = 24, px = 8,  py = 0 },  -- top-center-right
	{ offset = 0,  px = 12, py = 0 },  -- top-right
	{ offset = 40, px = 0,  py = 8 },  -- bottom-left
	{ offset = 48, px = 4,  py = 8 },  -- bottom-center-left
	{ offset = 56, px = 8,  py = 8 },  -- bottom-center-right
	{ offset = 32, px = 12, py = 8 },  -- bottom-right
}

-- Decode a 16x16 Namco 2bpp sprite using strip-based layout.
-- Each byte encodes 4 pixels: high nibble = plane 1, low nibble = plane 0,
-- MSB = leftmost pixel within each 4-pixel group.
local function decode_namco_sprite(region, base_offset)
	local pixels = {}
	for y = 0, 15 do
		pixels[y] = {}
		for x = 0, 15 do
			pixels[y][x] = 0
		end
	end

	for _, strip in ipairs(NAMCO_SPRITE_STRIPS) do
		for yy = 0, 7 do
			local byte_val = region:read_u8(base_offset + strip.offset + yy)
			for xx = 0, 3 do
				local hi = (byte_val >> (7 - xx)) & 1
				local lo = (byte_val >> (3 - xx)) & 1
				pixels[strip.py + yy][strip.px + xx] = (hi << 1) | lo
			end
		end
	end

	return pixels
end

-- Build the palette for a sprite by reading color and palette PROMs.
-- Returns an array of hex color strings (one per pixel value, e.g. 4 for 2bpp).
local function build_palette(manifest, palette_index)
	local proms_region = manager.machine.memory.regions[manifest.color_prom.region]
	if not proms_region then
		print("ERROR: Color PROM region not found: " .. manifest.color_prom.region)
		return nil
	end

	local decoder = color_decoders[manifest.color_prom.format]
	if not decoder then
		print("ERROR: Unknown color PROM format: " .. manifest.color_prom.format)
		return nil
	end

	local colors_per_entry = manifest.palette_prom.colors_per_entry
	local palette = {}

	for c = 0, colors_per_entry - 1 do
		local prom_offset = manifest.palette_prom.offset + palette_index * colors_per_entry + c
		local color_idx = proms_region:read_u8(prom_offset)
		local color_byte = proms_region:read_u8(manifest.color_prom.offset + color_idx)
		palette[c + 1] = decoder(color_byte)
	end

	return palette
end

-- Rotate a 2D pixel grid 90° clockwise.
-- Used for games with rotated screens (e.g., Pac-Man ROT90).
local function rotate_90cw(pixels, width, height)
	local rotated = {}
	for y = 0, width - 1 do
		rotated[y] = {}
		for x = 0, height - 1 do
			rotated[y][x] = pixels[(height - 1) - x][y]
		end
	end
	return rotated, height, width
end

-- Convert decoded pixels + palette to the string[][] image format.
-- Pixel value 0 is always transparent. Additional transparent values via transparent_pixels.
-- When color_map is provided, pixel values are remapped before converting to hex characters.
-- When skip_trim is true, returns full untrimmed rows (for multi-frame alignment).
local function pixels_to_image(pixels, width, height, color_map, transparent_pixels, skip_trim)
	local is_transparent = { [0] = true }
	if transparent_pixels then
		for _, v in ipairs(transparent_pixels) do
			is_transparent[v] = true
		end
	end

	local rows = {}
	for y = 0, height - 1 do
		local row = ""
		for x = 0, width - 1 do
			local px = pixels[y][x]
			if is_transparent[px] then
				row = row .. " "
			elseif color_map and color_map[px] then
				local mapped = color_map[px]
				row = row .. HEX_CHARS:sub(mapped + 1, mapped + 1)
			else
				row = row .. HEX_CHARS:sub(px + 1, px + 1)
			end
		end
		if not skip_trim then
			row = row:match("^(.-)%s*$")
		end
		rows[#rows + 1] = row
	end

	if not skip_trim then
		while #rows > 0 and rows[#rows] == "" do
			rows[#rows] = nil
		end
		while #rows > 0 and rows[1] == "" do
			table.remove(rows, 1)
		end
		-- Strip common leading spaces
		local min_lead = math.huge
		for _, row in ipairs(rows) do
			local lead = row:find("%S")
			if lead and lead - 1 < min_lead then
				min_lead = lead - 1
			end
		end
		if min_lead > 0 and min_lead < math.huge then
			for i, row in ipairs(rows) do
				rows[i] = row:sub(min_lead + 1)
			end
		end
	end

	return rows
end

-- Compute unified bounding box across all frames and crop to consistent dimensions.
-- Smaller frames are centered within the largest bounding box, padded with spaces.
local function align_frames(all_images)
	-- Find the unified content bounding box across all frames
	local min_top, max_bottom = math.huge, 0
	local min_left, max_right = math.huge, 0

	for _, rows in ipairs(all_images) do
		for y, row in ipairs(rows) do
			local left = row:find("%S")
			if left then
				local _, right = row:find(".*%S")
				if y < min_top then min_top = y end
				if y > max_bottom then max_bottom = y end
				if left < min_left then min_left = left end
				if right > max_right then max_right = right end
			end
		end
	end

	if min_top == math.huge then return all_images end

	-- Crop all frames to the unified bounding box
	local box_width = max_right - min_left + 1
	local result = {}

	for _, rows in ipairs(all_images) do
		local cropped = {}
		for y = min_top, max_bottom do
			local row = rows[y] or ""
			-- Pad row to ensure it covers the bounding box
			while #row < max_right do
				row = row .. " "
			end
			cropped[#cropped + 1] = row:sub(min_left, min_left + box_width - 1)
		end
		result[#result + 1] = cropped
	end

	return result
end

-- Escape a string for JSON output
local function json_escape(s)
	return s:gsub("\\", "\\\\"):gsub('"', '\\"')
end

-- Write sprite data as JSON file.
-- all_images is an array of image_rows arrays (one per frame).
local function write_json(filepath, all_images, palette)
	local f = io.open(filepath, "w")
	if not f then
		print("ERROR: Cannot write sprite file: " .. filepath)
		return false
	end

	local frame_count = #all_images

	f:write('{\n')
	f:write('  "images": [\n')
	for fi, image_rows in ipairs(all_images) do
		f:write('    [\n')
		for i, row in ipairs(image_rows) do
			f:write(string.format('      "%s"', json_escape(row)))
			if i < #image_rows then
				f:write(",")
			end
			f:write("\n")
		end
		f:write("    ]")
		if fi < frame_count then
			f:write(",")
		end
		f:write("\n")
	end

	if palette then
		f:write("  ],\n")
		f:write('  "palette": [')
		for i, color in ipairs(palette) do
			f:write(string.format('"%s"', color))
			if i < #palette then
				f:write(", ")
			end
		end
		f:write("]\n")
	else
		f:write("  ]\n")
	end

	f:write("}\n")

	f:close()
	return true
end

-- NES 2bpp planar: 16 bytes per 8x8 tile.
-- Bytes 0-7 = plane 0 (low bit), bytes 8-15 = plane 1 (high bit).
-- MSB = leftmost pixel within each row.
local function decode_nes_tile(region, base_offset)
	local pixels = {}
	for y = 0, 7 do
		pixels[y] = {}
		local plane0 = region:read_u8(base_offset + y)
		local plane1 = region:read_u8(base_offset + y + 8)
		for x = 0, 7 do
			local bit = 7 - x
			local lo = (plane0 >> bit) & 1
			local hi = (plane1 >> bit) & 1
			pixels[y][x] = (hi << 1) | lo
		end
	end
	return pixels
end

-- Compose a meta-sprite from multiple tiles arranged in a grid.
-- tile_indices: array of tile indices in row-major order (blank_tile = skip)
-- grid: {cols, rows}
local function compose_meta_sprite(region, tile_indices, grid, format, decode, sprite_offset)
	local cols, rows = grid[1], grid[2]
	local tw, th = format.width, format.height
	local blank = 0xFC

	local pixels = {}
	for y = 0, rows * th - 1 do
		pixels[y] = {}
		for x = 0, cols * tw - 1 do
			pixels[y][x] = 0
		end
	end

	for i, tile_idx in ipairs(tile_indices) do
		if tile_idx ~= blank then
			local col = (i - 1) % cols
			local row = math.floor((i - 1) / cols)
			local offset = sprite_offset + tile_idx * format.bytes_per_sprite
			local tile_pixels = decode(region, offset)
			for ty = 0, th - 1 do
				for tx = 0, tw - 1 do
					pixels[row * th + ty][col * tw + tx] = tile_pixels[ty][tx]
				end
			end
		end
	end

	return pixels
end

-- Sprite decoders by format name
local sprite_decoders = {
	namco = decode_namco_sprite,
	nes_2bpp = decode_nes_tile,
}

-- Main extraction function. Called by game interceptors with a manifest table.
--
-- manifest fields:
--   gfx_region (string): MAME memory region tag for graphics data
--   sprite_offset (number): byte offset where sprites start in the region
--   tile_format (table): { format, width, height, bytes_per_sprite }
--   color_prom (table): { region, offset, count, format }
--   palette_prom (table): { region, offset, colors_per_entry }
--   rotation (number, optional): screen rotation in degrees (0, 90, 180, 270)
--   sprites (array): sprite definitions, each with:
--     name (string): output filename (without .json)
--     index (number): sprite index (single-frame sprites)
--     tiles (array, optional): tile indices for meta-sprite composition (row-major)
--     grid (table, optional): {cols, rows} for meta-sprite layout (default {1,1})
--     palette (number): palette PROM index (when not using color_map)
--     color_map (table, optional): remap pixel values {[px_val] = output_index}
--     transparent_pixels (array, optional): pixel values to treat as transparent
--     frames (array, optional): multi-frame sprite, each frame with:
--       index or tiles, color_map, transparent_pixels (falls back to sprite-level)
--   output_dir (string): directory path for JSON output (relative to ~ or absolute)
function exports.extract(manifest)
	-- Resolve output directory
	local output_dir = manifest.output_dir
	if output_dir:sub(1, 1) == "~" then
		output_dir = home .. output_dir:sub(2)
	end

	-- Access GFX region
	local gfx_region = manager.machine.memory.regions[manifest.gfx_region]
	if not gfx_region then
		print("ERROR: GFX region not found: " .. manifest.gfx_region)
		return false
	end

	-- Look up sprite decoder
	local format = manifest.tile_format
	local decode = sprite_decoders[format.format]
	if not decode then
		print("ERROR: Unknown sprite format: " .. tostring(format.format))
		return false
	end

	-- Ensure output directory exists (cross-platform)
	local sep = package.config:sub(1, 1)
	if sep == "\\" then
		os.execute('mkdir "' .. output_dir:gsub("/", "\\") .. '" 2>nul')
	else
		os.execute("mkdir -p " .. output_dir)
	end

	local extracted = 0

	for _, sprite_def in ipairs(manifest.sprites) do
		local filepath = output_dir .. "/" .. sprite_def.name .. ".json"

		-- Detect color_map usage (no palette needed — driver uses default PICO-8 palette)
		local has_color_map = sprite_def.color_map ~= nil
		if not has_color_map and sprite_def.frames then
			for _, frame in ipairs(sprite_def.frames) do
				if frame.color_map then has_color_map = true; break end
			end
		end

		local palette = not has_color_map and build_palette(manifest, sprite_def.palette) or nil

		if has_color_map or palette then
			local all_images = {}
			local grid = sprite_def.grid or { 1, 1 }
			local w = grid[1] * format.width
			local h = grid[2] * format.height
			if manifest.rotation == 90 then
				w, h = h, w
			end

			if sprite_def.frames then
				for _, frame in ipairs(sprite_def.frames) do
					local pixels
					local frame_tiles = frame.tiles or sprite_def.tiles
					if frame_tiles then
						pixels = compose_meta_sprite(
							gfx_region, frame_tiles, grid, format, decode, manifest.sprite_offset)
					else
						local base_offset = manifest.sprite_offset + frame.index * format.bytes_per_sprite
						pixels = decode(gfx_region, base_offset)
					end
					if manifest.rotation == 90 then
						pixels = rotate_90cw(pixels, grid[1] * format.width, grid[2] * format.height)
					end
					local cm = frame.color_map or sprite_def.color_map
					local tp = frame.transparent_pixels or sprite_def.transparent_pixels
					all_images[#all_images + 1] = pixels_to_image(pixels, w, h, cm, tp, true)
				end
				all_images = align_frames(all_images)
			else
				local pixels
				if sprite_def.tiles then
					pixels = compose_meta_sprite(
						gfx_region, sprite_def.tiles, grid, format, decode, manifest.sprite_offset)
				else
					local base_offset = manifest.sprite_offset + sprite_def.index * format.bytes_per_sprite
					pixels = decode(gfx_region, base_offset)
				end
				if manifest.rotation == 90 then
					pixels = rotate_90cw(pixels, grid[1] * format.width, grid[2] * format.height)
				end
				all_images[#all_images + 1] = pixels_to_image(
					pixels, w, h, sprite_def.color_map, sprite_def.transparent_pixels)
			end

			if write_json(filepath, all_images, palette) then
				extracted = extracted + 1
				local actual_h = #(all_images[1] or {})
				local actual_w = 0
				for _, row in ipairs(all_images[1] or {}) do
					if #row > actual_w then actual_w = #row end
				end
				print(string.format("  Extracted: %s (%d frames, %dx%d)",
					sprite_def.name, #all_images, actual_w, actual_h))
			end
		end
	end

	print(string.format("Sprite extraction: %d/%d sprites ready", extracted, #manifest.sprites))
	return extracted == #manifest.sprites
end

return exports
