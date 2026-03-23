import React from 'react';
import { Box, Paper, Stack, Tabs, Tab } from '@mui/material';
import ScienceIcon from '@mui/icons-material/Science';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import { PageTitle } from '../components/layout/page-title';
import { TargetDriversPicker } from '../components/driver/target-drivers-picker';
import SuperButton from '../components/common/super-button';
import { ClearAllEffectsButton } from '../components/common/clear-all-effects-button';
import { TabPanel } from './effects-playground';
import { useEffectsPlayground } from './effects-playground/hooks/use-effects-playground';
import { EffectFormPanel } from './effects-playground/components/effect-form-panel';
import {
  TransformerCodePanel,
} from './effects-playground/components/transformer-code-panel';

export default function TestEffectsPage() {
  const {
    tabIndex,
    setTabIndex,
    videoPlaying,
    setVideoPlaying,
    isFormValid,
    ffmpegAvailable,
    drivers,
    selectedEffect,
    selectedDrivers,
    selectAll,
    currentProps,
    broadcastCode,
    handleDriverToggleWithPersist,
    handleSelectAllWithPersist,
    handleTriggerEffect,
    handleRandomTrigger,
    formPanelProps,
  } = useEffectsPlayground();

  return (
    <Box>
      <Stack spacing={2}>
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <PageTitle icon={<ScienceIcon />} title="Effects Playground" noGutters />
          <ClearAllEffectsButton />
        </Box>

        <Paper sx={{ p: 3 }}>
          <Tabs
            value={tabIndex}
            onChange={(_, v: number) => {
              setTabIndex(v);
            }}
            sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
          >
            <Tab label="Effect Form" />
            <Tab label="Transformer Code" />
          </Tabs>

          <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
            <TargetDriversPicker
              drivers={drivers}
              selectedDrivers={selectedDrivers}
              selectAll={selectAll}
              onDriverToggle={handleDriverToggleWithPersist}
              onSelectAll={handleSelectAllWithPersist}
            />
            {selectedEffect === 'video' ? (
              videoPlaying ? (
                <SuperButton
                  variant="contained"
                  color="error"
                  onClick={() => {
                    void window.rgfx.triggerEffect({
                      effect: 'video',
                      props: { action: 'stop' },
                      drivers: Array.from(selectedDrivers),
                    });
                    setVideoPlaying(false);
                  }}
                  icon={<StopIcon />}
                  disabled={selectedDrivers.size === 0}
                  data-testid="trigger-effect-btn"
                >
                  Stop Video
                </SuperButton>
              ) : (
                <SuperButton
                  variant="contained"
                  color="primary"
                  onClick={() => {
                    handleTriggerEffect();
                    setVideoPlaying(true);
                  }}
                  icon={<PlayArrowIcon />}
                  disabled={
                    selectedDrivers.size === 0
                    || !isFormValid
                    || !currentProps.file
                    || !ffmpegAvailable
                  }
                  data-testid="trigger-effect-btn"
                >
                  Start Video
                </SuperButton>
              )
            ) : (
              <>
                <SuperButton
                  variant="contained"
                  color="primary"
                  onClick={handleTriggerEffect}
                  icon={<ScienceIcon />}
                  disabled={selectedDrivers.size === 0 || !isFormValid}
                  data-testid="trigger-effect-btn"
                >
                  Trigger Effect
                </SuperButton>
                <SuperButton
                  variant="outlined"
                  color="primary"
                  onClick={handleRandomTrigger}
                  icon={<ShuffleIcon />}
                  disabled={
                    selectedDrivers.size === 0 || !isFormValid
                  }
                >
                  Random Trigger
                </SuperButton>
              </>
            )}
          </Box>

          <TabPanel value={tabIndex} index={0}>
            <EffectFormPanel {...formPanelProps} />
          </TabPanel>

          <TabPanel value={tabIndex} index={1}>
            <TransformerCodePanel broadcastCode={broadcastCode} />
          </TabPanel>
        </Paper>
      </Stack>
    </Box>
  );
}
