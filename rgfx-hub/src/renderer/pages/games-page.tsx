import React, { useEffect, useMemo, useState } from 'react';
import {
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Paper,
  Link,
  FormControlLabel,
  Switch,
  Alert,
  Stack,
} from '@mui/material';
import GamesIcon from '@mui/icons-material/SportsEsports';
import { Link as RouterLink } from 'react-router-dom';
import type { GameInfo } from '@/types';
import { PageTitle } from '../components/layout/page-title';
import { useUiStore } from '../store/ui-store';
import { useSortableTable } from '../hooks/use-sortable-table';
import { SortableTableHead, type SortableColumn } from '../components/common/sortable-table-head';
import { TableEmptyRow } from '../components/common/table-empty-row';

type SortField = 'romName' | 'interceptorName' | 'transformerName';

const GamesPage: React.FC = () => {
  const [games, setGames] = useState<GameInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [hideUnconfigured, setHideUnconfigured] = useState(true);
  const mameRomsDirectory = useUiStore((state) => state.mameRomsDirectory);
  const hasMameRomsDirectory = Boolean(mameRomsDirectory);

  const { sortField, sortOrder, handleSort, sortData } = useSortableTable<SortField>({
    storageKey: 'games',
    defaultField: 'interceptorName',
  });

  // Build columns dynamically based on whether MAME ROMs directory is configured
  const columns = useMemo<SortableColumn<SortField>[]>(() => {
    const cols: SortableColumn<SortField>[] = [];

    if (hasMameRomsDirectory) {
      cols.push({ field: 'romName', label: 'MAME ROM File' });
    }
    cols.push({ field: 'interceptorName', label: 'MAME Interceptor' });
    cols.push({ field: 'transformerName', label: 'RGFX Hub Transformer' });
    return cols;
  }, [hasMameRomsDirectory]);

  useEffect(() => {
    const loadGames = async () => {
      setLoading(true);
      const gamesList = await window.rgfx.listGames(mameRomsDirectory || undefined);
      setGames(gamesList);
      setLoading(false);
    };

    void loadGames();
  }, [mameRomsDirectory]);

  const handleOpenFile = (filePath: string | null) => {
    if (filePath) {
      void window.rgfx.openFile(filePath);
    }
  };

  const isConfigured = (game: GameInfo) => Boolean(game.interceptorName ?? game.transformerName);

  const filteredGames = hideUnconfigured ? games.filter(isConfigured) : games;

  const sortedGames = sortData(filteredGames);

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>Loading games...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Stack spacing={2}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <PageTitle icon={<GamesIcon />} title="Games" />
          {hasMameRomsDirectory ? (
            <FormControlLabel
              control={
                <Switch
                  checked={hideUnconfigured}
                  onChange={(e) => {
                    setHideUnconfigured(e.target.checked);
                  }}
                />
              }
              label="Hide unconfigured"
            />
          ) : null}
        </Box>
        {!hasMameRomsDirectory ? (
          <Alert variant="outlined" severity="info">
            Configure the MAME ROMs directory in{' '}
            <Link component={RouterLink} to="/settings">
              Settings
            </Link>{' '}
            to see which ROMs have interceptors and transformers.
          </Alert>
        ) : null}
        <TableContainer component={Paper}>
          <Table size="small">
            <SortableTableHead
              columns={columns}
              sortField={sortField}
              sortOrder={sortOrder}
              onSort={handleSort}
            />
            <TableBody>
              {sortedGames.length === 0 ? (
                <TableEmptyRow colSpan={hasMameRomsDirectory ? 3 : 2} message="No games configured" />
              ) : (
                sortedGames.map((game, index) => (
                  <TableRow key={index}>
                    {hasMameRomsDirectory ? <TableCell>{game.romName}</TableCell> : null}
                    <TableCell>
                      {game.interceptorName ? (
                        <Link
                          component="button"
                          variant="body2"
                          onClick={() => {
                            handleOpenFile(game.interceptorPath);
                          }}
                          sx={{ cursor: 'pointer' }}
                        >
                          {game.interceptorName}
                        </Link>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {game.transformerName ? (
                        <Link
                          component="button"
                          variant="body2"
                          onClick={() => {
                            handleOpenFile(game.transformerPath);
                          }}
                          sx={{ cursor: 'pointer' }}
                        >
                          {game.transformerName}
                        </Link>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Stack>
    </Box>
  );
};

export default GamesPage;
