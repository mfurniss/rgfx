import React from 'react';
import {
  CssBaseline,
  ThemeProvider,
  createTheme,
  Container,
  AppBar,
  Toolbar,
  Typography,
  Box,
  Paper,
  Grid,
  Chip,
} from '@mui/material';
import {
  Devices as DevicesIcon,
  Router as RouterIcon,
  Storage as StorageIcon,
} from '@mui/icons-material';

// Create Material UI theme (default theme)
const theme = createTheme();
 
const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        {/* App Bar */}
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              RGFX Hub
            </Typography>
            <Chip label="Connected" color="success" size="small" />
          </Toolbar>
        </AppBar>

        {/* Main Content */}
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4, flex: 1, overflow: 'auto' }}>
          <Grid container spacing={3}>
            {/* Device Registry Card */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper
                sx={{
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  height: 240,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <DevicesIcon sx={{ mr: 1 }} />
                  <Typography variant="h6">Device Registry</Typography>
                </Box>
                <Typography color="text.secondary">
                  No devices discovered yet
                </Typography>
              </Paper>
            </Grid>

            {/* Event Mapping Card */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper
                sx={{
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  height: 240,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <RouterIcon sx={{ mr: 1 }} />
                  <Typography variant="h6">Event Mapping</Typography>
                </Box>
                <Typography color="text.secondary">
                  Configure game event mappings
                </Typography>
              </Paper>
            </Grid>

            {/* Logs Card */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper
                sx={{
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  height: 240,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <StorageIcon sx={{ mr: 1 }} />
                  <Typography variant="h6">System Logs</Typography>
                </Box>
                <Typography color="text.secondary">
                  View system logs and events
                </Typography>
              </Paper>
            </Grid>

            {/* Status Section */}
            <Grid size={12}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  System Status
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Typography variant="body2" color="text.secondary">
                      MQTT Broker
                    </Typography>
                    <Typography variant="h6">Running</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Typography variant="body2" color="text.secondary">
                      UDP Server
                    </Typography>
                    <Typography variant="h6">Active</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Typography variant="body2" color="text.secondary">
                      Event Reader
                    </Typography>
                    <Typography variant="h6">Monitoring</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Typography variant="body2" color="text.secondary">
                      Devices Connected
                    </Typography>
                    <Typography variant="h6">0</Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default App;
