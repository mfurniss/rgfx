import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { z } from 'zod';
import { EffectForm } from '../effect-form';
import type { LayoutConfig } from '@/schemas/effects';

/**
 * These tests verify that the EffectForm correctly renders fields
 * using either the default flat layout or a custom column-based layout.
 */

const testSchema = z.object({
  fieldA: z.string().default('A'),
  fieldB: z.string().default('B'),
  fieldC: z.number().default(100),
  fieldD: z.boolean().default(false),
});

const defaultValues = {
  fieldA: 'A',
  fieldB: 'B',
  fieldC: 100,
  fieldD: false,
};

describe('EffectForm', () => {
  afterEach(() => {
    cleanup();
  });

  describe('default layout (no layoutConfig)', () => {
    it('should render all fields', () => {
      const onChange = vi.fn();
      render(
        <EffectForm
          schema={testSchema}
          defaultValues={defaultValues}
          onChange={onChange}
        />,
      );

      // All fields should be rendered
      expect(screen.getByLabelText('Field A')).toBeDefined();
      expect(screen.getByLabelText('Field B')).toBeDefined();
      expect(screen.getByLabelText('Field C')).toBeDefined();
      expect(screen.getByLabelText('Field D')).toBeDefined();
    });

    it('should render fields in flat 2-column grid', () => {
      const onChange = vi.fn();
      const { container } = render(
        <EffectForm
          schema={testSchema}
          defaultValues={defaultValues}
          onChange={onChange}
        />,
      );

      // Each field should be in its own Grid item (no Stack wrapping)
      const gridItems = container.querySelectorAll('.MuiGrid-root > .MuiGrid-root');
      expect(gridItems.length).toBe(4); // One for each field
    });
  });

  describe('custom layout (with layoutConfig)', () => {
    const layoutConfig: LayoutConfig = [
      ['fieldA', 'fieldB'],
      ['fieldC', 'fieldD'],
    ];

    it('should render all fields from layout config', () => {
      const onChange = vi.fn();
      render(
        <EffectForm
          schema={testSchema}
          defaultValues={defaultValues}
          onChange={onChange}
          layoutConfig={layoutConfig}
        />,
      );

      expect(screen.getByLabelText('Field A')).toBeDefined();
      expect(screen.getByLabelText('Field B')).toBeDefined();
      expect(screen.getByLabelText('Field C')).toBeDefined();
      expect(screen.getByLabelText('Field D')).toBeDefined();
    });

    it('should render fields in stacked columns', () => {
      const onChange = vi.fn();
      const { container } = render(
        <EffectForm
          schema={testSchema}
          defaultValues={defaultValues}
          onChange={onChange}
          layoutConfig={layoutConfig}
        />,
      );

      // Should have 2 columns (Grid items containing Stack)
      const stacks = container.querySelectorAll('.MuiStack-root');
      expect(stacks.length).toBe(2);

      // First stack should contain fieldA and fieldB
      const firstStack = stacks[0];
      expect(firstStack.textContent).toContain('Field A');
      expect(firstStack.textContent).toContain('Field B');

      // Second stack should contain fieldC and fieldD
      const secondStack = stacks[1];
      expect(secondStack.textContent).toContain('Field C');
      expect(secondStack.textContent).toContain('Field D');
    });

    it('should skip fields not found in schema', () => {
      const layoutWithMissingField: LayoutConfig = [
        ['fieldA', 'nonExistentField'],
        ['fieldC'],
      ];

      const onChange = vi.fn();
      const { container } = render(
        <EffectForm
          schema={testSchema}
          defaultValues={defaultValues}
          onChange={onChange}
          layoutConfig={layoutWithMissingField}
        />,
      );

      // Should render fieldA and fieldC, but not crash on nonExistentField
      expect(screen.getByLabelText('Field A')).toBeDefined();
      expect(screen.getByLabelText('Field C')).toBeDefined();

      // nonExistentField should be silently skipped
      const allLabels = container.textContent;
      expect(allLabels).not.toContain('Non Existent Field');
    });

    it('should only render fields specified in layout config', () => {
      const partialLayout: LayoutConfig = [['fieldA', 'fieldC']];

      const onChange = vi.fn();
      render(
        <EffectForm
          schema={testSchema}
          defaultValues={defaultValues}
          onChange={onChange}
          layoutConfig={partialLayout}
        />,
      );

      // Only fieldA and fieldC should be rendered
      expect(screen.getByLabelText('Field A')).toBeDefined();
      expect(screen.getByLabelText('Field C')).toBeDefined();

      // fieldB and fieldD should NOT be rendered (not in layout)
      expect(screen.queryByLabelText('Field B')).toBeNull();
      expect(screen.queryByLabelText('Field D')).toBeNull();
    });
  });

  describe('layout config with single-field columns', () => {
    it('should render single field per column correctly', () => {
      const singleFieldLayout: LayoutConfig = [['fieldA'], ['fieldB'], ['fieldC'], ['fieldD']];

      const onChange = vi.fn();
      const { container } = render(
        <EffectForm
          schema={testSchema}
          defaultValues={defaultValues}
          onChange={onChange}
          layoutConfig={singleFieldLayout}
        />,
      );

      // Should have 4 stacks (one per column)
      const stacks = container.querySelectorAll('.MuiStack-root');
      expect(stacks.length).toBe(4);
    });
  });

  describe('layout config with empty columns', () => {
    it('should handle empty field arrays gracefully', () => {
      const emptyColumnLayout: LayoutConfig = [['fieldA'], []];

      const onChange = vi.fn();
      const { container } = render(
        <EffectForm
          schema={testSchema}
          defaultValues={defaultValues}
          onChange={onChange}
          layoutConfig={emptyColumnLayout}
        />,
      );

      // Should render without crashing
      expect(screen.getByLabelText('Field A')).toBeDefined();

      // Should have 2 stacks (including the empty one)
      const stacks = container.querySelectorAll('.MuiStack-root');
      expect(stacks.length).toBe(2);
    });
  });
});
