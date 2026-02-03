import React from 'react';
import { Box, Stack } from '@mui/material';
import { Settings as SettingsIcon } from '@mui/icons-material';
import { PageTitle } from '../components/layout/page-title';
import {
  AppearanceSection,
  DirectoriesSection,
  EffectModifiersSection,
  LogsSection,
} from '../components/settings';

const SettingsPage: React.FC = () => {
  return (
    <Box>
      <PageTitle icon={<SettingsIcon />} title="Settings" />
      <Stack spacing={3}>
        <AppearanceSection />
        <EffectModifiersSection />
        <DirectoriesSection />
        <LogsSection />
      </Stack>
    </Box>
  );
};

export default SettingsPage;
