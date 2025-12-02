import React from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Terminal as TerminalIcon, PlayArrow as PlayArrowIcon } from '@mui/icons-material';
import { useUiStore, SimulatorAutoInterval } from '../store/ui-store';

export default function SimulatorPage() {
  const eventLine = useUiStore((state) => state.simulatorEventLine);
  const autoInterval = useUiStore((state) => state.simulatorAutoInterval);
  const setSimulatorState = useUiStore((state) => state.setSimulatorState);

  const handleTrigger = () => {
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTrigger();
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <TerminalIcon />
        Event Simulator
      </Typography>

      <Paper sx={{ p: 3, mt: 2 }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              label="Event Line"
              placeholder="game/subject/property/qualifier payload"
              value={eventLine}
              onChange={(e) => {
                setSimulatorState(e.target.value, autoInterval);
              }}
              onKeyDown={handleKeyDown}
              fullWidth
              sx={{
                '& .MuiInputBase-input': { fontFamily: 'monospace' },
              }}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={handleTrigger}
              disabled={!eventLine.trim()}
              startIcon={<PlayArrowIcon />}
              sx={{ flexShrink: 0 }}
            >
              Trigger
            </Button>
            <FormControl sx={{ minWidth: 140, flexShrink: 0 }} size="small">
              <InputLabel>Auto Trigger</InputLabel>
              <Select
                value={autoInterval}
                label="Auto Trigger"
                onChange={(e) => {
                  setSimulatorState(eventLine, e.target.value as SimulatorAutoInterval);
                }}
              >
                <MenuItem value="off">Off</MenuItem>
                <MenuItem value="1s">1 second</MenuItem>
                <MenuItem value="5s">5 seconds</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}
