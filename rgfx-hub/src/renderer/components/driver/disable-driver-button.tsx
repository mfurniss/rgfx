import React from 'react';
import BlockIcon from '@mui/icons-material/Block';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useAsyncAction } from '../../hooks/use-async-action';
import SuperButton from '../common/super-button';
import type { DriverButtonProps } from './types';

const DisableDriverButton: React.FC<DriverButtonProps> = ({ driver }) => {
  const { execute: toggle, pending } = useAsyncAction(
    async () => {
      await window.rgfx.setDriverDisabled(driver.id, !driver.disabled);
    },
    {
      onError: (error) => {
        console.error('Failed to toggle disabled state:', error);
      },
    },
  );

  return (
    <SuperButton
      sx={{ width: '100px' }}
      icon={driver.disabled ? <PlayArrowIcon /> : <BlockIcon />}
      variant={driver.disabled ? 'contained' : 'outlined'}
      color={driver.disabled ? 'info' : 'primary'}
      onClick={toggle}
      busy={pending}
    >
      {driver.disabled ? 'Enable' : 'Disable'}
    </SuperButton>
  );
};

export default DisableDriverButton;
