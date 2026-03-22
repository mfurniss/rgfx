import React from 'react';
import { render, screen, waitFor } from '@/__tests__/render';
import { describe, it, expect, vi } from 'vitest';
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
  describe('default layout (no layoutConfig)', () => {
    it('should render all fields', async () => {
      const onChange = vi.fn();
      render(
        <EffectForm
          schema={testSchema}
          defaultValues={defaultValues}
          onChange={onChange}
        />,
      );

      // All fields should be rendered
      expect(await screen.findByLabelText('Field A')).toBeDefined();
      expect(screen.getByLabelText('Field B')).toBeDefined();
      expect(screen.getByLabelText('Field C')).toBeDefined();
      expect(screen.getByLabelText('Field D')).toBeDefined();
    });

    it('should render fields in flat 2-column grid', async () => {
      const onChange = vi.fn();
      const { container } = render(
        <EffectForm
          schema={testSchema}
          defaultValues={defaultValues}
          onChange={onChange}
        />,
      );

      await waitFor(() => {
        const gridItems = container.querySelectorAll('.MuiGrid-root > .MuiGrid-root');
        expect(gridItems.length).toBe(4);
      });
    });
  });

  describe('custom layout (with layoutConfig)', () => {
    const layoutConfig: LayoutConfig = [
      ['fieldA', 'fieldB'],
      ['fieldC', 'fieldD'],
    ];

    it('should render all fields from layout config', async () => {
      const onChange = vi.fn();
      render(
        <EffectForm
          schema={testSchema}
          defaultValues={defaultValues}
          onChange={onChange}
          layoutConfig={layoutConfig}
        />,
      );

      expect(await screen.findByLabelText('Field A')).toBeDefined();
      expect(screen.getByLabelText('Field B')).toBeDefined();
      expect(screen.getByLabelText('Field C')).toBeDefined();
      expect(screen.getByLabelText('Field D')).toBeDefined();
    });

    it('should render fields in stacked columns', async () => {
      const onChange = vi.fn();
      const { container } = render(
        <EffectForm
          schema={testSchema}
          defaultValues={defaultValues}
          onChange={onChange}
          layoutConfig={layoutConfig}
        />,
      );

      await waitFor(() => {
        const stacks = container.querySelectorAll('.MuiStack-root');
        expect(stacks.length).toBe(2);
      });

      const stacks = container.querySelectorAll('.MuiStack-root');
      expect(stacks[0].textContent).toContain('Field A');
      expect(stacks[0].textContent).toContain('Field B');
      expect(stacks[1].textContent).toContain('Field C');
      expect(stacks[1].textContent).toContain('Field D');
    });

    it('should skip fields not found in schema', async () => {
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

      expect(await screen.findByLabelText('Field A')).toBeDefined();
      expect(screen.getByLabelText('Field C')).toBeDefined();

      const allLabels = container.textContent;
      expect(allLabels).not.toContain('Non Existent Field');
    });

    it('should only render fields specified in layout config', async () => {
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

      expect(await screen.findByLabelText('Field A')).toBeDefined();
      expect(screen.getByLabelText('Field C')).toBeDefined();

      expect(screen.queryByLabelText('Field B')).toBeNull();
      expect(screen.queryByLabelText('Field D')).toBeNull();
    });
  });

  describe('layout config with single-field columns', () => {
    it('should render single field per column correctly', async () => {
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

      await waitFor(() => {
        const stacks = container.querySelectorAll('.MuiStack-root');
        expect(stacks.length).toBe(4);
      });
    });
  });

  describe('layout config with empty columns', () => {
    it('should handle empty field arrays gracefully', async () => {
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

      expect(await screen.findByLabelText('Field A')).toBeDefined();

      const stacks = container.querySelectorAll('.MuiStack-root');
      expect(stacks.length).toBe(2);
    });
  });
});
