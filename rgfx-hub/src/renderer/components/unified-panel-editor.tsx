/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Popover,
  ToggleButton,
  ToggleButtonGroup,
  TextField,
  Stack,
} from '@mui/material';
import { GridView as GridIcon, Clear as ClearIcon } from '@mui/icons-material';

type Rotation = 'a' | 'b' | 'c' | 'd';

interface PanelCell {
  index: number;
  rotation: Rotation;
}

interface UnifiedPanelEditorProps {
  value: string[][] | null | undefined;
  onChange: (value: string[][] | null) => void;
  disabled?: boolean;
}

const CELL_PATTERN = /^(\d+)([abcd])?$/;

// Parse a cell string like "0a" or "12c" into index and rotation
function parseCell(cell: string): PanelCell {
  const match = CELL_PATTERN.exec(cell);

  if (!match) {
    return { index: 0, rotation: 'a' };
  }

  return {
    index: parseInt(match[1], 10),
    rotation: (match[2] as Rotation | undefined) ?? 'a',
  };
}

// Format a cell back to string
function formatCell(cell: PanelCell): string {
  return cell.rotation === 'a' ? `${cell.index}` : `${cell.index}${cell.rotation}`;
}

// Get rotation display text
function getRotationLabel(rotation: Rotation): string {
  switch (rotation) {
    case 'a':
      return '0°';
    case 'b':
      return '90°';
    case 'c':
      return '180°';
    case 'd':
      return '270°';
  }
}

// Create a default grid with sequential indices
function createDefaultGrid(rows: number, cols: number): string[][] {
  const grid: string[][] = [];
  let index = 0;

  for (let r = 0; r < rows; r++) {
    const row: string[] = [];

    for (let c = 0; c < cols; c++) {
      row.push(`${index}`);
      index++;
    }
    grid.push(row);
  }

  return grid;
}

// Resize grid while preserving existing cell values
function resizeGrid(
  existing: string[][] | null | undefined,
  newRows: number,
  newCols: number,
): string[][] {
  // If no existing grid, create a fresh one
  if (!existing || existing.length === 0) {
    return createDefaultGrid(newRows, newCols);
  }

  const oldRows = existing.length;
  const oldCols = existing[0].length;
  const newGrid: string[][] = [];

  // Find the highest existing index to continue from for new cells
  let maxIndex = -1;

  for (const row of existing) {
    for (const cell of row) {
      const parsed = parseCell(cell);

      if (parsed.index > maxIndex) {
        maxIndex = parsed.index;
      }
    }
  }

  let nextIndex = maxIndex + 1;

  for (let r = 0; r < newRows; r++) {
    const row: string[] = [];

    for (let c = 0; c < newCols; c++) {
      if (r < oldRows && c < oldCols) {
        // Preserve existing cell
        row.push(existing[r][c]);
      } else {
        // New cell - assign next sequential index
        row.push(`${nextIndex}`);
        nextIndex++;
      }
    }
    newGrid.push(row);
  }

  return newGrid;
}

