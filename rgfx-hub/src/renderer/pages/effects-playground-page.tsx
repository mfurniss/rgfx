import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { debounce } from 'lodash-es';
import {
  Alert,
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Button,
} from '@mui/material';
import ScienceIcon from '@mui/icons-material/Science';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import CopyIcon from '@mui/icons-material/ContentCopy';
import ResetIcon from '@mui/icons-material/RestartAlt';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import PaletteIcon from '@mui/icons-material/Palette';
import { PageTitle } from '../components/layout/page-title';
import { TargetDriversPicker } from '../components/driver/target-drivers-picker';
import SuperButton from '../components/common/super-button';
import { useDriverStore } from '../store/driver-store';
import { useSystemStatusStore } from '../store/system-status-store';
import { useUiStore } from '../store/ui-store';
import { useDriverSelection } from '../hooks/use-driver-selection';
import type { EffectPayload } from '@/types/transformer-types';
import { effectPropsSchemas, effectRandomizers, effectPresetConfigs, effectFieldTypes, effectFormDefaults, effectLayoutConfigs, isEffectName } from '@/schemas';
import type { PresetData } from '@/schemas';
import { EffectForm } from '../components/effect-form';
import { PresetSelectorModal } from '../components/effect-form/preset-selector-modal';
import { ClearAllEffectsButton } from '../components/common/clear-all-effects-button';
import {
  effectDisplayNames,
  formEffects,
  TabPanel,
  generateBroadcastCode,
} from './effects-playground';

