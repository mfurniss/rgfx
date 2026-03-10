import React from 'react';
import { Divider, List, ListItem, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import UsbIcon from '@mui/icons-material/Usb';
import MonitorIcon from '@mui/icons-material/Monitor';
import FirmwareIcon from '@mui/icons-material/Memory';
import ScienceIcon from '@mui/icons-material/Science';
import TerminalIcon from '@mui/icons-material/Terminal';
import SettingsIcon from '@mui/icons-material/Settings';
import InfoIcon from '@mui/icons-material/Info';
import GamesIcon from '@mui/icons-material/SportsEsports';
import HelpIcon from '@mui/icons-material/HelpOutline';
import { useLocation, useNavigate } from 'react-router-dom';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactElement;
  dividerAfter?: boolean;
}

const navItems: NavItem[] = [
  { label: 'System Status', path: '/', icon: <DashboardIcon /> },
  { label: 'Drivers', path: '/drivers', icon: <UsbIcon /> },
  { label: 'Firmware', path: '/firmware', icon: <FirmwareIcon />, dividerAfter: true },
  { label: 'Games', path: '/games', icon: <GamesIcon /> },
  { label: 'Event Monitor', path: '/events', icon: <MonitorIcon /> },
  { label: 'FX Playground', path: '/effects-playground', icon: <ScienceIcon /> },
  { label: 'Simulator', path: '/simulator', icon: <TerminalIcon />, dividerAfter: true },
  { label: 'Settings', path: '/settings', icon: <SettingsIcon /> },
  { label: 'Help', path: '/help', icon: <HelpIcon /> },
  { label: 'About', path: '/about', icon: <InfoIcon /> },
];

export function SidebarNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavigate = (path: string) => {
    void navigate(path);
  };

  return (
    <List>
      {navItems.map((item) => {
        // Use startsWith for /drivers to highlight on sub-pages like /drivers/:mac
        const isActive =
          item.path === '/drivers'
            ? location.pathname.startsWith('/drivers')
            : location.pathname === item.path;

        return (
          <React.Fragment key={item.path}>
            <ListItem disablePadding>
              <ListItemButton
                selected={isActive}
                onClick={() => {
                  handleNavigate(item.path);
                }}
              >
                <ListItemIcon sx={{ minWidth: '46px' }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
            {item.dividerAfter && <Divider sx={{ my: 1 }} />}
          </React.Fragment>
        );
      })}
    </List>
  );
}
