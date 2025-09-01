import React from 'react';
import { ZZSpace } from '@zigzag/core';
import { ZZCursor } from '../../App';
import { OriginalZZCell } from '../OriginalZZCell';

interface OriginalRankViewProps {
  space: ZZSpace;
  cursor: ZZCursor;
  cursorType: 'green' | 'blue';
  onCursorChange: (cursor: ZZCursor) => void;
}

export const OriginalRankView: React.FC<OriginalRankViewProps> = ({
  space,
  cursor,
  cursorType,
  onCursorChange
}) => {
  const currentCell = space.getCell(cursor.cellId);
  if (!currentCell) return <div>No cell found</div>;

  // Original GZZ Rank view - shows linear sequence along dimension
  const rank: any[] = [];
  
  // Find head of rank (go negative until we can't)
  let head = currentCell;
  while (true) {
    const prev = head.step(cursor.dimension, -1);
    if (!prev) break;
    head = prev;
  }
  
  // Build rank from head (go positive until we can't)
  let cell: any = head;
  while (cell) {
    rank.push(cell);
    cell = cell.step(cursor.dimension, 1);
  }

  // If no connections in current dimension, show just the current cell
  if (rank.length === 0) {
    rank.push(currentCell);
  }

  // Find current position in rank for better visualization
  const currentIndex = rank.findIndex(cell => cell.id === cursor.cellId);

  return (
    <div className="original-rank-view" style={{ 
      position: 'relative', 
      height: '100%',
      overflow: 'auto',
      padding: '12px'
    }}>
      {/* Rank header */}
      <div style={{
        fontSize: '11px',
        color: 'var(--gzz-text-primary)',
        fontFamily: 'var(--gzz-mono-font)',
        marginBottom: '8px',
        textAlign: 'center',
        borderBottom: '1px solid var(--gzz-cell-border)',
        paddingBottom: '4px'
      }}>
        RANK VIEW: {cursor.dimension} ({rank.length} cells)
      </div>

      {/* Vertical rank display (authentic GZZ style) */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px'
      }}>
        {rank.map((cell, index) => (
          <div key={cell.id} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative'
          }}>
            {/* Position indicator */}
            <div style={{
              fontSize: '8px',
              color: 'var(--gzz-text-secondary)',
              fontFamily: 'var(--gzz-mono-font)',
              marginBottom: '2px'
            }}>
              [{index}]
            </div>
            
            {/* Cell */}
            <div>
              <OriginalZZCell
                cell={cell}
                isActive={cell.id === cursor.cellId}
                cursorType={cursorType}
                onClick={() => onCursorChange({ ...cursor, cellId: cell.id })}
                showTooltip={true}
              />
            </div>
            
            {/* Connection arrow */}
            {index < rank.length - 1 && (
              <div style={{
                color: 'var(--gzz-connection-line)',
                fontSize: '12px',
                fontFamily: 'var(--gzz-mono-font)',
                marginTop: '2px'
              }}>
                ↓
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Current position indicator */}
      {currentIndex >= 0 && (
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
          Position {currentIndex + 1} of {rank.length} on {cursor.dimension}
        </div>
      )}
    </div>
  );
};