import React from 'react';
import { Box, Drawer, Toolbar, Typography } from '@mui/material';
import { SidebarNav } from './sidebar-nav';

const DRAWER_WIDTH = 240;

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
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            RGFX
          </Typography>
        </Toolbar>
        <SidebarNav />
      </Drawer>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: `calc(100% - ${DRAWER_WIDTH}px)`,
          overflow: 'auto',
          backgroundColor: 'action.hover',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
