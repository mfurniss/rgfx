import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Stack,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { debounce } from 'lodash-es';
import { useUiStore, SimulatorAutoInterval } from '../../store/ui-store';
import SuperButton from '../common/super-button';

const DEBOUNCE_MS = 300;

interface SimulatorRowProps {
  index: number;
}

export const SimulatorRow: React.FC<SimulatorRowProps> = ({ index }) => {
  const row = useUiStore(
    useCallback(
      (state) => state.simulatorRows[index],
      [index],
    ),
  );
  const setSimulatorRow = useUiStore((state) => state.setSimulatorRow);

  const [localEventLine, setLocalEventLine] = useState(row.eventLine);
  const localEventLineRef = useRef(localEventLine);
  localEventLineRef.current = localEventLine;

  // Debounced sync from local state → store
  const debouncedSync = useMemo(
    () =>
      debounce((eventLine: string) => {
        const currentRow = useUiStore.getState().simulatorRows[index];
        setSimulatorRow(index, eventLine, currentRow.autoInterval);
      }, DEBOUNCE_MS),
    [index, setSimulatorRow],
  );

  // Cleanup debounce on unmount
  useEffect(() => () => {
    debouncedSync.cancel();
  }, [debouncedSync]);

  // Sync store → local when store changes externally (e.g., rehydration)
  useEffect(() => {
    if (row.eventLine !== localEventLineRef.current) {
      setLocalEventLine(row.eventLine);
    }
  }, [row.eventLine]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setLocalEventLine(value);
    debouncedSync(value);
  };

  const handleTrigger = () => {
    const eventLine = localEventLineRef.current;

    if (!eventLine.trim()) {
      return;
    }

    // Flush pending debounce so store is current before triggering
    debouncedSync.flush();

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

  const handleAutoIntervalChange = (value: SimulatorAutoInterval) => {
    setSimulatorRow(index, localEventLineRef.current, value);
  };

  return (
    <Stack direction="row" spacing={2} alignItems="center">
      <TextField
        placeholder="game/subject/property/qualifier payload"
        value={localEventLine}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        fullWidth
        size="small"
        sx={{
          '& .MuiInputBase-input': { fontFamily: 'monospace' },
        }}
      />
      <SuperButton
        variant="contained"
        color="primary"
        onClick={handleTrigger}
        disabled={!localEventLine.trim()}
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
            handleAutoIntervalChange(
              e.target.value as SimulatorAutoInterval,
            );
          }}
        >
          <MenuItem value="off">Off</MenuItem>
          <MenuItem value="1s">1 second</MenuItem>
          <MenuItem value="5s">5 seconds</MenuItem>
        </Select>
      </FormControl>
    </Stack>
  );
};
