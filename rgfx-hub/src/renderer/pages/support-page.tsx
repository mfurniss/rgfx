import React from 'react';
import { Typography, Box, Paper, Button } from '@mui/material';
import {
  HelpOutline as SupportIcon,
  MenuBook as DocsIcon,
} from '@mui/icons-material';
import { PageTitle } from '../components/page-title';
import { useAppInfoStore } from '../store/app-info-store';

const SupportPage: React.FC = () => {
  const appInfo = useAppInfoStore((state) => state.appInfo);

  const handleOpenDocs = () => {
    if (appInfo?.docsPath) {
      void window.rgfx.openFile(appInfo.docsPath);
    }
  };

  return (
    <Box>
      <PageTitle icon={<SupportIcon />} title="Support" />
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Documentation
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Learn how to set up and use RGFX with comprehensive guides covering the Hub
          application, ESP32 drivers, MAME integration, and LED hardware configuration.
        </Typography>
        <Button
          variant="contained"
          startIcon={<DocsIcon />}
          onClick={handleOpenDocs}
          disabled={!appInfo?.docsPath}
        >
          Open Documentation
        </Button>
      </Paper>
    </Box>
  );
};

export default SupportPage;
