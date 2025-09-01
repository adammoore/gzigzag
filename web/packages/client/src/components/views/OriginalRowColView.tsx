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
        color: '#333',
        fontFamily: 'monospace',
        textAlign: 'center',
        marginBottom: '6px',
        padding: '4px',
        borderBottom: '1px solid #ddd'
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
              color: '#888',
              textAlign: 'center',
              fontFamily: 'monospace',
              background: col === centerCol ? '#e8f5e8' : 'transparent'
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
              color: '#888',
              textAlign: 'center',
              fontFamily: 'monospace',
              marginRight: '4px',
              background: rowIndex === centerRow ? '#e8f5e8' : 'transparent'
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
                        border: isCenter ? '2px dashed #999' : '1px dashed #ddd',
                        background: isCenter ? '#f0f8ff' : '#f9f9f9',
                        borderRadius: '3px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        color: '#ccc'
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
                      border: isActiveCursor 
                        ? `3px solid ${cursorType === 'green' ? '#4CAF50' : '#2196F3'}`
                        : isCenter 
                        ? '2px solid #ff9800'
                        : '1px solid #ddd',
                      borderRadius: '4px',
                      boxShadow: isActiveCursor 
                        ? `0 0 6px ${cursorType === 'green' ? '#4CAF50' : '#2196F3'}`
                        : isCenter
                        ? '0 0 3px #ff9800'
                        : 'none',
                      background: isCenter && !isActiveCursor ? '#fff3e0' : 'white'
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
                        color: '#ff9800',
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
        color: '#666',
        fontFamily: 'monospace',
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
        color: '#666',
        fontFamily: 'monospace',
        background: 'rgba(255,255,255,0.9)',
        padding: '4px',
        borderRadius: '3px',
        border: '1px solid #ddd'
      }}>
        {GRID_SIZE}×{GRID_SIZE} grid • {populatedCells} populated • Cursor at center
      </div>
    </div>
  );
};