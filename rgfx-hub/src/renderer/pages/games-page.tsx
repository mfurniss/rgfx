import React, { useEffect, useState } from 'react';
import {
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Paper,
  Link,
  FormControlLabel,
  Switch,
  Alert,
} from '@mui/material';
import { SportsEsports as GamesIcon } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import type { GameInfo } from '@/types';
import { PageTitle } from '../components/layout/page-title';
import { useUiStore } from '../store/ui-store';

type SortField = 'romName' | 'interceptorName' | 'transformerName';
type SortOrder = 'asc' | 'desc';

const GamesPage: React.FC = () => {
  const [games, setGames] = useState<GameInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>('interceptorName');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [hideUnconfigured, setHideUnconfigured] = useState(true);
  const mameRomsDirectory = useUiStore((state) => state.mameRomsDirectory);
  const hasMameRomsDirectory = Boolean(mameRomsDirectory);

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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const isConfigured = (game: GameInfo) => Boolean(game.interceptorName ?? game.transformerName);

  const filteredGames = hideUnconfigured ? games.filter(isConfigured) : games;

  const sortedGames = [...filteredGames].sort((a, b) => {
    const aValue = (a[sortField] ?? '').toLowerCase();
    const bValue = (b[sortField] ?? '').toLowerCase();

    if (sortOrder === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    }

    return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
  });

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>Loading games...</Typography>
      </Box>
    );
  }

  return (
    <Box>
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
        <Alert variant="outlined" severity="info" sx={{ mb: 2 }}>
          Configure the MAME ROMs directory in{' '}
          <Link component={RouterLink} to="/settings">
            Settings
          </Link>{' '}
          to see which ROMs have interceptors and transformers.
        </Alert>
      ) : null}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {hasMameRomsDirectory ? (
                <TableCell>
                  <TableSortLabel
                    active={sortField === 'romName'}
                    direction={sortField === 'romName' ? sortOrder : 'asc'}
                    onClick={() => {
                      handleSort('romName');
                    }}
                  >
                    MAME ROM File
                  </TableSortLabel>
                </TableCell>
              ) : null}
              <TableCell>
                <TableSortLabel
                  active={sortField === 'interceptorName'}
                  direction={sortField === 'interceptorName' ? sortOrder : 'asc'}
                  onClick={() => {
                    handleSort('interceptorName');
                  }}
                >
                  MAME Interceptor
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'transformerName'}
                  direction={sortField === 'transformerName' ? sortOrder : 'asc'}
                  onClick={() => {
                    handleSort('transformerName');
                  }}
                >
                  RGFX Hub Transformer
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedGames.length === 0 ? (
              <TableRow>
                <TableCell colSpan={hasMameRomsDirectory ? 3 : 2} align="center">
                  <Typography variant="body2" color="text.secondary">
                    No games configured
                  </Typography>
                </TableCell>
              </TableRow>
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
    </Box>
  );
};

export default GamesPage;
