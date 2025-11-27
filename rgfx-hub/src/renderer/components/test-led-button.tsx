import React, { useState, useEffect } from 'react';
import { Button, Tooltip } from '@mui/material';
import { Science as ScienceIcon } from '@mui/icons-material';
import type { Driver } from '~/src/types';

interface TestLedButtonProps {
  driver: Driver;
}

const TestLedButton: React.FC<TestLedButtonProps> = ({ driver }) => {
  const [testRequestPending, setTestRequestPending] = useState(false);

  // Clear pending state when driver's testActive state changes OR when driver connects/disconnects
  useEffect(() => {
    setTestRequestPending(false);
  }, [driver.testActive, driver.connected]);

  const handleTestToggle = () => {
    if (testRequestPending) {
      return;
    }

    const newTestMode = !(driver.testActive ?? false);
    setTestRequestPending(true);

    void (async () => {
      try {
        if (newTestMode) {
          await window.rgfx.updateDriverConfig(driver.id);
        }
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
      return 'Strip: 4 segments in Red, Green, Blue, Yellow (25% each)';
    } else {
      return 'Matrix: 4 quadrants - Top-Left: Red, Top-Right: Green, Bottom-Left: Blue, Bottom-Right: Yellow';
    }
  };

  return (
    <Tooltip title={getTooltipText()} arrow>
      <span>
        <Button
          variant={driver.testActive ? 'contained' : 'outlined'}
          color={driver.testActive ? 'success' : 'primary'}
          size="small"
          startIcon={<ScienceIcon />}
          onClick={handleTestToggle}
          disabled={!driver.connected || testRequestPending}
        >
          {testRequestPending ? 'Processing...' : `Test LEDs ${driver.testActive ? 'ON' : 'OFF'}`}
        </Button>
      </span>
    </Tooltip>
  );
};

export default TestLedButton;
