import React from 'react';
import { Divider, List, ListItem, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Usb as UsbIcon,
  Monitor as MonitorIcon,
  Memory as FirmwareIcon,
  Science as ScienceIcon,
  Terminal as TerminalIcon,
  Settings as SettingsIcon,
  Info as InfoIcon,
  SportsEsports as GamesIcon,
  HelpOutline as SupportIcon,
} from '@mui/icons-material';
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
  { label: 'Support', path: '/support', icon: <SupportIcon /> },
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
