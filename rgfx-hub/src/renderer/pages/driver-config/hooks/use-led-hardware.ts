/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { useEffect, useState } from 'react';

interface UseLedHardwareResult {
  options: string[];
  loading: boolean;
}

/** Hook to load available LED hardware options on mount */
export function useLedHardware(): UseLedHardwareResult {
  const [options, setOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const hardwareOptions = await window.rgfx.getLEDHardwareList();
        setOptions(hardwareOptions);
      } catch (error) {
        console.error('Failed to load LED hardware options:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { options, loading };
}
