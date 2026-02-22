-- ROM-to-Interceptor Variant Mapping
--
-- The framework automatically tries to load "{romname}_rgfx" for any ROM,
-- so games like "pacman", "starwars", "galaga88" etc. don't need entries here.
-- This file only needs entries for variants whose name doesn't match the
-- interceptor's base name (e.g., "mspacman" → "pacman_rgfx").
--
-- Key = base name (ROM name or interceptor name), value = array of variants.
-- Flattened at runtime so rgfx.lua gets { variant = "base_rgfx" }.

local variants = {
	-- Arcade
	pacman   = { "mspacman" },
	defender = { "defenderg", "defenderb", "defenderw" },
	outrun   = { "outruna", "outrunb" },
	sharrier = { "sharrier1", "sharrierj" },
	shangon  = { "shangon1", "shangon2", "shangon3", "shangon3d", "shangonle" },
	ssf2     = { "ssf2u", "ssf2a", "ssf2j", "ssf2t", "ssf2tu", "ssf2ta", "ssf2tj" },

	-- Console (key = interceptor name, values = cartridge filenames)
	nes_smb  = { "smb", "smw" },
}

local map = {}
for base, names in pairs(variants) do
	for _, name in ipairs(names) do
		map[name] = base .. "_rgfx"
	end
end
return map
