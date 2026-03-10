import React from 'react';
import ScienceIcon from '@mui/icons-material/Science';
import SuperButton from '../common/super-button';
import type { DriverButtonProps } from './types';
import { usePendingWithTimeout } from '@/renderer/hooks/use-pending-with-timeout';

const TestLedButton: React.FC<DriverButtonProps> = ({ driver }) => {
  const { pending: testRequestPending, setPending: setTestRequestPending } = usePendingWithTimeout({
    timeoutMs: 5000,
    clearOnChange: [driver.testActive, driver.state],
  });

  const handleTestToggle = () => {
    if (testRequestPending) {
      return;
    }

    const newTestMode = !(driver.testActive ?? false);
    setTestRequestPending(true);

    void (async () => {
      try {
        await window.rgfx.sendDriverCommand(driver.id, 'test', newTestMode ? 'on' : 'off');
      } catch (error) {
        console.error('Failed to toggle test mode:', error);
        setTestRequestPending(false);
      }
    })();
  };

  const getTooltipText = () => {
    const hardware = driver.resolvedHardware;

    if (!hardware) {
      return 'Displays a test pattern to validate LED hardware and wiring';
    }

    if (hardware.layout === 'strip') {
      return 'Strip: 4 segments in RGCP (25% each). White pixel marks the start.';
    } else {
      return 'Matrix: 4 quadrants (TL:Red, TR:Green, BL:Cyan, BR:Purple). White pixel marks top-left of each panel.';
    }
  };

  return (
    <SuperButton
      tooltipTitle={getTooltipText()}
      icon={<ScienceIcon />}
      variant={driver.testActive ? 'contained' : 'outlined'}
      color={driver.testActive ? 'success' : 'primary'}
      onClick={handleTestToggle}
      disabled={driver.state !== 'connected' || !driver.ledConfig}
      busy={testRequestPending}
      sx={{ width: 140 }}
    >
      {testRequestPending ? 'Processing...' : `Test LEDs ${driver.testActive ? 'ON' : 'OFF'}`}
    </SuperButton>
  );
};

export default TestLedButton;
