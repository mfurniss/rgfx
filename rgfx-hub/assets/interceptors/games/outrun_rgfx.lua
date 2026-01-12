-- This Source Code Form is subject to the terms of the Mozilla Public
-- License, v. 2.0. If a copy of the MPL was not distributed with this
-- file, You can obtain one at http://mozilla.org/MPL/2.0/.
--
-- Copyright (c) 2025 Matt Furniss <furniss@gmail.com>

-- OutRun interceptor
-- Enables ambilight effect for ambient LED lighting

print("OutRun interceptor loaded")

-- Enable ambilight (all four edges for immersive driving experience)
local ambilight = require("ambilight")
ambilight.init({
	edges = { "top", "bottom", "left", "right" },
	zones_per_edge = 10,
	sample_depth = 16,     -- Deeper sampling for driving game visuals
	inset = 0,
	frame_skip = 3,        -- Faster updates (~15fps) for driving action
	smoothing_frames = 6,  -- Moderate smoothing for responsive feel
})
