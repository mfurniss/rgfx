import React from 'react';
import { Controller, type Control, type FieldValues, type FieldPath } from 'react-hook-form';
import { TextField, InputAdornment, IconButton, Tooltip } from '@mui/material';
import VideoFileIcon from '@mui/icons-material/VideoFile';
import ClearIcon from '@mui/icons-material/Clear';

interface VideoFileFieldProps<T extends FieldValues> {
  name: FieldPath<T>;
  control: Control<T>;
  label: string;
  error?: string;
}

export function VideoFileField<T extends FieldValues>({
  name,
  control,
  label,
  error,
}: VideoFileFieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { onChange, value } }) => {
        const filePath = (value as string) || '';
        const displayName = filePath ? filePath.split(/[/\\]/).pop() ?? '' : '';

        const selectFile = async () => {
          const selected = await window.rgfx.selectVideoFile();

          if (selected) {
            onChange(selected as never);
          }
        };

        const handleSelectFile = () => {
          void selectFile();
        };

        const handleClear = () => {
          onChange('' as never);
        };

        return (
          <TextField
            label={label}
            value={displayName}
            placeholder="Select a video file..."
            size="small"
            fullWidth
            error={!!error}
            helperText={error ?? (filePath ? filePath : undefined)}
            slotProps={{
              input: {
                readOnly: true,
                startAdornment: (
                  <InputAdornment position="start">
                    <Tooltip title="Select video file">
                      <IconButton size="small" onClick={handleSelectFile}>
                        <VideoFileIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                ),
                endAdornment: filePath ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={handleClear}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : undefined,
              },
            }}
            sx={{ cursor: !filePath ? 'pointer' : undefined }}
          />
        );
      }}
    />
  );
}