export default function TestEffectsPage() {
  const [tabIndex, setTabIndex] = useState(0);
  const [copySuccess, setCopySuccess] = useState(false);
  const [presetModalOpen, setPresetModalOpen] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [isFormValid, setIsFormValid] = useState(true);
  const ffmpegAvailable = useSystemStatusStore(
    (s) => s.systemStatus.ffmpegAvailable,
  );

  const drivers = useDriverStore((state) => state.drivers);
  const connectedDrivers = useMemo(
    () => drivers.filter((d) => d.state === 'connected' && !d.disabled),
    [drivers],
  );
  const selectedEffect = useUiStore((state) => state.testEffectsSelectedEffect);
  const propsMap = useUiStore((state) => state.testEffectsPropsMap);
  const setTestEffectsState = useUiStore((state) => state.setTestEffectsState);
  const stripLifespanScale = useUiStore((state) => state.stripLifespanScale);

  const getDefaultProps = useCallback((effect: string) => {
    if (!isEffectName(effect)) {
      return '{}';
    }
    const schemaDefaults = effectPropsSchemas[effect].parse({});
    const extras = effectFormDefaults[effect];
    return JSON.stringify(
      extras ? { ...schemaDefaults, ...extras } : schemaDefaults, null, 2,
    );
  }, []);

  // Get props JSON for current effect, falling back to defaults if not in map
  const propsJson = useMemo(() => {
    const savedProps = propsMap[selectedEffect];

    if (savedProps) {
      return savedProps;
    }

    return getDefaultProps(selectedEffect);
  }, [propsMap, selectedEffect, getDefaultProps]);

  const { selectedDrivers, selectAll, handleDriverToggle, handleSelectAll, setSelectedDrivers } =
    useDriverSelection({ connectedDrivers });

  // Parse current props from JSON
  const currentProps = useMemo(() => {
    try {
      return JSON.parse(propsJson) as Record<string, unknown>;
    } catch {
      return {};
    }
  }, [propsJson]);

  const currentSchema = isEffectName(selectedEffect)
    ? effectPropsSchemas[selectedEffect]
    : null;

  const presetConfig = isEffectName(selectedEffect)
    ? effectPresetConfigs[selectedEffect] ?? null
    : null;

  const currentFieldTypes = isEffectName(selectedEffect)
    ? effectFieldTypes[selectedEffect]
    : undefined;

  const currentLayoutConfig = isEffectName(selectedEffect)
    ? effectLayoutConfigs[selectedEffect]
    : undefined;

  // Refs keep the debounced callback stable while reading current values
  const selectedEffectRef = useRef(selectedEffect);
  selectedEffectRef.current = selectedEffect;
  const selectedDriversRef = useRef(selectedDrivers);
  selectedDriversRef.current = selectedDrivers;
  const propsJsonRef = useRef(propsJson);
  propsJsonRef.current = propsJson;

  const handleEffectChange = (effect: string) => {
    if (effect !== selectedEffect && isEffectName(effect)) {
      // Get saved props for this effect, or use defaults
      const savedProps = propsMap[effect];
      setTestEffectsState(effect, savedProps || getDefaultProps(effect), selectedDrivers);
      setVideoPlaying(false);
    }
  };

  // Debounce store writes so rapid keystrokes batch
  const handlePropsChange = useMemo(
    () => debounce((values: Record<string, unknown>) => {
      const newPropsJson = JSON.stringify(values, null, 2);
      setTestEffectsState(
        selectedEffectRef.current,
        newPropsJson,
        selectedDriversRef.current,
      );
    }, 150),
    [setTestEffectsState],
  );

  useEffect(() => () => {
    handlePropsChange.cancel();
  }, [handlePropsChange]);

  // Wrap toggle/selectAll to also persist to test effects store
  const handleDriverToggleWithPersist = (driverId: string) => {
    handleDriverToggle(driverId);
    // Use functional update to get the post-toggle value
    setSelectedDrivers((current) => {
      setTestEffectsState(selectedEffect, propsJson, current);
      return current;
    });
  };

  const handleSelectAllWithPersist = () => {
    handleSelectAll();
    // Use functional update to get the post-toggle value
    setSelectedDrivers((current) => {
      setTestEffectsState(selectedEffect, propsJson, current);
      return current;
    });
  };

  const handleResetToDefaults = () => {
    if (isEffectName(selectedEffect)) {
      setTestEffectsState(selectedEffect, getDefaultProps(selectedEffect), selectedDrivers);
    }
  };

  const handlePresetSelect = useCallback(
    (data: PresetData) => {
      if (!presetConfig) {
        return;
      }
      const newProps = presetConfig.apply(data, currentProps);
      const newPropsJson = JSON.stringify(newProps, null, 2);
      setTestEffectsState(selectedEffect, newPropsJson, selectedDrivers);

      // Trigger effect with preset
      if (selectedDrivers.size > 0) {
        const payload: EffectPayload = {
          effect: selectedEffect,
          props: newProps,
          drivers: Array.from(selectedDrivers),
          stripLifespanScale,
        };
        void window.rgfx.triggerEffect(payload);
      }
    },
    [
      presetConfig, currentProps, selectedEffect, selectedDrivers, setTestEffectsState,
      stripLifespanScale,
    ],
  );

  const handleTriggerEffect = () => {
    if (selectedDrivers.size === 0) {
      return;
    }

    // Flush debounced form changes so store is current
    handlePropsChange.flush();

    try {
      // Read from store after flush (reactive state may lag this render cycle)
      const storeProps =
        useUiStore.getState().testEffectsPropsMap[selectedEffect] ?? propsJson;
      const props = JSON.parse(storeProps) as Record<string, unknown>;
      // Strip internal markers before sending to driver
      const cleanProps = { ...props };
      delete cleanProps.__gifPath;

      const payload: EffectPayload = {
        effect: selectedEffect,
        props: cleanProps,
        drivers: Array.from(selectedDrivers),
        stripLifespanScale,
      };

      void window.rgfx.triggerEffect(payload);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRandomTrigger = () => {
    if (selectedDrivers.size === 0) {
      return;
    }

    if (!isEffectName(selectedEffect)) {
      return;
    }

    handlePropsChange.flush();

    try {
      const randomizedProps = effectRandomizers[selectedEffect]();
      const mergedProps = { ...currentProps, ...randomizedProps };
      const mergedPropsJson = JSON.stringify(mergedProps, null, 2);

      setTestEffectsState(selectedEffect, mergedPropsJson, selectedDrivers);

      const payload: EffectPayload = {
        effect: selectedEffect,
        props: mergedProps,
        drivers: Array.from(selectedDrivers),
        stripLifespanScale,
      };

      void window.rgfx.triggerEffect(payload);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyCode = async () => {
    const code = generateBroadcastCode(
      selectedEffect,
      currentProps,
      Array.from(selectedDrivers),
      selectAll,
    );
    await navigator.clipboard.writeText(code);
    setCopySuccess(true);
    setTimeout(() => {
      setCopySuccess(false);
    }, 2000);
  };

  const broadcastCode = generateBroadcastCode(
    selectedEffect,
    currentProps,
    Array.from(selectedDrivers),
    selectAll,
  );

  return (
    <Box>
      <Stack spacing={2}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
            <Stack spacing={3}>
              {selectedEffect === 'video' && !ffmpegAvailable && (
                <Alert severity="warning">
                  ffmpeg is not installed. Install it to use the video
                  effect (e.g. <code>brew install ffmpeg</code>).
                </Alert>
              )}
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Effect</InputLabel>
                  <Select
                    value={selectedEffect}
                    label="Effect"
                    onChange={(e) => {
                      handleEffectChange(e.target.value);
                    }}
                  >
                    {formEffects.map((effect) => (
                      <MenuItem key={effect} value={effect}>
                        {effectDisplayNames[effect]}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {presetConfig && (
                  <Button
                    variant="outlined"
                    startIcon={<PaletteIcon />}
                    onClick={() => {
                      setPresetModalOpen(true);
                    }}
                    sx={{ minWidth: 160, height: 40 }}
                  >
                    Select Preset
                  </Button>
                )}
                <Button
                  variant="outlined"
                  startIcon={<ResetIcon />}
                  onClick={handleResetToDefaults}
                  sx={{ minWidth: 120, height: 40 }}
                >
                  Reset
                </Button>
              </Box>

              {presetConfig && (
                <PresetSelectorModal
                  open={presetModalOpen}
                  type={presetConfig.type}
                  onClose={() => {
                    setPresetModalOpen(false);
                  }}
                  onSelect={handlePresetSelect}
                />
              )}

              {currentSchema && (
                <EffectForm
                  schema={currentSchema}
                  defaultValues={currentProps}
                  onChange={handlePropsChange}
                  onValidityChange={setIsFormValid}
                  fieldTypes={currentFieldTypes}
                  layoutConfig={currentLayoutConfig}
                />
              )}
            </Stack>
          </TabPanel>

          <TabPanel value={tabIndex} index={1}>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle2">
                  Copy this code to the transformer JavaScript (.js) file.
                </Typography>
                <Tooltip title={copySuccess ? 'Copied!' : 'Copy to clipboard'}>
                  <IconButton onClick={() => {
                    void handleCopyCode();
                  }} size="small">
                    <CopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              <Box
                component="pre"
                sx={{
                  p: 2,
                  bgcolor: 'grey.900',
                  color: 'grey.100',
                  borderRadius: 1,
                  overflow: 'auto',
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  m: 0,
                }}
              >
                {broadcastCode}
              </Box>
            </Stack>
          </TabPanel>
        </Paper>
      </Stack>
    </Box>
  );
}
