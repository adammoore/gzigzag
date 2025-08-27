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

  // Get the full rank along current dimension
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

  return (
    <div className="original-rank-view">
      {rank.map((cell, index) => (
        <React.Fragment key={cell.id}>
          <OriginalZZCell
            cell={cell}
            isActive={cell.id === cursor.cellId}
            cursorType={cursorType}
            onClick={() => onCursorChange({ ...cursor, cellId: cell.id })}
            showTooltip={true}
          />
          {index < rank.length - 1 && (
            <span 
              style={{ 
                color: '#666', 
                fontSize: '14px', 
                margin: '0 4px',
                fontFamily: 'monospace'
              }}
            >
              →
            </span>
          )}
        </React.Fragment>
      ))}
      
      {/* Show dimension info */}
      <div style={{ 
        position: 'absolute', 
        bottom: '4px', 
        left: '4px', 
        fontSize: '9px',
        color: '#666',
        fontFamily: 'monospace'
      }}>
        Rank view: {cursor.dimension} • {rank.length} cells
      </div>
    </div>
  );
};