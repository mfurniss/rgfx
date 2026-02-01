import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EffectModifiersSection } from '../effect-modifiers-section';

const mockSetStripLifespanScale = vi.fn();
let mockStripLifespanScale = 0.6;

vi.mock('../../../store/ui-store', () => ({
  useUiStore: vi.fn((selector) =>
    selector({
      stripLifespanScale: mockStripLifespanScale,
      setStripLifespanScale: mockSetStripLifespanScale,
      rgfxConfigDirectory: '',
      mameRomsDirectory: '',
      setRgfxConfigDirectory: vi.fn(),
      setMameRomsDirectory: vi.fn(),
    }),
  ),
}));

afterEach(() => {
  cleanup();
});

describe('EffectModifiersSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStripLifespanScale = 0.6;
  });

  describe('rendering', () => {
    it('renders section title', () => {
      render(<EffectModifiersSection />);
      expect(screen.getByText('Effect Modifiers')).toBeDefined();
    });

    it('renders description text', () => {
      render(<EffectModifiersSection />);
      expect(screen.getByText('Adjust effect duration scaling for LED strips')).toBeDefined();
    });

    it('renders current scale value', () => {
      render(<EffectModifiersSection />);
      expect(screen.getByText('Strip Lifespan Scale: 0.60')).toBeDefined();
    });

    it('renders slider with correct aria label', () => {
      render(<EffectModifiersSection />);
      expect(screen.getByRole('slider', { name: 'Strip lifespan scale' })).toBeDefined();
    });

    it('renders helper text', () => {
      render(<EffectModifiersSection />);
      expect(
        screen.getByText(
          'Scales effect duration on LED strips. Lower values = shorter effects. Matrices use full duration.',
        ),
      ).toBeDefined();
    });

    it('renders scale value with different initial value', () => {
      mockStripLifespanScale = 0.35;
      render(<EffectModifiersSection />);
      expect(screen.getByText('Strip Lifespan Scale: 0.35')).toBeDefined();
    });
  });

  describe('slider interaction', () => {
    it('calls setStripLifespanScale when slider value changes', () => {
      render(<EffectModifiersSection />);
      const slider = screen.getByRole('slider');

      // MUI Slider uses aria-valuenow for the current value
      // Simulate a change event
      fireEvent.change(slider, { target: { value: 0.8 } });

      expect(mockSetStripLifespanScale).toHaveBeenCalled();
    });

    it('has correct min value', () => {
      render(<EffectModifiersSection />);
      const slider = screen.getByRole('slider');
      expect(slider.getAttribute('aria-valuemin')).toBe('0.1');
    });

    it('has correct max value', () => {
      render(<EffectModifiersSection />);
      const slider = screen.getByRole('slider');
      expect(slider.getAttribute('aria-valuemax')).toBe('1');
    });

    it('has correct current value', () => {
      render(<EffectModifiersSection />);
      const slider = screen.getByRole('slider');
      expect(slider.getAttribute('aria-valuenow')).toBe('0.6');
    });
  });
});
