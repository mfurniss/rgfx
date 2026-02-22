import React, { useMemo, useState } from 'react';
import { Box, Typography, Button, Paper, TextField, Stack } from '@mui/material';
import { GridView as GridIcon, Clear as ClearIcon } from '@mui/icons-material';
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, rectSwappingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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

// Get next rotation in cycle
function getNextRotation(rotation: Rotation): Rotation {
  switch (rotation) {
    case 'a':
      return 'b';
    case 'b':
      return 'c';
    case 'c':
      return 'd';
    case 'd':
      return 'a';
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

// Resize grid while preserving rotations, renumber indices to stay sequential
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

  // Build grid preserving rotations from existing cells
  for (let r = 0; r < newRows; r++) {
    const row: string[] = [];

    for (let c = 0; c < newCols; c++) {
      if (r < oldRows && c < oldCols) {
        // Preserve rotation from existing cell
        const parsed = parseCell(existing[r][c]);
        row.push(parsed.rotation === 'a' ? '0' : `0${parsed.rotation}`);
      } else {
        // New cell with default rotation
        row.push('0');
      }
    }
    newGrid.push(row);
  }

  // Renumber all indices sequentially (0 to n-1) while preserving rotations
  let index = 0;

  for (let r = 0; r < newRows; r++) {
    for (let c = 0; c < newCols; c++) {
      const parsed = parseCell(newGrid[r][c]);
      newGrid[r][c] = formatCell({ index, rotation: parsed.rotation });
      index++;
    }
  }

  return newGrid;
}

// Sortable panel cell component
interface SortablePanelProps {
  id: string;
  index: number;
  rotation: Rotation;
  disabled: boolean;
  onRotate: () => void;
}

function SortablePanel({ id, index, rotation, disabled, onRotate }: SortablePanelProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    // Only animate during active drag; no transition on drop
    transition: transform ? transition : undefined,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <Paper
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      variant="outlined"
      onClick={(e) => {
        // Only rotate on click if not dragging
        if (!isDragging && !disabled) {
          e.preventDefault();
          onRotate();
        }
      }}
      sx={{
        p: 1,
        textAlign: 'center',
        cursor: disabled ? 'default' : 'grab',
        minWidth: 60,
        userSelect: 'none',
        '&:hover': disabled ? {} : { bgcolor: 'action.hover' },
        '&:active': disabled ? {} : { cursor: 'grabbing' },
      }}
    >
      <Typography variant="body2" fontWeight="medium">
        {index}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {getRotationLabel(rotation)}
      </Typography>
    </Paper>
  );
}

// Panel display for drag overlay (not sortable)
interface PanelDisplayProps {
  index: number;
  rotation: Rotation;
}

function PanelDisplay({ index, rotation }: PanelDisplayProps) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1,
        textAlign: 'center',
        cursor: 'grabbing',
        minWidth: 60,
        userSelect: 'none',
        bgcolor: 'action.selected',
        boxShadow: 3,
      }}
    >
      <Typography variant="body2" fontWeight="medium">
        {index}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {getRotationLabel(rotation)}
      </Typography>
    </Paper>
  );
}

export function UnifiedPanelEditor({ value, onChange, disabled }: UnifiedPanelEditorProps) {
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // Configure pointer sensor with activation constraint to distinguish click from drag
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Must move 8px before drag starts
      },
    }),
  );

  // Parse current grid dimensions
  const { rows, cols } = useMemo(() => {
    if (!value || value.length === 0) {
      return { rows: 0, cols: 0 };
    }

    return { rows: value.length, cols: value[0].length };
  }, [value]);

  // Generate flat list of cell IDs for SortableContext
  const cellIds = useMemo(() => {
    if (!value) {
      return [];
    }

    return value.flatMap((row, rowIdx) => row.map((_, colIdx) => `cell-${rowIdx}-${colIdx}`));
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

  // Handle rotation on click
  const handleRotate = (row: number, col: number) => {
    if (disabled || !value) {
      return;
    }

    const parsed = parseCell(value[row][col]);
    const nextRotation = getNextRotation(parsed.rotation);

    const newGrid = value.map((r) => [...r]);
    newGrid[row][col] = formatCell({ index: parsed.index, rotation: nextRotation });
    onChange(newGrid);
  };

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  // Handle drag end - swap positions
  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);

    const { active, over } = event;

    if (!over || active.id === over.id || !value) {
      return;
    }

    // Parse cell IDs to get row/col
    const activeMatch = /cell-(\d+)-(\d+)/.exec(String(active.id));
    const overMatch = /cell-(\d+)-(\d+)/.exec(String(over.id));

    if (!activeMatch || !overMatch) {
      return;
    }

    const activeRow = parseInt(activeMatch[1], 10);
    const activeCol = parseInt(activeMatch[2], 10);
    const overRow = parseInt(overMatch[1], 10);
    const overCol = parseInt(overMatch[2], 10);

    // Swap cells in 2D array
    const newGrid = value.map((r) => [...r]);
    const temp = newGrid[activeRow][activeCol];
    newGrid[activeRow][activeCol] = newGrid[overRow][overCol];
    newGrid[overRow][overCol] = temp;

    onChange(newGrid);
  };

  // Get active drag cell data for overlay
  const activeDragCell = useMemo(() => {
    if (!activeDragId || !value) {
      return null;
    }

    const match = /cell-(\d+)-(\d+)/.exec(activeDragId);

    if (!match) {
      return null;
    }

    const row = parseInt(match[1], 10);
    const col = parseInt(match[2], 10);
    return parseCell(value[row][col]);
  }, [activeDragId, value]);

  // Calculate total panels for display
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
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography color="text.secondary">Single panel mode</Typography>
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
          Unified Multi-Panel Layout ({rows}×{cols} = {totalPanels} panels)
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

        {/* Grid display with drag-and-drop */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={cellIds} strategy={rectSwappingStrategy}>
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
                  const cellId = `cell-${rowIdx}-${colIdx}`;

                  return (
                    <SortablePanel
                      key={cellId}
                      id={cellId}
                      index={parsed.index}
                      rotation={parsed.rotation}
                      disabled={disabled ?? false}
                      onRotate={() => {
                        handleRotate(rowIdx, colIdx);
                      }}
                    />
                  );
                }),
              )}
            </Box>
          </SortableContext>

          {/* Drag overlay for smooth visual feedback */}
          <DragOverlay dropAnimation={null}>
            {activeDragCell ? (
              <PanelDisplay index={activeDragCell.index} rotation={activeDragCell.rotation} />
            ) : null}
          </DragOverlay>
        </DndContext>

        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Drag to swap panels, click to rotate
        </Typography>
      </Paper>
    </Box>
  );
}
