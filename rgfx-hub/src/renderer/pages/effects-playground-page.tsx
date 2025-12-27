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
} from '@mui/icons-material';
import { PageTitle } from '../components/layout/page-title';
import { TargetDriversPicker } from '../components/driver/target-drivers-picker';
import SuperButton from '../components/common/super-button';
import { useDriverStore } from '../store/driver-store';
import { useUiStore } from '../store/ui-store';
import type { EffectPayload } from '@/types/transformer-types';
import { effectSchemas, effectPropsSchemas, isEffectName } from '@/schemas';
import { EffectForm } from '../components/effect-form';
import { randomizeEffectProps } from '../utils/randomize-effect-props';

// Build map of effect keys to display names from schema literals
// Extract literal value from z.literal() schema via internal _zod.def.values
const effectDisplayNames = Object.fromEntries(
  Object.entries(effectSchemas).map(([key, schema]) => {
    const nameSchema = schema.shape.name as { _zod: { def: { values: string[] } } };
    return [key, nameSchema._zod.def.values[0]];
  }),
);

// Sort by display name for a more intuitive list
const formEffects = Object.keys(effectSchemas).sort((a, b) =>
  effectDisplayNames[a].localeCompare(effectDisplayNames[b]),
);

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      sx={{ pt: 3 }}
    >
      {value === index && children}
    </Box>
  );
}

function generateBroadcastCode(
  effect: string,
  props: Record<string, unknown>,
  drivers: string[],
  isAllDrivers: boolean,
): string {
  const formatValue = (value: unknown, indent: number): string => {
    const spaces = '  '.repeat(indent);

    if (value === null) {
      return 'null';
    }

    if (typeof value === 'string') {
      return `'${value}'`;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return '[]';
      }

      // Format short arrays inline, longer arrays on multiple lines
      if (value.length <= 3) {
        const items = value.map((v) => formatValue(v, 0)).join(', ');

        return `[${items}]`;
      }

      const items = value.map((v) => `${spaces}  ${formatValue(v, indent + 1)},`);

      return `[\n${items.join('\n')}\n${spaces}]`;
    }

    if (typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>);

      if (entries.length === 0) {
        return '{}';
      }

      const lines = entries.map(([k, v]) => `${spaces}  ${k}: ${formatValue(v, indent + 1)},`);

      return `{\n${lines.join('\n')}\n${spaces}}`;
    }

    return JSON.stringify(value);
  };

  const lines = [
    'broadcast({',
    `  effect: '${effect}',`,
  ];

  // Only include drivers if targeting specific drivers (not all)
  if (!isAllDrivers && drivers.length > 0) {
    lines.push(`  drivers: ${formatValue(drivers, 1)},`);
  }

  lines.push(`  props: ${formatValue(props, 1)},`);
  lines.push('});');

  return lines.join('\n');
}

export default function TestEffectsPage() {
  const [tabIndex, setTabIndex] = useState(0);
  const [copySuccess, setCopySuccess] = useState(false);

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

  const handleTriggerEffect = () => {
    if (selectedDrivers.size === 0) {
      return;
    }
    void (async () => {
      try {
        const props = JSON.parse(propsJson) as Record<string, unknown>;
        const payload: EffectPayload = {
          effect: selectedEffect,
          props,
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
        const randomProps = randomizeEffectProps(effectPropsSchemas[selectedEffect]);
        const randomPropsJson = JSON.stringify(randomProps, null, 2);

        setTestEffectsState(selectedEffect, randomPropsJson, selectedDrivers);

        const payload: EffectPayload = {
          effect: selectedEffect,
          props: randomProps,
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
              <Button
                variant="outlined"
                startIcon={<ResetIcon />}
                onClick={handleResetToDefaults}
                sx={{ minWidth: 120, height: 40 }}
              >
                Reset
              </Button>
            </Box>

            {currentSchema && (
              <EffectForm
                schema={currentSchema}
                defaultValues={currentProps}
                onChange={handlePropsChange}
              />
            )}

            <TargetDriversPicker
              drivers={drivers}
              selectedDrivers={selectedDrivers}
              selectAll={selectAll}
              onDriverToggle={handleDriverToggle}
              onSelectAll={handleSelectAll}
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <SuperButton
                variant="contained"
                color="primary"
                onClick={handleTriggerEffect}
                icon={<ScienceIcon />}
              >
                Trigger Effect
              </SuperButton>
              <SuperButton
                variant="outlined"
                color="primary"
                onClick={handleRandomTrigger}
                icon={<ShuffleIcon />}
              >
                Random Trigger
              </SuperButton>
            </Box>
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