export function UnifiedPanelEditor({ value, onChange, disabled }: UnifiedPanelEditorProps) {
  // Popover state for cell editing
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);

  // Parse current grid dimensions
  const { rows, cols } = useMemo(() => {
    if (!value || value.length === 0) {
      return { rows: 0, cols: 0 };
    }

    return { rows: value.length, cols: value[0].length };
  }, [value]);

  // Handle dimension changes
  const handleRowsChange = (newRows: number) => {
    if (newRows < 1 || newRows > 8) {
      return;
    }

    const newCols = cols || 2;
    onChange(resizeGrid(value, newRows, newCols));
  };

  const handleColsChange = (newCols: number) => {
    if (newCols < 1 || newCols > 8) {
      return;
    }

    const newRows = rows || 2;
    onChange(resizeGrid(value, newRows, newCols));
  };

  // Handle cell click to open editor
  const handleCellClick = (event: React.MouseEvent<HTMLElement>, row: number, col: number) => {
    if (disabled) {
      return;
    }

    setAnchorEl(event.currentTarget);
    setEditingCell({ row, col });
  };

  // Handle cell update
  const handleCellUpdate = (newIndex: number, newRotation: Rotation) => {
    if (!value || !editingCell) {
      return;
    }

    const newGrid = value.map((r) => [...r]);
    newGrid[editingCell.row][editingCell.col] = formatCell({
      index: newIndex,
      rotation: newRotation,
    });
    onChange(newGrid);
  };

  // Close popover
  const handleClosePopover = () => {
    setAnchorEl(null);
    setEditingCell(null);
  };

  // Get current editing cell data
  const editingCellData = useMemo(() => {
    if (!value || !editingCell) {
      return null;
    }

    return parseCell(value[editingCell.row][editingCell.col]);
  }, [value, editingCell]);

  // Calculate total panels for validation display
  const totalPanels = rows * cols;

  // Clear to single panel mode
  const handleClear = () => {
    onChange(null);
  };

  // Enable multi-panel mode with default 2x2 grid
  const handleEnable = () => {
    onChange(createDefaultGrid(2, 2));
  };

  // Render empty state (single panel mode)
  if (!value) {
    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Multi-Panel Layout
        </Typography>
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography color="text.secondary">Single panel mode (no unified layout)</Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<GridIcon />}
            onClick={handleEnable}
            disabled={disabled}
          >
            Configure Multi-Panel
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="subtitle2" color="text.secondary">
          Multi-Panel Layout ({rows}×{cols} = {totalPanels} panels)
        </Typography>
        <Button
          variant="text"
          size="small"
          startIcon={<ClearIcon />}
          onClick={handleClear}
          disabled={disabled}
          color="inherit"
        >
          Clear
        </Button>
      </Box>

      <Paper variant="outlined" sx={{ p: 2 }}>
        {/* Dimension controls */}
        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
          <TextField
            label="Rows"
            type="number"
            size="small"
            value={rows}
            onChange={(e) => {
              handleRowsChange(parseInt(e.target.value, 10));
            }}
            slotProps={{ htmlInput: { min: 1, max: 8 } }}
            sx={{ width: 80 }}
            disabled={disabled}
          />
          <TextField
            label="Cols"
            type="number"
            size="small"
            value={cols}
            onChange={(e) => {
              handleColsChange(parseInt(e.target.value, 10));
            }}
            slotProps={{ htmlInput: { min: 1, max: 8 } }}
            sx={{ width: 80 }}
            disabled={disabled}
          />
        </Stack>

        {/* Grid display */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: 1,
            maxWidth: cols * 80,
          }}
        >
          {value.map((row, rowIdx) =>
            row.map((cell, colIdx) => {
              const parsed = parseCell(cell);

              return (
                <Paper
                  key={`${rowIdx}-${colIdx}`}
                  variant="outlined"
                  onClick={(e) => {
                    handleCellClick(e, rowIdx, colIdx);
                  }}
                  sx={{
                    p: 1,
                    textAlign: 'center',
                    cursor: disabled ? 'default' : 'pointer',
                    minWidth: 60,
                    '&:hover': disabled ? {} : { bgcolor: 'action.hover' },
                  }}
                >
                  <Typography variant="body2" fontWeight="medium">
                    {parsed.index}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {getRotationLabel(parsed.rotation)}
                  </Typography>
                </Paper>
              );
            }),
          )}
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Click a cell to change panel index and rotation
        </Typography>
      </Paper>

      {/* Cell edit popover */}
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClosePopover}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        {editingCellData && (
          <Box sx={{ p: 2, minWidth: 200 }}>
            <Typography variant="subtitle2" gutterBottom>
              Edit Panel
            </Typography>
            <TextField
              label="Panel Index"
              type="number"
              size="small"
              fullWidth
              value={editingCellData.index}
              onChange={(e) => {
                const newIndex = parseInt(e.target.value, 10);

                if (!isNaN(newIndex) && newIndex >= 0) {
                  handleCellUpdate(newIndex, editingCellData.rotation);
                }
              }}
              slotProps={{ htmlInput: { min: 0, max: totalPanels - 1 } }}
              sx={{ mb: 2 }}
            />

            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Rotation
            </Typography>
            <ToggleButtonGroup
              value={editingCellData.rotation}
              exclusive
              onChange={(_, newRotation) => {
                if (newRotation) {
                  handleCellUpdate(editingCellData.index, newRotation as Rotation);
                }
              }}
              size="small"
              fullWidth
            >
              <ToggleButton value="a">0°</ToggleButton>
              <ToggleButton value="b">90°</ToggleButton>
              <ToggleButton value="c">180°</ToggleButton>
              <ToggleButton value="d">270°</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        )}
      </Popover>
    </Box>
  );
}
