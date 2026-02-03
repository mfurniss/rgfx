import React, { useState, useEffect } from 'react';
import { Science as ScienceIcon } from '@mui/icons-material';
import SuperButton from '../common/super-button';
import type { DriverButtonProps } from './types';

const TIMEOUT_MS = 5000;

const TestLedButton: React.FC<DriverButtonProps> = ({ driver }) => {
  const [testRequestPending, setTestRequestPending] = useState(false);

  // Clear pending state when driver's testActive state changes OR when driver connects/disconnects
  useEffect(() => {
    setTestRequestPending(false);
  }, [driver.testActive, driver.state]);

  // Timeout to auto-clear pending state if no response received
  useEffect(() => {
    if (!testRequestPending) {
      return;
    }

    const timer = setTimeout(() => {
      setTestRequestPending(false);
    }, TIMEOUT_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [testRequestPending]);

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
