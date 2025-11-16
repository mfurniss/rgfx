import React from 'react';
import { Box, Typography } from '@mui/material';

interface InfoRowProps {
  label: string;
  value: string | number;
}

/**
 * Displays a label-value pair in a horizontal layout
 * Used for displaying device information in a consistent format
 */
const InfoRow: React.FC<InfoRowProps> = ({ label, value }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, gap: 1 }}>
    <Typography variant="body2" color="text.secondary">
      {label}:
    </Typography>
    <Typography variant="body2" fontWeight="medium" sx={{ maxWidth: '70%', textAlign: 'right' }}>
      {value}
    </Typography>
  </Box>
);

export default InfoRow;
