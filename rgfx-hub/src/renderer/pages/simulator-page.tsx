import React from 'react';
import { Box, Paper, Stack } from '@mui/material';
import { Terminal as TerminalIcon } from '@mui/icons-material';
import { SIMULATOR_ROW_COUNT } from '@/config/constants';
import { PageTitle } from '../components/layout/page-title';
import { ClearAllEffectsButton } from '../components/common/clear-all-effects-button';
import { SimulatorRow } from '../components/simulator/simulator-row';

const ROW_INDICES = Array.from({ length: SIMULATOR_ROW_COUNT }, (_, i) => i);

export default function SimulatorPage() {
  return (
    <Box>
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 2,
      }}>
        <PageTitle icon={<TerminalIcon />} title="Event Simulator" noGutters />
        <ClearAllEffectsButton />
      </Box>

      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          {ROW_INDICES.map((index) => (
            <SimulatorRow key={index} index={index} />
          ))}
        </Stack>
      </Paper>
    </Box>
  );
}
