import React from 'react';
import { Typography, Box, Paper, Button } from '@mui/material';
import HelpIcon from '@mui/icons-material/HelpOutline';
import DocsIcon from '@mui/icons-material/MenuBook';
import { PageTitle } from '../components/layout/page-title';

const DOCS_URL = 'https://rgfx.io/docs';

const HelpPage: React.FC = () => {
  const handleOpenDocs = () => {
    void window.rgfx.openExternal(DOCS_URL);
  };

  return (
    <Box>
      <PageTitle icon={<HelpIcon />} title="Help" />
      <Paper sx={{ p: 3 }}>
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
        >
          Open Documentation
        </Button>
      </Paper>
    </Box>
  );
};

export default HelpPage;
