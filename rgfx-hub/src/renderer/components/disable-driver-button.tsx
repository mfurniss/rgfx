import React from 'react';
import { Block as BlockIcon, PlayArrow as PlayArrowIcon } from '@mui/icons-material';
import type { Driver } from '@/types';
import SuperButton from './super-button';

interface DisableDriverButtonProps {
  driver: Driver;
}

const DisableDriverButton: React.FC<DisableDriverButtonProps> = ({ driver }) => {
  const handleToggle = () => {
    void (async () => {
      try {
        await window.rgfx.setDriverDisabled(driver.id, !driver.disabled);
      } catch (error) {
        console.error('Failed to toggle disabled state:', error);
      }
    })();
  };

  return (
    <SuperButton
      sx={{ width: '100px' }}
      icon={driver.disabled ? <PlayArrowIcon /> : <BlockIcon />}
      variant={driver.disabled ? 'contained' : 'outlined'}
      color={driver.disabled ? 'info' : 'primary'}
      size="small"
      onClick={handleToggle}
    >
      {driver.disabled ? 'Enable' : 'Disable'}
    </SuperButton>
  );
};

export default DisableDriverButton;
