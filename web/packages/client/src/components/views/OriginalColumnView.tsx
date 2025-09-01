import React from 'react';
import { ZZSpace } from '@zigzag/core';
import { ZZCursor } from '../../App';
import { OriginalZZCell } from '../OriginalZZCell';

interface OriginalColumnViewProps {
  space: ZZSpace;
  cursor: ZZCursor;
  cursorType: 'green' | 'blue';
  onCursorChange: (cursor: ZZCursor) => void;
}

export const OriginalColumnView: React.FC<OriginalColumnViewProps> = ({
  space,
  cursor,
  cursorType,
  onCursorChange
}) => {
  const currentCell = space.getCell(cursor.cellId);
  if (!currentCell) return <div>No cell found</div>;

  // Column view shows vertical arrangement - transpose of row view
  const primaryDim = cursor.yDimension || 'd.2'; // Primary dimension is vertical
  const secondaryDim = cursor.dimension; // Secondary dimension is horizontal
  const VISIBLE_COLS = 7;
  const CELLS_PER_COL = 9;
  const CENTER_COL = Math.floor(VISIBLE_COLS / 2);
  const CENTER_ROW = Math.floor(CELLS_PER_COL / 2);

  // Build column structure
  const columnStructure: any[][] = Array(VISIBLE_COLS).fill(null).map(() => 
    Array(CELLS_PER_COL).fill(null)
  );

  // Find starting point (top-left of view)
  let colStart = currentCell;
  
  // Move left in secondary dimension to find leftmost column
  for (let i = 0; i < CENTER_COL; i++) {
    const leftCell = colStart.step(secondaryDim, -1);
    if (leftCell) colStart = leftCell;
  }

  // Build each column
  for (let col = 0; col < VISIBLE_COLS; col++) {
    let cellInCol = colStart;
    
    // Move up to find start of this column
    for (let i = 0; i < CENTER_ROW; i++) {
      const upCell = cellInCol?.step(primaryDim, -1);
      if (upCell) cellInCol = upCell;
    }
    
    // Fill the column from top to bottom
    for (let row = 0; row < CELLS_PER_COL; row++) {
      columnStructure[col][row] = cellInCol;
      if (row < CELLS_PER_COL - 1 && cellInCol) {
        cellInCol = cellInCol.step(primaryDim, 1);
      }
    }
    
    // Move to next column
    if (col < VISIBLE_COLS - 1) {
      colStart = colStart?.step(secondaryDim, 1);
    }
  }

  return (
    <div className="original-column-view" style={{
      position: 'relative',
      height: '100%',
      overflow: 'auto',
      padding: '8px',
      background: 'var(--gzz-data-pane-bg)'
    }}>
      {/* Header */}
      <div style={{
        fontSize: '10px',
        color: 'var(--gzz-text-primary)',
        fontFamily: 'var(--gzz-mono-font)',
        textAlign: 'center',
        marginBottom: '8px',
        padding: '4px',
        borderBottom: '1px solid var(--gzz-cell-border)',
        background: 'var(--gzz-cell-bg)'
      }}>
        COLUMN VIEW: {secondaryDim} (horizontal) × {primaryDim} (vertical)
      </div>

      {/* Column headers */}
      <div style={{
        display: 'flex',
        gap: '2px',
        marginBottom: '4px',
        justifyContent: 'center'
      }}>
        {Array(VISIBLE_COLS).fill(0).map((_, col) => (
          <div key={`col-${col}`} style={{
            width: '60px',
            fontSize: '8px',
            color: 'var(--gzz-text-secondary)',
            textAlign: 'center',
            fontFamily: 'var(--gzz-mono-font)',
            background: col === CENTER_COL ? 'var(--gzz-cell-stretch)' : 'transparent'
          }}>
            {col - CENTER_COL >= 0 ? `+${col - CENTER_COL}` : col - CENTER_COL}
          </div>
        ))}
      </div>

      {/* Column grid */}
      <div style={{
        display: 'flex',
        gap: '2px',
        justifyContent: 'center',
        alignItems: 'flex-start'
      }}>
        {columnStructure.map((column, colIndex) => (
          <div key={colIndex} style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            alignItems: 'center'
          }}>
            {column.map((cell, rowIndex) => {
              const isCurrentCell = cell?.id === cursor.cellId;
              const isCenter = colIndex === CENTER_COL && rowIndex === CENTER_ROW;
              
              if (!cell) {
                return (
                  <div 
                    key={`empty-${colIndex}-${rowIndex}`}
                    style={{
                      width: '60px',
                      height: '24px',
                      border: isCenter ? '2px dashed var(--gzz-text-secondary)' : '1px dashed var(--gzz-cell-border)',
                      background: isCenter ? 'var(--gzz-cell-stretch)' : 'var(--gzz-window-bg)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      color: 'var(--gzz-text-secondary)'
                    }}
                  >
                    {isCenter ? '⊕' : ''}
                  </div>
                );
              }

              return (
                <div key={cell.id} style={{
                  position: 'relative',
                  background: isCenter && !isCurrentCell ? 'var(--gzz-cell-stretch)' : 'transparent',
                  width: '60px'
                }}>
                  <OriginalZZCell
                    cell={cell}
                    isActive={isCurrentCell}
                    cursorType={cursorType}
                    onClick={() => onCursorChange({ ...cursor, cellId: cell.id })}
                    showTooltip={true}
                  />
                  
                  {/* Center marker */}
                  {isCenter && !isCurrentCell && (
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
        ))}
        
        {/* Row indicators on the right */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          marginLeft: '8px',
          alignItems: 'center'
        }}>
          {Array(CELLS_PER_COL).fill(0).map((_, row) => (
            <div key={`row-${row}`} style={{
              height: '24px',
              width: '20px',
              fontSize: '8px',
              color: 'var(--gzz-text-secondary)',
              textAlign: 'center',
              fontFamily: 'var(--gzz-mono-font)',
              background: row === CENTER_ROW ? 'var(--gzz-cell-stretch)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {row - CENTER_ROW >= 0 ? `+${row - CENTER_ROW}` : row - CENTER_ROW}
            </div>
          ))}
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
        Column view: {VISIBLE_COLS} columns × {CELLS_PER_COL} rows • Cursor at center
      </div>
    </div>
  );
};