import React from 'react';
import { Box, Drawer, Toolbar, Typography } from '@mui/material';
import { SidebarNav } from './sidebar-nav';
import { FirmwareUpdateBanner } from '../firmware/firmware-update-banner';
import { DRAWER_WIDTH } from '@/config/constants';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <Box sx={{ display: 'flex', height: '100%' }}>
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
          },
        }}
      >
        <Toolbar>
          <Typography variant="h4" noWrap component="div" sx={{ flexGrow: 1, pt: 1 }}>
            RGFX
          </Typography>
        </Toolbar>
        <SidebarNav />
      </Drawer>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: `calc(100% - ${DRAWER_WIDTH}px)`,
          overflow: 'auto',
          backgroundColor: 'action.hover',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <FirmwareUpdateBanner />
        <Box sx={{ p: 3, flexGrow: 1 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
