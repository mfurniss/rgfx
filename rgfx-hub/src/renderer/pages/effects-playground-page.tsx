/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  LayersClear as LayersClearIcon,
  Palette as PaletteIcon,
} from '@mui/icons-material';
import { PageTitle } from '../components/layout/page-title';
import { TargetDriversPicker } from '../components/driver/target-drivers-picker';
import SuperButton from '../components/common/super-button';
import { useDriverStore } from '../store/driver-store';
import { useUiStore } from '../store/ui-store';
import type { EffectPayload } from '@/types/transformer-types';
import { effectPropsSchemas, effectRandomizers, effectPresetConfigs, isEffectName } from '@/schemas';
import type { PresetData } from '@/schemas';
import { EffectForm } from '../components/effect-form';
import { PresetSelectorModal } from '../components/effect-form/preset-selector-modal';
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

  const connectedDriverIds = useDriverStore((state) =>
    state.drivers
      .filter((d) => d.state === 'connected')
      .map((d) => d.id)
      .sort()
      .join(','),
  );

  const drivers = useDriverStore((state) => state.drivers);
  const connectedDrivers = drivers.filter((d) => d.state === 'connected');

  const selectedEffect = useUiStore((state) => state.testEffectsSelectedEffect);
  const propsMap = useUiStore((state) => state.testEffectsPropsMap);
  const setTestEffectsState = useUiStore((state) => state.setTestEffectsState);

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

  // Get props schema for selected effect (without name/description metadata)
  const currentSchema = useMemo(() => {
    if (isEffectName(selectedEffect)) {
      return effectPropsSchemas[selectedEffect];
    }
    return null;
  }, [selectedEffect]);

  // Get preset config for selected effect (if it has one)
  const presetConfig = useMemo(() => {
    if (isEffectName(selectedEffect)) {
      return effectPresetConfigs[selectedEffect] ?? null;
    }
    return null;
  }, [selectedEffect]);

  // Remove disconnected drivers from selection (but don't auto-select new ones)
  useEffect(() => {
    const connectedIds = new Set(connectedDriverIds.split(',').filter(Boolean));
    const stillConnected = new Set(
      Array.from(selectedDrivers).filter((id) => connectedIds.has(id)),
    );

    // Only update if selection actually changed (driver disconnected)
    if (stillConnected.size !== selectedDrivers.size) {
      setSelectedDrivers(stillConnected);
      setTestEffectsState(selectedEffect, propsJson, stillConnected);
    }
  }, [connectedDriverIds, selectedEffect, propsJson, selectedDrivers, setTestEffectsState]);

  const handleEffectChange = (effect: string) => {
    if (effect !== selectedEffect && isEffectName(effect)) {
      // Get saved props for this effect, or use defaults
      const savedProps = propsMap[effect];
      const defaultProps = JSON.stringify(effectPropsSchemas[effect].parse({}), null, 2);
      setTestEffectsState(effect, savedProps || defaultProps, selectedDrivers);
    }
  };

  const handlePropsChange = useCallback(
    (values: Record<string, unknown>) => {
      const newPropsJson = JSON.stringify(values, null, 2);
      setTestEffectsState(selectedEffect, newPropsJson, selectedDrivers);
    },
    [selectedEffect, selectedDrivers, setTestEffectsState],
  );

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
        };
        void window.rgfx.triggerEffect(payload);
      }
    },
    [presetConfig, currentProps, selectedEffect, selectedDrivers, setTestEffectsState],
  );

  const handleTriggerEffect = () => {
    if (selectedDrivers.size === 0) {
      return;
    }
    void (async () => {
      try {
        const props = JSON.parse(propsJson) as Record<string, unknown>;
        // Strip internal markers before sending to driver
        const cleanProps = { ...props };
        delete cleanProps.__gifPath;

        const payload: EffectPayload = {
          effect: selectedEffect,
          props: cleanProps,
          drivers: Array.from(selectedDrivers),
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

  const handleClearEffects = () => {
    void (async () => {
      for (const driver of connectedDrivers) {
        try {
          await window.rgfx.sendDriverCommand(driver.id, 'clear-effects', '');
        } catch (err) {
          console.error('Failed to clear effects on driver:', driver.id, err);
        }
      }
    })();
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <PageTitle icon={<ScienceIcon />} title="Effects Playground" />
        <Button
          variant="outlined"
          color="warning"
          startIcon={<LayersClearIcon />}
          onClick={handleClearEffects}
          disabled={connectedDrivers.length === 0}
        >
          Clear All Effects
        </Button>
      </Box>

      <Paper sx={{ p: 3, mt: 2 }}>
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
            disabled={selectedDrivers.size === 0}
          >
            Trigger Effect
          </SuperButton>
          <SuperButton
            variant="outlined"
            color="primary"
            onClick={handleRandomTrigger}
            icon={<ShuffleIcon />}
            disabled={selectedDrivers.size === 0}
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
              {/* Show preset button except for background (has its own in gradient field) */}
              {presetConfig && selectedEffect !== 'background' && (
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
    </Box>
  );
}
