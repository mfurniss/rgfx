/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { useDriverStore } from '@/renderer/store/driver-store';
import { PageBanner } from '@/renderer/components/common/page-banner';

export function NoDriversBanner() {
  const drivers = useDriverStore((state) => state.drivers);

  if (drivers.length > 0) {
    return null;
  }

  return (
    <PageBanner color="info">
      Visit the <Link to="/firmware">Firmware</Link> page to flash your first ESP32 driver.
    </PageBanner>
  );
}
