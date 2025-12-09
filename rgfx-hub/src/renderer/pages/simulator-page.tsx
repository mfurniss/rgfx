import React from 'react';
import {
  Box,
  Paper,
  TextField,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Terminal as TerminalIcon, PlayArrow as PlayArrowIcon } from '@mui/icons-material';
import { useUiStore, SimulatorAutoInterval } from '../store/ui-store';
import SuperButton from '../components/super-button';
import { PageTitle } from '../components/page-title';

export default function SimulatorPage() {
  const simulatorRows = useUiStore((state) => state.simulatorRows);
  const setSimulatorRow = useUiStore((state) => state.setSimulatorRow);

  const handleTrigger = (eventLine: string) => {
    if (!eventLine.trim()) {
      return;
    }

    void (async () => {
      try {
        await window.rgfx.simulateEvent(eventLine);
      } catch (err) {
        console.error(err);
      }
    })();
  };

  const handleKeyDown = (e: React.KeyboardEvent, eventLine: string) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTrigger(eventLine);
    }
  };

  return (
    <Box>
      <PageTitle icon={<TerminalIcon />} title="Event Simulator" />

      <Paper sx={{ p: 3, mt: 2 }}>
        <Stack spacing={2}>
          {simulatorRows.map((row, index) => (
            <Stack key={index} direction="row" spacing={2} alignItems="center">
              <TextField
                placeholder="game/subject/property/qualifier payload"
                value={row.eventLine}
                onChange={(e) => {
                  setSimulatorRow(index, e.target.value, row.autoInterval);
                }}
                onKeyDown={(e) => {
                  handleKeyDown(e, row.eventLine);
                }}
                fullWidth
                size="small"
                sx={{
                  '& .MuiInputBase-input': { fontFamily: 'monospace' },
                }}
              />
              <SuperButton
                variant="contained"
                color="primary"
                onClick={() => {
                  handleTrigger(row.eventLine);
                }}
                disabled={!row.eventLine.trim()}
                icon={<PlayArrowIcon />}
                sx={{ flexShrink: 0 }}
                size="small"
              >
                Trigger
              </SuperButton>
              <FormControl sx={{ minWidth: 140, flexShrink: 0 }} size="small">
                <InputLabel>Auto Trigger</InputLabel>
                <Select
                  value={row.autoInterval}
                  label="Auto Trigger"
                  onChange={(e) => {
                    setSimulatorRow(index, row.eventLine, e.target.value as SimulatorAutoInterval);
                  }}
                >
                  <MenuItem value="off">Off</MenuItem>
                  <MenuItem value="1s">1 second</MenuItem>
                  <MenuItem value="5s">5 seconds</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          ))}
        </Stack>
      </Paper>
    </Box>
  );
}
