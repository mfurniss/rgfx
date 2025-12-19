import React from 'react';
import { Box, Typography, Divider, Stack } from '@mui/material';
import InfoRow from './info-row';

export type InfoRowData = [label: string, value: string | number];

interface InfoSectionProps {
  title: string;
  icon: React.ReactNode;
  rows: InfoRowData[];
  showDivider?: boolean;
  children?: React.ReactNode;
  titleAction?: React.ReactNode;
}

/**
 * Generic section component for displaying grouped information
 * Renders a title with icon, followed by a list of label-value pairs
 * Optionally accepts children to render below the rows
 * Optionally accepts titleAction to render on the same row as title (right-aligned)
 */
const InfoSection: React.FC<InfoSectionProps> = ({
  title,
  icon,
  rows,
  showDivider = false,
  children,
  titleAction,
}) => (
  <>
    {showDivider && <Divider sx={{ my: 2 }} />}
    <Box sx={{ mb: 2 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          mb: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {icon}
          <Typography variant="subtitle2" fontWeight="bold">
            {title}
          </Typography>
        </Box>
        {titleAction}
      </Box>
      <Stack spacing={0.5}>
        {rows.map(([label, value]) => (
          <InfoRow key={label} label={label} value={value} />
        ))}
      </Stack>
      {children}
    </Box>
  </>
);

export default InfoSection;
