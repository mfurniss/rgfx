import React from 'react';
import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ListSubheader,
  Alert,
} from '@mui/material';
import { mapChipNameToVariant, type SupportedChip } from '@/schemas/firmware-manifest';

interface GpioPin {
  pin: number;
  warning?: string;
}

// ESP32 (WROOM, etc.) - pins safe for LED data output
const ESP32_PINS: GpioPin[] = [
  // Safe pins
  { pin: 4 },
  { pin: 13 },
  { pin: 14 },
  { pin: 16 },
  { pin: 17 },
  { pin: 18 },
  { pin: 19 },
  { pin: 21 },
  { pin: 22 },
  { pin: 23 },
  { pin: 25 },
  { pin: 26 },
  { pin: 27 },
  { pin: 32 },
  { pin: 33 },
  // Boot strapping pins (work but have caveats)
  { pin: 0, warning: 'Boot strapping - may affect boot' },
  { pin: 2, warning: 'Boot strapping - must be LOW at boot' },
  { pin: 5, warning: 'Boot strapping - SDIO timing' },
  { pin: 12, warning: 'Boot strapping - flash voltage' },
  { pin: 15, warning: 'Boot strapping - boot log output' },
  // Not listed: 6-11 (SPI flash), 34-39 (input-only)
];

// ESP32-S3 (Super Mini, WROOM-1, etc.) - pins safe for LED data output
const ESP32_S3_PINS: GpioPin[] = [
  // Safe pins (typical S3 Super Mini pinout)
  { pin: 1 },
  { pin: 2 },
  { pin: 3 },
  { pin: 4 },
  { pin: 5 },
  { pin: 6 },
  { pin: 7 },
  { pin: 8 },
  { pin: 9 },
  { pin: 10 },
  { pin: 11 },
  { pin: 12 },
  { pin: 13 },
  { pin: 14 },
  { pin: 17 },
  { pin: 18 },
  { pin: 21 },
  // Boot strapping / JTAG pins
  { pin: 0, warning: 'Boot strapping' },
  { pin: 15, warning: 'JTAG pin' },
  { pin: 16, warning: 'JTAG pin' },
  // Not listed: 19-20 (USB), 26-32 (PSRAM/flash), 43-44 (UART0)
];

function getPinsForChip(chip: SupportedChip | null): GpioPin[] {
  return chip === 'ESP32-S3' ? ESP32_S3_PINS : ESP32_PINS;
}

interface GpioPinSelectProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> {
  name: TName;
  control: Control<TFieldValues>;
  chipModel?: string;
}

export function GpioPinSelect<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({ name, control, chipModel }: GpioPinSelectProps<TFieldValues, TName>) {
  const chipType = chipModel ? mapChipNameToVariant(chipModel) : null;
  const pins = getPinsForChip(chipType);
  const safePins = pins.filter((p) => !p.warning);
  const cautionPins = pins.filter((p) => p.warning);

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const currentPin = field.value as number | undefined;
        const isUnlistedPin = currentPin != null && !pins.find((p) => p.pin === currentPin);

        return (
          <>
            <FormControl fullWidth error={!!fieldState.error}>
              <InputLabel>GPIO Pin</InputLabel>
              <Select {...field} label="GPIO Pin" value={currentPin ?? ''}>
                <ListSubheader>{chipType ?? 'ESP32'}</ListSubheader>
                {safePins.map((p) => (
                  <MenuItem key={p.pin} value={p.pin}>
                    GPIO {p.pin}
                  </MenuItem>
                ))}
                <ListSubheader>Use with Caution</ListSubheader>
                {cautionPins.map((p) => (
                  <MenuItem key={p.pin} value={p.pin}>
                    GPIO {p.pin} - {p.warning}
                  </MenuItem>
                ))}
                {isUnlistedPin && (
                  <MenuItem value={currentPin}>GPIO {currentPin} (current)</MenuItem>
                )}
              </Select>
            </FormControl>
            {isUnlistedPin && (
              <Alert severity="warning" sx={{ mt: 1 }}>
                GPIO {currentPin} is not recommended for {chipType ?? 'this board'}
              </Alert>
            )}
          </>
        );
      }}
    />
  );
}
