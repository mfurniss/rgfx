import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useForm, FormProvider } from 'react-hook-form';
import { VideoFileField } from '../video-file-field';

interface TestFormValues {
  file: string;
}

function TestWrapper({ defaultValue = '' }: { defaultValue?: string }) {
  const methods = useForm<TestFormValues>({
    defaultValues: { file: defaultValue },
    mode: 'onChange',
  });

  return (
    <FormProvider {...methods}>
      <VideoFileField
        name="file"
        control={methods.control}
        label="File"
      />
    </FormProvider>
  );
}

describe('VideoFileField', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with placeholder when no file selected', () => {
    render(<TestWrapper />);

    const input = screen.getByRole('textbox');
    expect(input).toBeDefined();
    expect((input as HTMLInputElement).value).toBe('');
  });

  it('should display filename when file path is set', () => {
    render(<TestWrapper defaultValue="/Users/test/videos/intro.mp4" />);

    const input = screen.getByRole('textbox');
    expect((input as HTMLInputElement).value).toBe('intro.mp4');
  });

  it('should display filename for Windows paths', () => {
    render(
      <TestWrapper defaultValue="C:\\Users\\test\\videos\\intro.mp4" />,
    );

    const input = screen.getByRole('textbox');
    expect((input as HTMLInputElement).value).toBe('intro.mp4');
  });

  it('should show full path in helper text', () => {
    render(<TestWrapper defaultValue="/Users/test/video.mp4" />);

    expect(screen.getByText('/Users/test/video.mp4')).toBeDefined();
  });

  it('should show clear button when file is selected', () => {
    render(<TestWrapper defaultValue="/test/video.mp4" />);

    const clearButtons = screen.getAllByRole('button');
    // Should have both the video file icon button and the clear button
    expect(clearButtons.length).toBeGreaterThanOrEqual(2);
  });

  it('should not show clear button when no file selected', () => {
    render(<TestWrapper />);

    // Only the video file select button, no clear button
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1);
  });

  it('should call selectVideoFile on icon button click without double-firing', async () => {
    const mockSelectVideoFile = vi.fn().mockResolvedValue('/new/video.mp4');
    window.rgfx = { selectVideoFile: mockSelectVideoFile } as never;

    render(<TestWrapper />);

    const selectButton = screen.getByRole('button');
    fireEvent.click(selectButton);

    await vi.waitFor(() => {
      expect(mockSelectVideoFile).toHaveBeenCalledTimes(1);
    });
  });

  it('should open file picker when clicking the text field', async () => {
    const mockSelectVideoFile = vi.fn().mockResolvedValue('/new/video.mp4');
    window.rgfx = { selectVideoFile: mockSelectVideoFile } as never;

    render(<TestWrapper />);

    const input = screen.getByRole('textbox');
    fireEvent.click(input);

    await vi.waitFor(() => {
      expect(mockSelectVideoFile).toHaveBeenCalledTimes(1);
    });
  });

  it('should render as read-only input', () => {
    render(<TestWrapper />);

    const input = screen.getByRole('textbox');
    expect((input as HTMLInputElement).readOnly).toBe(true);
  });
});
