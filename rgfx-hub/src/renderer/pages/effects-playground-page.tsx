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
} from '@mui/material';
import {
  Science as ScienceIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import { PageTitle } from '../components/page-title';
import { TargetDriversPicker } from '../components/target-drivers-picker';
import SuperButton from '../components/super-button';
import { useDriverStore } from '../store/driver-store';
import { useUiStore } from '../store/ui-store';
import type { EffectPayload } from '@/types/transformer-types';
import { effectSchemas, isEffectName } from '@/schemas';
import { EffectForm } from '../components/effect-form';

// Effects to show in the form (exclude bitmap which needs special handling)
const formEffects = Object.keys(effectSchemas).filter((e) => e !== 'bitmap').sort();

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

      const items = value.map((v) => formatValue(v, 0)).join(', ');

      return `[${items}]`;
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
      .filter((d) => d.connected)
      .map((d) => d.id)
      .sort()
      .join(','),
  );

  const drivers = useDriverStore((state) => state.drivers);
  const connectedDrivers = drivers.filter((d) => d.connected);

  const selectedEffect = useUiStore((state) => state.testEffectsSelectedEffect);
  const propsJson = useUiStore((state) => state.testEffectsPropsJson);
  const storedSelectedDrivers = useUiStore((state) => state.testEffectsSelectedDrivers);
  const selectAll = useUiStore((state) => state.testEffectsSelectAll);
  const setTestEffectsState = useUiStore((state) => state.setTestEffectsState);

  const [selectedDrivers, setSelectedDrivers] = useState<Set<string>>(
    new Set(storedSelectedDrivers),
  );

  // Parse current props from JSON
  const currentProps = useMemo(() => {
    try {
      return JSON.parse(propsJson) as Record<string, unknown>;
    } catch {
      return {};
    }
  }, [propsJson]);

  // Get schema for selected effect
  const currentSchema = useMemo(() => {
    if (isEffectName(selectedEffect) && selectedEffect !== 'bitmap') {
      return effectSchemas[selectedEffect];
    }
    return null;
  }, [selectedEffect]);

  useEffect(() => {
    const driverIds = connectedDriverIds.split(',').filter(Boolean);
    const newSelectedDrivers = new Set(driverIds);
    setSelectedDrivers(newSelectedDrivers);
    setTestEffectsState(selectedEffect, propsJson, newSelectedDrivers, driverIds.length > 0);
  }, [connectedDriverIds, selectedEffect, propsJson, setTestEffectsState]);

  const handleEffectChange = (effect: string) => {
    if (effect !== selectedEffect && isEffectName(effect)) {
      const defaults = effectSchemas[effect].parse({});
      const newPropsJson = JSON.stringify(defaults, null, 2);
      setTestEffectsState(effect, newPropsJson, selectedDrivers, selectAll);
    }
  };

  const handlePropsChange = useCallback(
    (values: Record<string, unknown>) => {
      const newPropsJson = JSON.stringify(values, null, 2);
      setTestEffectsState(selectedEffect, newPropsJson, selectedDrivers, selectAll);
    },
    [selectedEffect, selectedDrivers, selectAll, setTestEffectsState],
  );

  const handleDriverToggle = (driverId: string) => {
    const newSelected = new Set(selectedDrivers);

    if (newSelected.has(driverId)) {
      newSelected.delete(driverId);
    } else {
      newSelected.add(driverId);
    }
    setSelectedDrivers(newSelected);
    const newSelectAll = newSelected.size === connectedDrivers.length;
    setTestEffectsState(selectedEffect, propsJson, newSelected, newSelectAll);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      const emptySet = new Set<string>();
      setSelectedDrivers(emptySet);
      setTestEffectsState(selectedEffect, propsJson, emptySet, false);
    } else {
      const allSelected = new Set(connectedDrivers.map((d) => d.id));
      setSelectedDrivers(allSelected);
      setTestEffectsState(selectedEffect, propsJson, allSelected, true);
    }
  };

  const handleTriggerEffect = () => {
    void (async () => {
      try {
        const props = JSON.parse(propsJson) as Record<string, unknown>;
        const payload: EffectPayload = {
          effect: selectedEffect,
          props,
        };

        if (selectedDrivers.size > 0) {
          payload.drivers = Array.from(selectedDrivers);
        }
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
      <PageTitle icon={<ScienceIcon />} title="Effects Playground" />

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
                    {effect}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

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

            <SuperButton
              variant="contained"
              color="primary"
              onClick={handleTriggerEffect}
              disabled={connectedDrivers.length === 0 || selectedDrivers.size === 0}
              icon={<ScienceIcon />}
            >
              Trigger Effect
            </SuperButton>
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
