import React from 'react';
import { ZZSpace } from '@zigzag/core';
import { ZZCursor } from '../../App';
import { OriginalZZCell } from '../OriginalZZCell';

interface OriginalStretchVanishingViewProps {
  space: ZZSpace;
  cursor: ZZCursor;
  cursorType: 'green' | 'blue';
  onCursorChange: (cursor: ZZCursor) => void;
}

export const OriginalStretchVanishingView: React.FC<OriginalStretchVanishingViewProps> = ({
  space,
  cursor,
  cursorType,
  onCursorChange
}) => {
  const currentCell = space.getCell(cursor.cellId);
  if (!currentCell) return <div>No cell found</div>;

  // Stretch Vanishing view parameters - different from regular vanishing
  const SCALE_FACTOR = 0.85; // How much each level shrinks
  const MAX_LEVELS = 4; // Show 4 levels in each direction
  const BASE_SIZE = 80; // Base cell size

  // Build cell network in 3D space with stretch effect
  const cellNetwork: { [key: string]: { 
    cell: any, 
    x: number, 
    y: number, 
    z: number, 
    size: number,
    level: number
  } } = {};

  // Get dimensions for navigation
  const xDim = cursor.xDimension || 'd.1';
  const yDim = cursor.yDimension || 'd.2';
  const zDim = cursor.zDimension || 'd.3';

  // Build the network around the current cell
  const buildNetwork = (cell: any, level: number, visited = new Set()) => {
    if (level > MAX_LEVELS || visited.has(cell.id)) return;
    visited.add(cell.id);

    // Calculate position with perspective stretching effect
    const stretch = Math.pow(SCALE_FACTOR, Math.abs(level));
    const size = BASE_SIZE * stretch;

    cellNetwork[cell.id] = {
      cell,
      x: level * 100 * stretch, // Stretched spacing
      y: 0,
      z: level * 20, // Depth effect
      size,
      level: Math.abs(level)
    };

    // Recursively build network in all dimensions
    if (Math.abs(level) < MAX_LEVELS) {
      // X dimension
      const xPos = cell.step(xDim, 1);
      const xNeg = cell.step(xDim, -1);
      if (xPos) buildNetwork(xPos, level + 1, visited);
      if (xNeg) buildNetwork(xNeg, level - 1, visited);

      // Y dimension  
      const yPos = cell.step(yDim, 1);
      const yNeg = cell.step(yDim, -1);
      if (yPos) buildNetwork(yPos, level + 1, visited);
      if (yNeg) buildNetwork(yNeg, level - 1, visited);

      // Z dimension
      const zPos = cell.step(zDim, 1);
      const zNeg = cell.step(zDim, -1);
      if (zPos) buildNetwork(zPos, level + 1, visited);
      if (zNeg) buildNetwork(zNeg, level - 1, visited);
    }
  };

  buildNetwork(currentCell, 0);

  return (
    <div className="original-vanishing-view" style={{
      position: 'relative',
      height: '100%',
      overflow: 'hidden',
      perspective: '600px',
      perspectiveOrigin: 'center center',
      background: 'var(--gzz-data-pane-bg)'
    }}>
      {/* Header */}
      <div style={{
        position: 'absolute',
        top: '8px',
        left: '8px',
        right: '8px',
        textAlign: 'center',
        fontSize: '10px',
        color: 'var(--gzz-text-primary)',
        fontFamily: 'var(--gzz-mono-font)',
        zIndex: 1000,
        background: 'var(--gzz-cell-bg)',
        border: '1px solid var(--gzz-cell-border)',
        padding: '2px'
      }}>
        STRETCH VANISHING VIEW: {xDim}×{yDim}×{zDim}
      </div>

      {/* Cell network with stretch perspective */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transformOrigin: 'center center',
        transformStyle: 'preserve-3d'
      }}>
        {Object.entries(cellNetwork).map(([cellId, cellData]) => {
          const isCurrentCell = cellId === cursor.cellId;
          const { cell, x, y, z, size, level } = cellData;
          
          // Apply stretching transform
          const opacity = Math.max(0.3, 1 - (level * 0.2));
          const transform = `
            translate3d(${x - size/2}px, ${y - size/2}px, ${z}px)
            scale(${Math.pow(SCALE_FACTOR, level)})
          `;

          return (
            <div
              key={cellId}
              style={{
                position: 'absolute',
                transform,
                opacity,
                zIndex: isCurrentCell ? 1000 : Math.max(1, 100 - level * 10),
                transition: 'none' // Authentic instant transitions
              }}
            >
              <div style={{
                width: `${size}px`,
                height: 'auto',
                minHeight: `${Math.max(24, size * 0.3)}px`,
                border: isCurrentCell 
                  ? `2px solid var(--gzz-cursor-${cursorType})`
                  : '1px solid var(--gzz-cell-border)',
                background: isCurrentCell 
                  ? `rgba(${cursorType === 'green' ? '0,128,0' : '0,0,255'}, 0.1)`
                  : 'var(--gzz-cell-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: `${Math.max(8, size * 0.15)}px`,
                fontFamily: 'var(--gzz-system-font)',
                cursor: 'pointer',
                userSelect: 'none',
                boxShadow: isCurrentCell 
                  ? `0 0 4px var(--gzz-cursor-${cursorType})`
                  : 'none'
              }}
              onClick={() => onCursorChange({ ...cursor, cellId })}
              title={`Level ${level} - ${cell.text || '(empty)'}`}
            >
              <span style={{
                wordBreak: 'break-word',
                textAlign: 'center',
                lineHeight: '1.1',
                color: 'var(--gzz-text-primary)'
              }}>
                {cell.text || '∅'}
              </span>
            </div>
          </div>
        );})}
      </div>

      {/* Dimension indicators */}
      <div style={{
        position: 'absolute',
        bottom: '8px',
        left: '8px',
        right: '8px',
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '9px',
        color: 'var(--gzz-text-secondary)',
        fontFamily: 'var(--gzz-mono-font)'
      }}>
        <span>X: {xDim}</span>
        <span>Y: {yDim}</span>
        <span>Z: {zDim}</span>
        <span>Stretch: {SCALE_FACTOR}</span>
      </div>
    </div>
  );
};