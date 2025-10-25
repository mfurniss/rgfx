import React from 'react';
import { Grid, Typography } from '@mui/material';

interface SystemStatusItemProps {
  name: string;
  value: string | number;
}

/**
 * Displays a single system status metric in a responsive grid cell
 * Used in the system status overview section
 */
const SystemStatusItem: React.FC<SystemStatusItemProps> = ({ name, value }) => (
  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
    <Typography variant="body2" color="text.secondary">
      {name}
    </Typography>
    <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>
      {value}
    </Typography>
  </Grid>
);

export default SystemStatusItem;
