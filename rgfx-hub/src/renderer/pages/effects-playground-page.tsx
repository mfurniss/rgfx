import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { debounce } from 'lodash-es';
import {
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
import {
  Science as ScienceIcon,
  ContentCopy as CopyIcon,
  RestartAlt as ResetIcon,
  Shuffle as ShuffleIcon,
  Palette as PaletteIcon,
} from '@mui/icons-material';
import { PageTitle } from '../components/layout/page-title';
import { TargetDriversPicker } from '../components/driver/target-drivers-picker';
import SuperButton from '../components/common/super-button';
import { useDriverStore } from '../store/driver-store';
import { useUiStore } from '../store/ui-store';
import type { EffectPayload } from '@/types/transformer-types';
import { effectPropsSchemas, effectRandomizers, effectPresetConfigs, effectFieldTypes, effectLayoutConfigs, isEffectName } from '@/schemas';
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
  const [isFormValid, setIsFormValid] = useState(true);

  const drivers = useDriverStore((state) => state.drivers);
  const connectedDrivers = useMemo(
    () => drivers.filter((d) => d.state === 'connected'),
    [drivers],
  );
  const connectedDriverIds = useMemo(
    () => connectedDrivers.map((d) => d.id).sort(),
    [connectedDrivers],
  );

  const selectedEffect = useUiStore((state) => state.testEffectsSelectedEffect);
  const propsMap = useUiStore((state) => state.testEffectsPropsMap);
  const setTestEffectsState = useUiStore((state) => state.setTestEffectsState);
  const stripLifespanScale = useUiStore((state) => state.stripLifespanScale);

  // Get props JSON for current effect, falling back to defaults if not in map
  const propsJson = useMemo(() => {
    const savedProps = propsMap[selectedEffect];

    if (savedProps) {
      return savedProps;
    }

    if (isEffectName(selectedEffect)) {
      return JSON.stringify(effectPropsSchemas[selectedEffect].parse({}), null, 2);
    }

    return '{}';
  }, [propsMap, selectedEffect]);

  const [selectedDrivers, setSelectedDrivers] = useState<Set<string>>(
    new Set(connectedDrivers.map((d) => d.id)),
  );

  // Derive selectAll from current state - fixes bug where stored selectAll could become stale
  const selectAll = useMemo(
    () => connectedDrivers.length > 0 && connectedDrivers.every((d) => selectedDrivers.has(d.id)),
    [connectedDrivers, selectedDrivers],
  );

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

  // Refs keep the debounced callback and pruning effect stable while reading current values
  const selectedEffectRef = useRef(selectedEffect);
  selectedEffectRef.current = selectedEffect;
  const selectedDriversRef = useRef(selectedDrivers);
  selectedDriversRef.current = selectedDrivers;
  const propsJsonRef = useRef(propsJson);
  propsJsonRef.current = propsJson;

  // Remove disconnected drivers from selection (but don't auto-select new ones).
  // Reads current values from refs so the effect only fires on actual connection changes.
  useEffect(() => {
    const connectedIds = new Set(connectedDriverIds);
    const currentSelection = selectedDriversRef.current;
    const stillConnected = new Set(
      Array.from(currentSelection).filter((id) => connectedIds.has(id)),
    );

    if (stillConnected.size !== currentSelection.size) {
      setSelectedDrivers(stillConnected);
      setTestEffectsState(
        selectedEffectRef.current,
        propsJsonRef.current,
        stillConnected,
      );
    }
  }, [connectedDriverIds, setTestEffectsState]);

  const handleEffectChange = (effect: string) => {
    if (effect !== selectedEffect && isEffectName(effect)) {
      // Get saved props for this effect, or use defaults
      const savedProps = propsMap[effect];
      const defaultProps = JSON.stringify(effectPropsSchemas[effect].parse({}), null, 2);
      setTestEffectsState(effect, savedProps || defaultProps, selectedDrivers);
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

  const handleDriverToggle = (driverId: string) => {
    const newSelected = new Set(selectedDrivers);

    if (newSelected.has(driverId)) {
      newSelected.delete(driverId);
    } else {
      newSelected.add(driverId);
    }
    setSelectedDrivers(newSelected);
    setTestEffectsState(selectedEffect, propsJson, newSelected);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      const emptySet = new Set<string>();
      setSelectedDrivers(emptySet);
      setTestEffectsState(selectedEffect, propsJson, emptySet);
    } else {
      const allSelected = new Set(connectedDrivers.map((d) => d.id));
      setSelectedDrivers(allSelected);
      setTestEffectsState(selectedEffect, propsJson, allSelected);
    }
  };

  const handleResetToDefaults = () => {
    if (isEffectName(selectedEffect)) {
      const defaultProps = JSON.stringify(effectPropsSchemas[selectedEffect].parse({}), null, 2);
      setTestEffectsState(selectedEffect, defaultProps, selectedDrivers);
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

    void (async () => {
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

        await window.rgfx.triggerEffect(payload);
      } catch (err) {
        console.error(err);
      }
    })();
  };

  const handleRandomTrigger = () => {
    if (selectedDrivers.size === 0) {
      return;
    }

    if (!isEffectName(selectedEffect)) {
      return;
    }

    handlePropsChange.flush();

    void (async () => {
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

        await window.rgfx.triggerEffect(payload);
      } catch (err) {
        console.error(err);
      }
    })();
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
              onDriverToggle={handleDriverToggle}
              onSelectAll={handleSelectAll}
            />
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
              disabled={selectedDrivers.size === 0 || !isFormValid}
            >
              Random Trigger
            </SuperButton>
          </Box>

          <TabPanel value={tabIndex} index={0}>
            <Stack spacing={3}>
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
