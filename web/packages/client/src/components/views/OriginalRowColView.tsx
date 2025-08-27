import React from 'react';
import { ZZSpace } from '@zigzag/core';
import { ZZCursor } from '../../App';
import { OriginalZZCell } from '../OriginalZZCell';

interface OriginalRowColViewProps {
  space: ZZSpace;
  cursor: ZZCursor;
  cursorType: 'green' | 'blue';
  onCursorChange: (cursor: ZZCursor) => void;
}

export const OriginalRowColView: React.FC<OriginalRowColViewProps> = ({
  space,
  cursor,
  cursorType,
  onCursorChange
}) => {
  const currentCell = space.getCell(cursor.cellId);
  if (!currentCell) return <div>No cell found</div>;

  const GRID_SIZE = 7; // 7x7 grid centered on current cell
  const CENTER_POS = Math.floor(GRID_SIZE / 2);
  
  // Build 2D grid
  const grid: Array<Array<any>> = Array(GRID_SIZE).fill(null).map(() => 
    Array(GRID_SIZE).fill(null)
  );

  // Find grid origin (top-left of current view)
  let originCell = currentCell;
  
  // Go up CENTER_POS steps in d.2
  for (let i = 0; i < CENTER_POS; i++) {
    const upCell = originCell.step('d.2', -1);
    if (upCell) originCell = upCell;
  }
  
  // Go left CENTER_POS steps in d.1  
  for (let i = 0; i < CENTER_POS; i++) {
    const leftCell = originCell.step('d.1', -1);
    if (leftCell) originCell = leftCell;
  }

  // Fill grid from origin
  let currentRowStart = originCell;
  
  for (let row = 0; row < GRID_SIZE; row++) {
    let currentCellInRow = currentRowStart;
    
    for (let col = 0; col < GRID_SIZE; col++) {
      grid[row][col] = currentCellInRow;
      
      if (col < GRID_SIZE - 1) {
        currentCellInRow = currentCellInRow?.step('d.1', 1) as any || null;
      }
    }
    
    if (row < GRID_SIZE - 1) {
      currentRowStart = currentRowStart?.step('d.2', 1) as any || null;
    }
  }

  return (
    <div className="original-rowcol-view">
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(60px, 120px))`,
          gridTemplateRows: `repeat(${GRID_SIZE}, auto)`,
          gap: '3px',
          justifyContent: 'center',
          alignContent: 'center',
          padding: '8px'
        }}
      >
        {grid.flat().map((cell, index) => {
          const gridRow = Math.floor(index / GRID_SIZE);
          const gridCol = index % GRID_SIZE;
          
          if (!cell) {
            return (
              <div 
                key={`empty-${gridRow}-${gridCol}`}
                style={{
                  minHeight: '24px',
                  border: '1px dashed #ccc',
                  background: '#f8f8f8'
                }}
              />
            );
          }
          
          return (
            <OriginalZZCell
              key={cell.id}
              cell={cell}
              isActive={cell.id === cursor.cellId}
              cursorType={cursorType}
              onClick={() => onCursorChange({ ...cursor, cellId: cell.id })}
              showTooltip={true}
            />
          );
        })}
      </div>

      {/* Grid info */}
      <div style={{
        position: 'absolute',
        bottom: '4px',
        left: '4px',
        fontSize: '9px',
        color: '#666',
        fontFamily: 'monospace'
      }}>
        Grid view: d.1 (cols) × d.2 (rows) • {GRID_SIZE}×{GRID_SIZE}
      </div>

      {/* Axis labels */}
      <div style={{
        position: 'absolute',
        top: '4px',
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: '9px',
        color: '#666',
        fontFamily: 'monospace',
        textAlign: 'center'
      }}>
        d.1 →
      </div>
      
      <div style={{
        position: 'absolute',
        left: '4px',
        top: '50%',
        transform: 'translateY(-50%) rotate(-90deg)',
        transformOrigin: 'center',
        fontSize: '9px',
        color: '#666',
        fontFamily: 'monospace',
        textAlign: 'center'
      }}>
        d.2 ↓
      </div>
    </div>
  );
};