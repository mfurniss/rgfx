import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Stack,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ConfirmActionButton from '../common/confirm-action-button';
import { notify } from '../../store/notification-store';
import { formatBytes } from '../../utils/formatters';
import { SettingsSection } from './settings-section';
import type { LogSizes } from '../../../log-manager';

export function LogsSection() {
  const [logSizes, setLogSizes] = useState<LogSizes | null>(null);
  const [loading, setLoading] = useState(true);

  const loadLogSizes = useCallback(async () => {
    try {
      const sizes = await window.rgfx.getLogSizes();
      setLogSizes(sizes);
    } catch (error) {
      console.error('Failed to load log sizes:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLogSizes();
  }, [loadLogSizes]);

  const handleClearLogs = async () => {
    await window.rgfx.clearAllLogs();
    await loadLogSizes();
  };

  const handleClearSuccess = () => {
    notify('All logs cleared', 'success');
  };

  const handleClearError = (error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown error';
    notify(`Failed to clear logs: ${message}`, 'error');
  };

  const totalSize = logSizes
    ? (logSizes.system?.size ?? 0) +
      (logSizes.events?.size ?? 0) +
      logSizes.drivers.reduce((sum, d) => sum + d.size, 0)
    : 0;

  const hasLogs = totalSize > 0;

  return (
    <SettingsSection title="Logs">
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={24} />
        </Box>
      ) : (
        <>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>File</TableCell>
                  <TableCell align="right">Size</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <Tooltip title={logSizes?.system?.path ?? ''} placement="top" arrow>
                  <TableRow hover sx={{ cursor: logSizes?.system ? 'help' : 'default' }}>
                    <TableCell>{logSizes?.system?.path.split('/').pop() ?? 'main.log'}</TableCell>
                    <TableCell align="right">
                      {logSizes?.system ? formatBytes(logSizes.system.size) : 'Not found'}
                    </TableCell>
                  </TableRow>
                </Tooltip>
                <Tooltip title={logSizes?.events?.path ?? ''} placement="top" arrow>
                  <TableRow hover sx={{ cursor: logSizes?.events ? 'help' : 'default' }}>
                    <TableCell>
                      {logSizes?.events?.path.split('/').pop() ?? 'interceptor-events.log'}
                    </TableCell>
                    <TableCell align="right">
                      {logSizes?.events ? formatBytes(logSizes.events.size) : 'Not found'}
                    </TableCell>
                  </TableRow>
                </Tooltip>
                {logSizes?.drivers.map((driver) => (
                  <Tooltip key={driver.driverId} title={driver.path} placement="top" arrow>
                    <TableRow hover sx={{ cursor: 'help' }}>
                      <TableCell>{driver.driverId}.log</TableCell>
                      <TableCell align="right">{formatBytes(driver.size)}</TableCell>
                    </TableRow>
                  </Tooltip>
                ))}
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Total</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                    {formatBytes(totalSize)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
            <ConfirmActionButton
              label="Clear All Logs"
              icon={<DeleteIcon />}
              dialogTitle="Clear All Logs"
              dialogContent={
                <Typography>
                  This will permanently delete all log files. This action cannot be undone.
                </Typography>
              }
              confirmLabel="Clear Logs"
              color="warning"
              onConfirm={handleClearLogs}
              onSuccess={handleClearSuccess}
              onError={handleClearError}
              disabled={!hasLogs}
              variant="outlined"
            />
          </Stack>
        </>
      )}
    </SettingsSection>
  );
}
