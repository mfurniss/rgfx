import React from 'react';
import { IconButton, InputAdornment, SxProps, TextField, Theme } from '@mui/material';
import { FolderOpen } from '@mui/icons-material';

interface DirectoryPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  dialogTitle: string;
  defaultPath?: string;
  error?: string;
  helperText?: string;
  sx?: SxProps<Theme>;
}

export function DirectoryPicker({
  label,
  value,
  onChange,
  dialogTitle,
  defaultPath,
  error,
  helperText,
  sx,
}: DirectoryPickerProps) {
  const handleBrowse = () => {
    void (async () => {
      const selected = await window.rgfx.selectDirectory(dialogTitle, defaultPath ?? value);

      if (selected) {
        onChange(selected);
      }
    })();
  };

  return (
    <TextField
      label={label}
      value={value}
      onChange={(e) => {
        onChange(e.target.value);
      }}
      fullWidth
      error={!!error}
      helperText={error ?? helperText}
      sx={sx}
      slotProps={{
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <IconButton onClick={handleBrowse} edge="end" aria-label={`Select ${label}`}>
                <FolderOpen />
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  );
}
