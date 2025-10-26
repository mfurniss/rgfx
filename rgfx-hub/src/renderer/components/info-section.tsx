import React from 'react';
import { Box, Typography, Divider, Stack } from '@mui/material';
import InfoRow from './info-row';

export interface InfoRowData {
  label: string;
  value: string | number;
}

interface InfoSectionProps {
  title: string;
  icon: React.ReactNode;
  rows: InfoRowData[];
  showDivider?: boolean;
}

/**
 * Generic section component for displaying grouped information
 * Renders a title with icon, followed by a list of label-value pairs
 */
const InfoSection: React.FC<InfoSectionProps> = ({
  title,
  icon,
  rows,
  showDivider = false,
}) => (
  <>
    {showDivider && <Divider sx={{ my: 2 }} />}
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        {icon}
        <Typography variant="subtitle2" fontWeight="bold">
          {title}
        </Typography>
      </Box>
      <Stack spacing={0.5}>
        {rows.map((row) => (
          <InfoRow key={row.label} label={row.label} value={row.value} />
        ))}
      </Stack>
    </Box>
  </>
);

export default InfoSection;
