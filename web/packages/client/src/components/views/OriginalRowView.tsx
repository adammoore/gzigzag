import React from 'react';
import { ZZSpace } from '@zigzag/core';
import { ZZCursor } from '../../App';
import { OriginalZZCell } from '../OriginalZZCell';

interface OriginalRowViewProps {
  space: ZZSpace;
  cursor: ZZCursor;
  cursorType: 'green' | 'blue';
  onCursorChange: (cursor: ZZCursor) => void;
}

export const OriginalRowView: React.FC<OriginalRowViewProps> = ({
  space,
  cursor,
  cursorType,
  onCursorChange
}) => {
  const currentCell = space.getCell(cursor.cellId);
  if (!currentCell) return <div>No cell found</div>;

  // Row view shows horizontal arrangement based on one primary dimension
  const primaryDim = cursor.dimension;
  const secondaryDim = cursor.yDimension || 'd.2';
  const VISIBLE_ROWS = 5;
  const CELLS_PER_ROW = 7;
  const CENTER_ROW = Math.floor(VISIBLE_ROWS / 2);
  const CENTER_COL = Math.floor(CELLS_PER_ROW / 2);

  // Build row structure
  const rowStructure: any[][] = Array(VISIBLE_ROWS).fill(null).map(() => 
    Array(CELLS_PER_ROW).fill(null)
  );

  // Find starting point (top-left of view)
  let rowStart: any = currentCell;
  
  // Move up in secondary dimension to find top row
  for (let i = 0; i < CENTER_ROW; i++) {
    const upCell = rowStart?.step(secondaryDim, -1);
    if (upCell) rowStart = upCell;
  }

  // Build each row
  for (let row = 0; row < VISIBLE_ROWS; row++) {
    let cellInRow = rowStart;
    
    // Move left to find start of this row
    for (let i = 0; i < CENTER_COL; i++) {
      const leftCell = cellInRow?.step(primaryDim, -1);
      if (leftCell) cellInRow = leftCell;
    }
    
    // Fill the row from left to right
    for (let col = 0; col < CELLS_PER_ROW; col++) {
      rowStructure[row][col] = cellInRow;
      if (col < CELLS_PER_ROW - 1 && cellInRow) {
        cellInRow = cellInRow.step(primaryDim, 1);
      }
    }
    
    // Move to next row
    if (row < VISIBLE_ROWS - 1 && rowStart) {
      rowStart = rowStart.step(secondaryDim, 1);
    }
  }

  return (
    <div className="original-row-view" style={{
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
        ROW VIEW: {primaryDim} (horizontal) × {secondaryDim} (vertical)
      </div>

      {/* Row grid */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        alignItems: 'center'
      }}>
        {rowStructure.map((row, rowIndex) => (
          <div key={rowIndex} style={{
            display: 'flex',
            gap: '4px',
            alignItems: 'center'
          }}>
            {/* Row indicator */}
            <div style={{
              width: '20px',
              fontSize: '8px',
              color: 'var(--gzz-text-secondary)',
              textAlign: 'center',
              fontFamily: 'var(--gzz-mono-font)',
              background: rowIndex === CENTER_ROW ? 'var(--gzz-cell-stretch)' : 'transparent'
            }}>
              {rowIndex - CENTER_ROW >= 0 ? `+${rowIndex - CENTER_ROW}` : rowIndex - CENTER_ROW}
            </div>

            {/* Row cells */}
            {row.map((cell, colIndex) => {
              const isCurrentCell = cell?.id === cursor.cellId;
              const isCenter = rowIndex === CENTER_ROW && colIndex === CENTER_COL;
              
              if (!cell) {
                return (
                  <div 
                    key={`empty-${rowIndex}-${colIndex}`}
                    style={{
                      width: '70px',
                      height: '28px',
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
                  background: isCenter && !isCurrentCell ? 'var(--gzz-cell-stretch)' : 'transparent'
                }}>
                  <OriginalZZCell
                    cell={cell}
                    isActive={isCurrentCell}
                    cursorType={cursorType}
                    onClick={() => onCursorChange({ ...cursor, cellId: cell.id })}
                    showTooltip={true}
                  />
                  
                  {/* Center marker for reference point */}
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
      </div>

      {/* Column headers */}
      <div style={{
        position: 'absolute',
        top: '50px',
        left: '40px',
        right: '8px',
        display: 'flex',
        gap: '4px',
        justifyContent: 'center'
      }}>
        {Array(CELLS_PER_ROW).fill(0).map((_, col) => (
          <div key={`col-${col}`} style={{
            width: '70px',
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
        Row view: {VISIBLE_ROWS} rows × {CELLS_PER_ROW} columns • Cursor at center
      </div>
    </div>
  );
};