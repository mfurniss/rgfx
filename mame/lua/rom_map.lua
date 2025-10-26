-- ROM-to-Interceptor Mapping Configuration
--
-- This file maps ROM names and cartridge filenames to their corresponding interceptor files.
--
-- For arcade games: Uses ROM name from emu.romname() (e.g., "pacman", "mspacman")
-- For console games: Uses cartridge filename without extension (e.g., "smb" from "smb.nes")
--
-- Multiple ROMs can map to the same interceptor (many-to-one relationship).
-- Example: pacman and mspacman both use pacman_rgfx.lua

return {
	-- ============================================================================
	-- Arcade Games (ROM name → interceptor)
	-- ============================================================================

	-- Pac-Man variants (all share same RAM map)
	pacman = "pacman_rgfx",
	mspacman = "pacman_rgfx",

	-- Galaga
	galaga = "galaga_rgfx",

	-- ============================================================================
	-- NES Games (cartridge filename → interceptor)
	-- ============================================================================

	-- Super Mario Bros (USA)
	smb = "nes_smb_rgfx",

	-- Super Mario Bros (World edition) - shares interceptor with smb
	smw = "nes_smb_rgfx",

	-- Castlevania III: Dracula's Curse
	castlevania_3 = "nes_castlevania3_rgfx",

	-- ============================================================================
	-- SNES Games (cartridge filename → interceptor)
	-- ============================================================================

	-- Super Mario World (handle various filename formats)
	["Super Mario World (USA)"] = "snes_smw_rgfx",
	["super_mario_world"] = "snes_smw_rgfx",
	smworld = "snes_smw_rgfx",

	-- ============================================================================
	-- Future Examples (add as needed)
	-- ============================================================================

	-- NES:
	-- smb3 = "nes_smb3_rgfx",
	-- zelda = "nes_zelda_rgfx",
	-- metroid = "nes_metroid_rgfx",

	-- Genesis/Mega Drive:
	-- sonic = "genesis_sonic_rgfx",
	-- sonic2 = "genesis_sonic2_rgfx",
	-- goldenaxe = "genesis_goldenaxe_rgfx",

	-- SNES:
	-- zelda_lttp = "snes_zelda_lttp_rgfx",
	-- super_metroid = "snes_super_metroid_rgfx",
}
