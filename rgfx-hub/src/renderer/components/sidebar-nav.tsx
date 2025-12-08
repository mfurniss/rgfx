import React from 'react';
import { List, ListItem, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Monitor as MonitorIcon,
  Memory as FirmwareIcon,
  Science as ScienceIcon,
  Terminal as TerminalIcon,
  Settings as SettingsIcon,
  Info as InfoIcon,
  SportsEsports as GamesIcon,
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactElement;
}

const navItems: NavItem[] = [
  { label: 'System Status', path: '/', icon: <DashboardIcon /> },
  { label: 'Games', path: '/games', icon: <GamesIcon /> },
  { label: 'Event Monitor', path: '/events', icon: <MonitorIcon /> },
  { label: 'Firmware', path: '/firmware', icon: <FirmwareIcon /> },
  { label: 'FX Playground', path: '/effects-playground', icon: <ScienceIcon /> },
  { label: 'Simulator', path: '/simulator', icon: <TerminalIcon /> },
  { label: 'Settings', path: '/settings', icon: <SettingsIcon /> },
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
        const isActive = location.pathname === item.path;

        return (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              selected={isActive}
              onClick={() => {
                handleNavigate(item.path);
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        );
      })}
    </List>
  );
}
