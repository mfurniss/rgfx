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
} from '@mui/material';
import { SportsEsports as GamesIcon } from '@mui/icons-material';
import type { GameInfo } from '@/types';
import { PageTitle } from '../components/page-title';

type SortField = 'romName' | 'interceptorName' | 'transformerName';
type SortOrder = 'asc' | 'desc';

const GamesPage: React.FC = () => {
  const [games, setGames] = useState<GameInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>('romName');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  useEffect(() => {
    const loadGames = async () => {
      const gamesList = await window.rgfx.listGames();
      setGames(gamesList);
      setLoading(false);
    };

    void loadGames();
  }, []);

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

  const sortedGames = [...games].sort((a, b) => {
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
      <PageTitle icon={<GamesIcon />} title="Games" />
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
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
                <TableCell colSpan={3} align="center">
                  <Typography variant="body2" color="text.secondary">
                    No games configured
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              sortedGames.map((game, index) => (
                <TableRow key={index}>
                  <TableCell>{game.romName}</TableCell>
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
