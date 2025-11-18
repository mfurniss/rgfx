import React, { useState } from 'react';
import { IconButton, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import {
  Brightness4,
  Brightness7,
  SettingsBrightness,
} from '@mui/icons-material';
import { useColorScheme } from '@mui/material/styles';

export const ThemeToggle: React.FC = () => {
  const { mode, setMode } = useColorScheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  if (!mode) {
    return null;
  }

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleModeChange = (newMode: 'light' | 'dark' | 'system') => {
    setMode(newMode);
    handleClose();
  };

  const icon = mode === 'dark' ? <Brightness4 /> : <Brightness7 />;

  return (
    <>
      <IconButton onClick={handleClick} color="inherit" aria-label="Toggle theme">
        {icon}
      </IconButton>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
        <MenuItem onClick={() => { handleModeChange('system'); }}>
          <ListItemIcon>
            <SettingsBrightness />
          </ListItemIcon>
          <ListItemText>System</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { handleModeChange('light'); }}>
          <ListItemIcon>
            <Brightness7 />
          </ListItemIcon>
          <ListItemText>Light</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { handleModeChange('dark'); }}>
          <ListItemIcon>
            <Brightness4 />
          </ListItemIcon>
          <ListItemText>Dark</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};
