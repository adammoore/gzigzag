import React from 'react';
import { ZZSpace } from '@zigzag/core';
import { ZZCursor } from '../../App';
import { ZZCellComponent } from '../ZZCellComponent';
import styled from 'styled-components';

const RankContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  overflow: auto;
  height: 100%;
  background: #1a1a1a;
`;

const GridContainer = styled.div`
  display: grid;
  gap: 10px;
  align-items: center;
  justify-items: center;
`;

const ConnectionLine = styled.div<{ direction: 'horizontal' | 'vertical' }>`
  background: #666;
  ${props => props.direction === 'horizontal' ? 
    'width: 20px; height: 2px;' : 
    'width: 2px; height: 20px;'
  }
`;

interface RankViewProps {
  space: ZZSpace;
  cursor: ZZCursor;
  onCursorChange: (cursor: ZZCursor) => void;
}

export const RankView: React.FC<RankViewProps> = ({
  space,
  cursor,
  onCursorChange
}) => {
  const currentCell = space.getCell(cursor.cellId);
  if (!currentCell) return <div>No cell found</div>;

  // Build 2D grid around current cell
  const GRID_SIZE = 7; // 7x7 grid centered on current cell
  const CENTER = Math.floor(GRID_SIZE / 2);
  
  // Find the "head" cell for both dimensions to establish grid origin
  let originCell = currentCell;
  
  // Go to top-left corner of the current region
  for (let i = 0; i < CENTER; i++) {
    const upCell = originCell.step('d.2', -1);
    if (upCell) originCell = upCell;
  }
  for (let i = 0; i < CENTER; i++) {
    const leftCell = originCell.step('d.1', -1);
    if (leftCell) originCell = leftCell;
  }

  // Build grid from origin
  const grid: Array<Array<any>> = [];
  let currentRowStart = originCell;
  
  for (let row = 0; row < GRID_SIZE; row++) {
    const gridRow: Array<any> = [];
    let currentCellInRow = currentRowStart;
    
    for (let col = 0; col < GRID_SIZE; col++) {
      gridRow.push(currentCellInRow);
      if (col < GRID_SIZE - 1) {
        currentCellInRow = currentCellInRow?.step('d.1', 1) || null;
      }
    }
    
    grid.push(gridRow);
    
    if (row < GRID_SIZE - 1) {
      currentRowStart = currentRowStart?.step('d.2', 1) || null;
    }
  }

  // Calculate grid template
  const gridTemplateColumns = Array(GRID_SIZE * 2 - 1).fill(0).map((_, i) => 
    i % 2 === 0 ? 'auto' : '20px'
  ).join(' ');
  
  const gridTemplateRows = Array(GRID_SIZE * 2 - 1).fill(0).map((_, i) => 
    i % 2 === 0 ? 'auto' : '20px'
  ).join(' ');

  return (
    <RankContainer>
      <GridContainer
        style={{
          gridTemplateColumns,
          gridTemplateRows,
        }}
      >
        {grid.map((row, rowIndex) => 
          row.map((cell, colIndex) => {
            const gridRow = rowIndex * 2 + 1;
            const gridCol = colIndex * 2 + 1;
            
            return (
              <React.Fragment key={`${rowIndex}-${colIndex}`}>
                {/* Cell */}
                <div
                  style={{
                    gridRow,
                    gridColumn: gridCol,
                  }}
                >
                  {cell && (
                    <ZZCellComponent
                      cell={cell}
                      isActive={cell.id === cursor.cellId}
                      onClick={() => onCursorChange({ ...cursor, cellId: cell.id })}
                    />
                  )}
                </div>
                
                {/* Horizontal connection line */}
                {cell && colIndex < row.length - 1 && cell.step('d.1', 1) && (
                  <ConnectionLine
                    direction="horizontal"
                    style={{
                      gridRow,
                      gridColumn: gridCol + 1,
                    }}
                  />
                )}
                
                {/* Vertical connection line */}
                {cell && rowIndex < grid.length - 1 && cell.step('d.2', 1) && (
                  <ConnectionLine
                    direction="vertical"
                    style={{
                      gridRow: gridRow + 1,
                      gridColumn: gridCol,
                    }}
                  />
                )}
              </React.Fragment>
            );
          })
        )}
      </GridContainer>
    </RankContainer>
  );
};
