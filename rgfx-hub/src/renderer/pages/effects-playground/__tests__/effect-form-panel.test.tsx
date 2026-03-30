import React from 'react';
import { render, screen, fireEvent } from '@/__tests__/render';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/renderer/components/effect-form', () => ({
  EffectForm: () => <div data-testid="effect-form">EffectForm</div>,
}));

vi.mock('@/renderer/components/effect-form/preset-selector-modal', () => ({
  PresetSelectorModal: () => <div data-testid="preset-modal">PresetModal</div>,
}));

vi.mock('../effect-helpers', () => ({
  effectDisplayNames: {
    solid: 'Solid',
    pulse: 'Pulse',
  },
  formEffects: ['pulse', 'solid'],
}));

import { EffectFormPanel } from '../components/effect-form-panel';

const defaultProps = {
  selectedEffect: 'solid',
  ffmpegAvailable: true,
  currentSchema: { shape: {} } as never,
  currentProps: { color: '#ff0000' },
  currentFieldTypes: undefined,
  currentLayoutConfig: undefined,
  presetConfig: null,
  onPresetSelect: vi.fn(),
  onEffectChange: vi.fn(),
  onPropsChange: vi.fn(),
  onValidityChange: vi.fn(),
  onResetToDefaults: vi.fn(),
};

describe('EffectFormPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render effect selector', () => {
    render(<EffectFormPanel {...defaultProps} />);

    expect(screen.getByRole('combobox')).toBeTruthy();
  });

  it('should render EffectForm when schema is provided', () => {
    render(<EffectFormPanel {...defaultProps} />);

    expect(screen.getByTestId('effect-form')).toBeTruthy();
  });

  it('should not render EffectForm when schema is null', () => {
    render(<EffectFormPanel {...defaultProps} currentSchema={null} />);

    expect(screen.queryByTestId('effect-form')).toBeNull();
  });

  it('should call onResetToDefaults when reset is clicked', () => {
    render(<EffectFormPanel {...defaultProps} />);

    fireEvent.click(screen.getByText('Reset'));

    expect(defaultProps.onResetToDefaults).toHaveBeenCalled();
  });

  it('should show preset button when presetConfig is provided', () => {
    const presetConfig = { type: 'gradient' as const, apply: vi.fn() };
    render(<EffectFormPanel {...defaultProps} presetConfig={presetConfig} />);

    expect(screen.getByText('Select Preset')).toBeTruthy();
  });

  it('should not show preset button when presetConfig is null', () => {
    render(<EffectFormPanel {...defaultProps} />);

    expect(screen.queryByText('Select Preset')).toBeNull();
  });

  it('should show ffmpeg warning for video effect when unavailable', () => {
    render(
      <EffectFormPanel
        {...defaultProps}
        selectedEffect="video"
        ffmpegAvailable={false}
      />,
    );

    expect(screen.getByText(/ffmpeg is not installed/)).toBeTruthy();
  });

  it('should not show ffmpeg warning when ffmpeg is available', () => {
    render(
      <EffectFormPanel
        {...defaultProps}
        selectedEffect="video"
        ffmpegAvailable={true}
      />,
    );

    expect(screen.queryByText(/ffmpeg is not installed/)).toBeNull();
  });
});
