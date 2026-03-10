import React from 'react';
import { Box, Stack } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import { PageTitle } from '../components/layout/page-title';
import {
  AppearanceSection,
  BackupSection,
  DirectoriesSection,
  DriverFallbackSection,
  EffectModifiersSection,
  LogsSection,
} from '../components/settings';

const SettingsPage: React.FC = () => {
  return (
    <Box>
      <PageTitle icon={<SettingsIcon />} title="Settings" />
      <Stack spacing={3}>
        <AppearanceSection />
        <DriverFallbackSection />
        <EffectModifiersSection />
        <DirectoriesSection />
        <BackupSection />
        <LogsSection />
      </Stack>
    </Box>
  );
};

export default SettingsPage;
