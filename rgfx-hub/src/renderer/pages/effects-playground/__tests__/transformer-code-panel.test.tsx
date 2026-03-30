import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/__tests__/render';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TransformerCodePanel } from '../components/transformer-code-panel';

describe('TransformerCodePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render broadcast code', () => {
    render(<TransformerCodePanel broadcastCode="broadcast({ effect: 'solid' });" />);

    expect(screen.getByText("broadcast({ effect: 'solid' });")).toBeTruthy();
  });

  it('should copy code to clipboard on button click', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<TransformerCodePanel broadcastCode="test code" />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('test code');
    });
  });

  it('should show copied tooltip after clicking copy', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<TransformerCodePanel broadcastCode="test code" />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByLabelText('Copied!')).toBeTruthy();
    });
  });
});
