import React, { useEffect, useState } from 'react';
import { Typography, Box, Paper, Link } from '@mui/material';
import { Info as InfoIcon } from '@mui/icons-material';
import { PageTitle } from '../components/page-title';

const AboutPage: React.FC = () => {
  const version = '0.0.1-Test';
  const [licensePath, setLicensePath] = useState<string | null>(null);

  useEffect(() => {
    void window.rgfx.getDefaultPaths().then((paths) => {
      setLicensePath(paths.licensePath);
    });
  }, []);

  const handleOpenLicense = () => {
    if (licensePath) {
      void window.rgfx.openFile(licensePath);
    }
  };

  return (
    <Box>
      <PageTitle icon={<InfoIcon />} title="About" />
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Retro Game Effects
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          An application and MAME Lua scripts for monitoring emulated game states and publishing
          network events to control LED hardware",
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Version {version}
        </Typography>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          System Architecture
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          <strong>Hub:</strong> Main Electron application that monitors MAME game events and
          publishes them via embedded MQTT broker
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          <strong>Drivers:</strong> ESP32 firmware units that receive events and control LED
          hardware (strips, matrices, etc.)
        </Typography>
        <Typography variant="body2">
          <strong>Communication:</strong> MQTT (QoS 2) for reliable event delivery, UDP for
          low-latency effects, SSDP for broker discovery
        </Typography>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Technology Stack
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          <strong>Hub:</strong> Electron, React, TypeScript, Material UI, Aedes MQTT Broker
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          <strong>Drivers:</strong> ESP32, PlatformIO, C++, FastLED, ArduinoMqtt
        </Typography>
        <Typography variant="body2">
          <strong>Game Integration:</strong> MAME Lua 5.4 scripting
        </Typography>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          License & Source Code
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          RGFX is open source software.
        </Typography>
        <Typography variant="body2">
          For documentation, source code, and support, visit the project repository.
        </Typography>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Copyright & License
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          Copyright &copy; 2025 Matt Furniss
        </Typography>
        <Typography variant="body2" color="text.secondary">
          This Source Code Form is subject to the terms of the{' '}
          <Link component="button" variant="body2" onClick={handleOpenLicense}>
            Mozilla Public License, v. 2.0
          </Link>
          .
        </Typography>
      </Paper>
    </Box>
  );
};

export default AboutPage;
