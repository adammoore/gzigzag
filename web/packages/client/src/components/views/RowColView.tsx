import React, { useMemo, useState } from 'react';
import { ZZSpace, ZZCell } from '@zigzag/core';
import { ZZCursor } from '../../App';
import { ZZCellComponent } from '../ZZCellComponent';
import styled from 'styled-components';

const ViewContainer = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--zz-bg-primary);
  overflow: hidden;
`;

const GridScrollArea = styled.div`
  flex: 1;
  overflow: auto;
  padding: 20px;
  
  &::-webkit-scrollbar {
    width: 8px;
    height: 8px;
    background: var(--zz-bg-secondary);
  }
  
  &::-webkit-scrollbar-thumb {
    background: var(--zz-border);
    border-radius: 4px;
    
    &:hover {
      background: var(--zz-hover);
    }
  }
  
  &::-webkit-scrollbar-corner {
    background: var(--zz-bg-secondary);
  }
`;

const GridContainer = styled.div<{ columns: number }>`
  display: grid;
  grid-template-columns: repeat(${props => props.columns}, minmax(150px, 1fr));
  gap: 15px;
  min-width: fit-content;
  padding: 20px;
`;

const GridCell = styled.div<{ isEmpty?: boolean }>`
  position: relative;
  ${props => props.isEmpty && `
    opacity: 0.2;
    pointer-events: none;
  `}
`;

const EmptyCell = styled.div`
  padding: 8px 12px;
  margin: 4px;
  border: 2px dashed #444;
  background: transparent;
  border-radius: 4px;
  min-width: 120px;
  height: 44px;
`;

const ControlBar = styled.div`
  padding: 16px 24px;
  background: var(--zz-bg-secondary);
  border-bottom: 1px solid var(--zz-border);
  display: flex;
  gap: 20px;
  align-items: center;
`;

const DimensionSelector = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  
  label {
    color: var(--zz-text-secondary);
    font-size: 14px;
  }
  
  select {
    background: var(--zz-bg-primary);
    color: var(--zz-text-primary);
    border: 1px solid var(--zz-border);
    padding: 4px 8px;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    
    &:focus {
      outline: none;
      border-color: var(--zz-accent-primary);
    }
  }
`;

const InfoPanel = styled.div`
  padding: 16px 24px;
  background: var(--zz-bg-secondary);
  border-top: 1px solid var(--zz-border);
  font-family: 'Courier New', monospace;
  font-size: 14px;
  color: var(--zz-text-secondary);
  display: flex;
  justify-content: space-between;
`;

const GridLines = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  
  &::before, &::after {
    content: '';
    position: absolute;
    background: var(--zz-border);
    opacity: 0.2;
  }
  
  &::before {
    top: 50%;
    left: 0;
    right: 0;
    height: 1px;
  }
  
  &::after {
    left: 50%;
    top: 0;
    bottom: 0;
    width: 1px;
  }
