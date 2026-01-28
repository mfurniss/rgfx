-- This Source Code Form is subject to the terms of the Mozilla Public
-- License, v. 2.0. If a copy of the MPL was not distributed with this
-- file, You can obtain one at http://mozilla.org/MPL/2.0/.
--
-- Copyright (c) 2025 Matt Furniss <furniss@gmail.com>

local ambilight = require("ambilight")

ambilight.init({
	zones = 12,
	depth = 10,
	event_interval = 3,
})
