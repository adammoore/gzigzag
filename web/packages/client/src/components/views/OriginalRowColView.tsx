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

  // Original GZZ RowCol view - flexible 2D grid based on actual connections
  // Uses cursor's X and Y dimensions for authentic multi-dimensional display
  const GRID_SIZE = 9; // Larger grid for better context
  const CENTER_POS = Math.floor(GRID_SIZE / 2);
  
  // Use cursor dimensions for X and Y axes  
  const xDimension = cursor.xDimension || 'd.1';
  const yDimension = cursor.yDimension || 'd.2';
  
  // Build 2D grid
  const grid: Array<Array<any>> = Array(GRID_SIZE).fill(null).map(() => 
    Array(GRID_SIZE).fill(null)
  );

  // Find grid origin by moving to top-left corner
  let originCell = currentCell;
  
  // Navigate to top-left corner of the view
  for (let i = 0; i < CENTER_POS; i++) {
    const upCell = originCell.step(yDimension, -1);
    if (upCell) originCell = upCell;
  }
  
  for (let i = 0; i < CENTER_POS; i++) {
    const leftCell = originCell.step(xDimension, -1);
    if (leftCell) originCell = leftCell;
  }

  // Fill grid from origin
  let currentRowStart = originCell;
  
  for (let row = 0; row < GRID_SIZE; row++) {
    let currentCellInRow = currentRowStart;
    
    for (let col = 0; col < GRID_SIZE; col++) {
      grid[row][col] = currentCellInRow;
      
      if (col < GRID_SIZE - 1 && currentCellInRow) {
        currentCellInRow = currentCellInRow.step(xDimension, 1) as any || null;
      }
    }
    
    if (row < GRID_SIZE - 1 && currentRowStart) {
      currentRowStart = currentRowStart.step(yDimension, 1) as any || null;
    }
  }

  // Calculate some statistics for display
  const populatedCells = grid.flat().filter(cell => cell !== null).length;
  const centerRow = CENTER_POS;
  const centerCol = CENTER_POS;

  return (
    <div className="original-rowcol-view" style={{
      position: 'relative',
      height: '100%',
      overflow: 'auto',
      padding: '8px'
    }}>
      {/* Header */}
      <div style={{
        fontSize: '10px',
        color: 'var(--gzz-text-primary)',
        fontFamily: 'var(--gzz-mono-font)',
        textAlign: 'center',
        marginBottom: '6px',
        padding: '4px',
        borderBottom: '1px solid var(--gzz-cell-border)'
      }}>
        ROWCOL VIEW: {xDimension} (→) × {yDimension} (↓) • {populatedCells} cells
      </div>

      {/* Grid container */}
      <div style={{ 
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative'
      }}>
        {/* Column headers */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${GRID_SIZE}, 80px)`,
          gap: '2px',
          marginBottom: '4px'
        }}>
          {Array(GRID_SIZE).fill(0).map((_, col) => (
            <div key={`col-${col}`} style={{
              fontSize: '8px',
              color: 'var(--gzz-text-secondary)',
              textAlign: 'center',
              fontFamily: 'var(--gzz-mono-font)',
              background: col === centerCol ? 'var(--gzz-cell-stretch)' : 'transparent'
            }}>
              {col - centerCol >= 0 ? `+${col - centerCol}` : col - centerCol}
            </div>
          ))}
        </div>

        {/* Grid with row headers */}
        {grid.map((row, rowIndex) => (
          <div key={`row-${rowIndex}`} style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '2px'
          }}>
            {/* Row header */}
            <div style={{
              width: '24px',
              fontSize: '8px',
              color: 'var(--gzz-text-secondary)',
              textAlign: 'center',
              fontFamily: 'var(--gzz-mono-font)',
              marginRight: '4px',
              background: rowIndex === centerRow ? 'var(--gzz-cell-stretch)' : 'transparent'
            }}>
              {rowIndex - centerRow >= 0 ? `+${rowIndex - centerRow}` : rowIndex - centerRow}
            </div>
            
            {/* Row cells */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${GRID_SIZE}, 80px)`,
              gap: '2px'
            }}>
              {row.map((cell, colIndex) => {
                const isCenter = rowIndex === centerRow && colIndex === centerCol;
                
                if (!cell) {
                  return (
                    <div 
                      key={`empty-${rowIndex}-${colIndex}`}
                      style={{
                        minHeight: '32px',
                        border: isCenter ? '2px dashed var(--gzz-text-secondary)' : '1px dashed var(--gzz-cell-border)',
                        background: isCenter ? 'var(--gzz-cell-stretch)' : 'var(--gzz-window-bg)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        color: 'var(--gzz-text-secondary)'
                      }}
                    >
                      {isCenter ? '∅' : ''}
                    </div>
                  );
                }
                
                const isActiveCursor = cell.id === cursor.cellId;
                
                return (
                  <div 
                    key={cell.id} 
                    style={{
                      position: 'relative',
                      background: isCenter && !isActiveCursor ? 'var(--gzz-cell-stretch)' : 'transparent'
                    }}
                  >
                    <OriginalZZCell
                      cell={cell}
                      isActive={isActiveCursor}
                      cursorType={cursorType}
                      onClick={() => onCursorChange({ ...cursor, cellId: cell.id })}
                      showTooltip={true}
                    />
                    
                    {/* Center marker */}
                    {isCenter && !isActiveCursor && (
                      <div style={{
                        position: 'absolute',
                        top: '2px',
                        right: '2px',
                        fontSize: '8px',
                        color: 'var(--gzz-dimension-indicator)',
                        fontWeight: 'bold'
                      }}>
                        ⊕
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Axis labels */}
      <div style={{
        position: 'absolute',
        top: '32px',
        right: '8px',
        fontSize: '9px',
        color: 'var(--gzz-text-secondary)',
        fontFamily: 'var(--gzz-mono-font)',
        textAlign: 'right',
        lineHeight: '12px'
      }}>
        <div>{xDimension} →</div>
        <div style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
          {yDimension} ↓
        </div>
      </div>

      {/* Status info */}
      <div style={{
        position: 'absolute',
        bottom: '8px',
        left: '8px',
        right: '8px',
        textAlign: 'center',
        fontSize: '9px',
        color: 'var(--gzz-text-primary)',
        fontFamily: 'var(--gzz-mono-font)',
        background: 'var(--gzz-cell-bg)',
        padding: '4px',
        border: '1px solid var(--gzz-cell-border)'
      }}>
        {GRID_SIZE}×{GRID_SIZE} grid • {populatedCells} populated • Cursor at center
      </div>
    </div>
  );
};