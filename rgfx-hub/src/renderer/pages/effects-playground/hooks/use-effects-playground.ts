import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { debounce } from 'lodash-es';
import { useDriverStore } from '@/renderer/store/driver-store';
import { useSystemStatusStore } from '@/renderer/store/system-status-store';
import { useUiStore } from '@/renderer/store/ui-store';
import { useDriverSelection } from '@/renderer/hooks/use-driver-selection';
import type { EffectPayload } from '@/types/transformer-types';
import type { PresetData } from '@/schemas';
import {
  effectPropsSchemas,
  effectRandomizers,
  effectPresetConfigs,
  effectFieldTypes,
  effectFormDefaults,
  effectLayoutConfigs,
  isEffectName,
} from '@/schemas';
import { generateBroadcastCode } from '../utils/code-generator';

export function useEffectsPlayground() {
  const [tabIndex, setTabIndex] = useState(0);
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
  const savedPropsJson = useUiStore(
    (state) => state.testEffectsPropsMap[state.testEffectsSelectedEffect] ?? '',
  );
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

  const propsJson = savedPropsJson || getDefaultProps(selectedEffect);

  const { selectedDrivers, selectAll, handleDriverToggle, handleSelectAll, setSelectedDrivers } =
    useDriverSelection({ connectedDrivers });

  // Auto-select all when drivers first appear (handles mount before drivers connect)
  const hasInitializedDrivers = useRef(connectedDrivers.length > 0);

  useEffect(() => {
    if (
      !hasInitializedDrivers.current
      && connectedDrivers.length > 0
      && selectedDrivers.size === 0
    ) {
      hasInitializedDrivers.current = true;
      setSelectedDrivers(new Set(connectedDrivers.map((d) => d.id)));
    }
  }, [connectedDrivers, selectedDrivers, setSelectedDrivers]);

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

  const handleEffectChange = (effect: string) => {
    if (effect !== selectedEffect && isEffectName(effect)) {
      const savedProps = useUiStore.getState().testEffectsPropsMap[effect];
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
    setSelectedDrivers((current) => {
      setTestEffectsState(selectedEffect, propsJson, current);
      return current;
    });
  };

  const handleSelectAllWithPersist = () => {
    handleSelectAll();
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

    handlePropsChange.flush();

    try {
      const storeProps =
        useUiStore.getState().testEffectsPropsMap[selectedEffect] ?? propsJson;
      const props = JSON.parse(storeProps) as Record<string, unknown>;
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

  const broadcastCode = useMemo(
    () => generateBroadcastCode(
      selectedEffect,
      currentProps,
      Array.from(selectedDrivers),
      selectAll,
    ),
    [selectedEffect, currentProps, selectedDrivers, selectAll],
  );

  return {
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

    // Grouped props for EffectFormPanel (spread as props)
    formPanelProps: {
      selectedEffect,
      ffmpegAvailable,
      currentSchema,
      currentProps,
      currentFieldTypes,
      currentLayoutConfig,
      presetConfig,
      onEffectChange: handleEffectChange,
      onPropsChange: handlePropsChange,
      onValidityChange: setIsFormValid,
      onPresetSelect: handlePresetSelect,
      onResetToDefaults: handleResetToDefaults,
    },
  };
}
