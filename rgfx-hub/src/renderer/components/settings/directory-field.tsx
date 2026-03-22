import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { DirectoryPicker } from '../common/directory-picker';

export interface DirectoryFieldHandle {
  validate: () => Promise<boolean>;
  getValue: () => string;
}

interface DirectoryFieldProps {
  label: string;
  dialogTitle: string;
  helperText: string;
  storedValue: string;
  defaultPath?: string;
  required?: boolean;
}

export const DirectoryField = React.forwardRef<
  DirectoryFieldHandle,
  DirectoryFieldProps
>(function DirectoryField(
  { label, dialogTitle, helperText, storedValue, defaultPath, required },
  ref,
) {
  const [value, setValue] = useState(storedValue);
  const [error, setError] = useState<string | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current && storedValue) {
      initialized.current = true;
      setValue(storedValue);
    }
  }, [storedValue]);

  useImperativeHandle(ref, () => ({
    validate: async () => {
      const trimmed = value.trim();

      if (!trimmed) {
        if (required) {
          setError('Directory is required');
          return false;
        }

        setError(null);
        return true;
      }

      const exists = await window.rgfx.verifyDirectory(trimmed);
      setError(exists ? null : 'Directory does not exist');
      return exists;
    },
    getValue: () => value.trim(),
  }));

  return (
    <DirectoryPicker
      label={label}
      value={value}
      onChange={(v) => {
        setValue(v);

        if (error) {
          setError(null);
        }
      }}
      dialogTitle={dialogTitle}
      defaultPath={defaultPath}
      error={error ?? undefined}
      helperText={helperText}
      sx={{ mb: 3 }}
    />
  );
});
