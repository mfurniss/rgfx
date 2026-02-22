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