`;

interface GridPosition {
  row: number;
  col: number;
  cell: ZZCell;
}

interface RowColViewProps {
  space: ZZSpace;
  cursor: ZZCursor;
  onCursorChange: (cursor: ZZCursor) => void;
}

// Build a 2D grid from ZigZag structure
function buildGrid(
  space: ZZSpace, 
  rowDimension: string, 
  colDimension: string
): { grid: (ZZCell | null)[][], positions: Map<string, GridPosition> } {
  const positions = new Map<string, GridPosition>();
  const processedCells = new Set<string>();
  
  // Find a starting cell that has connections in both dimensions
  let startCell: ZZCell | null = null;
  const cells = space.getCells();
  
  for (const cell of cells) {
    if (cell.step(rowDimension, 1) || cell.step(rowDimension, -1)) {
      if (cell.step(colDimension, 1) || cell.step(colDimension, -1)) {
        startCell = cell;
        break;
      }
    }
  }
  
  if (!startCell) {
    // Fallback to home cell
    startCell = space.getHomeCell();
  }
  
  // Get the heads of both dimensions from start cell
  const rowHead = startCell.getHead(rowDimension);
  const colHead = startCell.getHead(colDimension);
  
  // Build rows and columns
  const rowRank = rowHead.readRank(rowDimension, 1);
  const colRank = colHead.readRank(colDimension, 1);
  
  // Create grid
  const grid: (ZZCell | null)[][] = [];
  
  // For each row
  rowRank.forEach((rowCell, rowIndex) => {
    const row: (ZZCell | null)[] = [];
    
    // For each column position
    colRank.forEach((_, colIndex) => {
      // Find cell at intersection
      let intersectionCell: ZZCell | null = null;
      
      // Navigate from row cell along column dimension
      let current = rowCell;
      const colHead = current.getHead(colDimension);
      const colCells = colHead.readRank(colDimension, 1);
      
      // Find the cell at the column index
      if (colIndex < colCells.length) {
        intersectionCell = colCells[colIndex];
        
        // Verify it's also connected in row dimension
        const verifyRowHead = intersectionCell.getHead(rowDimension);
        const verifyRowCells = verifyRowHead.readRank(rowDimension, 1);
        const verifyRowIndex = verifyRowCells.findIndex(c => c.id === intersectionCell!.id);
        
        if (verifyRowIndex === rowIndex) {
          // Valid intersection
          positions.set(intersectionCell.id, {
            row: rowIndex,
            col: colIndex,
            cell: intersectionCell
          });
          processedCells.add(intersectionCell.id);
        } else {
          intersectionCell = null;
        }
      }
      
      row.push(intersectionCell);
    });
    
    grid.push(row);
  });
  
  // Add any cells that weren't captured in the grid
  cells.forEach(cell => {
    if (!processedCells.has(cell.id)) {
      // Try to position orphan cells
      const rowStep = cell.step(rowDimension, -1);
      const colStep = cell.step(colDimension, -1);
      
      if (rowStep && colStep) {
        const rowPos = positions.get(rowStep.id);
        const colPos = positions.get(colStep.id);
        
        if (rowPos && colPos) {
          const newRow = rowPos.row + 1;
          const newCol = colPos.col + 1;
          
          // Extend grid if necessary
          while (grid.length <= newRow) {
            grid.push(new Array(grid[0]?.length || 1).fill(null));
          }
          while (grid[0].length <= newCol) {
            grid.forEach(row => row.push(null));
          }
          
          grid[newRow][newCol] = cell;
          positions.set(cell.id, { row: newRow, col: newCol, cell });
        }
      }
    }
  });
  
  return { grid, positions };
}

export const RowColView: React.FC<RowColViewProps> = ({
  space,
  cursor,
  onCursorChange
}) => {
  const dimensions = space.getDimensions();
  const [rowDimension, setRowDimension] = useState(dimensions[0] || 'd.1');
  const [colDimension, setColDimension] = useState(dimensions[1] || 'd.2');
  
  const { grid, positions } = useMemo(() => 
    buildGrid(space, rowDimension, colDimension),
    [space, rowDimension, colDimension]
  );
  
  const currentPosition = positions.get(cursor.cellId);
  const maxCols = Math.max(...grid.map(row => row.length), 1);
  
  // Stats
  const totalCells = Array.from(positions.values()).length;
  const emptyCells = grid.flat().filter(c => c === null).length;
  
  return (
    <ViewContainer>
      <ControlBar>
        <DimensionSelector>
          <label>Rows:</label>
          <select 
            value={rowDimension} 
            onChange={e => setRowDimension(e.target.value)}
          >
            {dimensions.map(dim => (
              <option key={dim} value={dim}>{dim}</option>
            ))}
          </select>
        </DimensionSelector>
        
        <DimensionSelector>
          <label>Columns:</label>
          <select 
            value={colDimension} 
            onChange={e => setColDimension(e.target.value)}
          >
            {dimensions.filter(d => d !== rowDimension).map(dim => (
              <option key={dim} value={dim}>{dim}</option>
            ))}
          </select>
        </DimensionSelector>
      </ControlBar>
      
      <GridScrollArea>
        <GridLines />
        <GridContainer columns={maxCols}>
          {grid.map((row, rowIndex) => 
            row.map((cell, colIndex) => (
              <GridCell 
                key={`${rowIndex}-${colIndex}`}
                isEmpty={!cell}
              >
                {cell ? (
                  <ZZCellComponent
                    cell={cell}
                    isActive={cell.id === cursor.cellId}
                    onClick={() => onCursorChange({ ...cursor, cellId: cell.id })}
                  />
                ) : (
                  <EmptyCell />
                )}
              </GridCell>
            ))
          )}
        </GridContainer>
      </GridScrollArea>
      
      <InfoPanel>
        <div>
          Grid: {grid.length} × {maxCols} | 
          Cells: {totalCells} | 
          Empty: {emptyCells}
        </div>
        {currentPosition && (
          <div>
            Position: [{currentPosition.row + 1}, {currentPosition.col + 1}]
          </div>
        )}
      </InfoPanel>
    </ViewContainer>
  );
};
