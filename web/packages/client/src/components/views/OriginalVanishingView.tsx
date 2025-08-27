import React from 'react';
import { ZZSpace } from '@zigzag/core';
import { ZZCursor } from '../../App';
import { OriginalZZCell } from '../OriginalZZCell';

interface OriginalVanishingViewProps {
  space: ZZSpace;
  cursor: ZZCursor;
  cursorType: 'green' | 'blue';
  onCursorChange: (cursor: ZZCursor) => void;
}

export const OriginalVanishingView: React.FC<OriginalVanishingViewProps> = ({
  space,
  cursor,
  cursorType,
  onCursorChange
}) => {
  const currentCell = space.getCell(cursor.cellId);
  if (!currentCell) return <div>No cell found</div>;

  // Original GzigZag vanishing view parameters
  const CELL_WIDTH = 80;
  const CELL_HEIGHT = 24;
  const CENTER_X = 120;
  const CENTER_Y = 100;
  const SPACING_X = CELL_WIDTH + 8;
  const SPACING_Y = CELL_HEIGHT + 4;
  const MAX_DISTANCE = 3;

  // Collect cells in a 3D grid around the current cell
  const cellPositions: Array<{
    cell: any;
    x: number;
    y: number;
    depth: number;
    distance: number;
    coords?: { dx: number; dy: number; dz: number };
  }> = [];

  // Authentic 3D vanishing perspective - Manhattan distance algorithm
  // Get dimensions from cursor or use defaults
  const xDim = 'd.1';
  const yDim = 'd.2'; 
  const zDim = 'd.3';

  for (let dx = -MAX_DISTANCE; dx <= MAX_DISTANCE; dx++) {
    for (let dy = -MAX_DISTANCE; dy <= MAX_DISTANCE; dy++) {
      for (let dz = -MAX_DISTANCE; dz <= MAX_DISTANCE; dz++) {
        const manhattanDistance = Math.abs(dx) + Math.abs(dy) + Math.abs(dz);
        if (manhattanDistance > MAX_DISTANCE) continue;
        
        let cell = currentCell;
        let valid = true;
        
        // Navigate to position (dx, dy, dz) from current cell
        // X-axis navigation
        for (let i = 0; i < Math.abs(dx) && valid; i++) {
          const nextCell = cell.step(xDim, dx > 0 ? 1 : -1);
          if (!nextCell) {
            valid = false;
            break;
          }
          cell = nextCell;
        }
        
        // Y-axis navigation  
        for (let i = 0; i < Math.abs(dy) && valid; i++) {
          const nextCell = cell.step(yDim, dy > 0 ? 1 : -1);
          if (!nextCell) {
            valid = false;
            break;
          }
          cell = nextCell;
        }
        
        // Z-axis navigation (depth)
        for (let i = 0; i < Math.abs(dz) && valid; i++) {
          const nextCell = cell.step(zDim, dz > 0 ? 1 : -1);
          if (!nextCell) {
            valid = false;
            break;
          }
          cell = nextCell;
        }
        
        if (valid && cell) {
          // 3D vanishing perspective calculation
          const depth = manhattanDistance + dz * 0.5; // Z adds to depth
          const perspectiveFactor = Math.max(0.2, 1 - depth * 0.12);
          
          // Position with 3D perspective
          const x = CENTER_X + (dx * SPACING_X * perspectiveFactor) + (dz * 8 * perspectiveFactor);
          const y = CENTER_Y + (dy * SPACING_Y * perspectiveFactor) + (depth * 3) + (dz * 6);
          
          cellPositions.push({
            cell,
            x,
            y,
            depth,
            distance: manhattanDistance,
            coords: { dx, dy, dz }
          });
        }
      }
    }
  }

  // Sort by depth (back to front)
  cellPositions.sort((a, b) => b.depth - a.depth);

  // Draw connection lines
  const connectionLines: Array<{
    x1: number; y1: number;
    x2: number; y2: number;
    dimension: string;
  }> = [];

  cellPositions.forEach(pos => {
    // X-axis connections (d.1 - horizontal)
    const rightCell = pos.cell.step(xDim, 1);
    if (rightCell) {
      const rightPos = cellPositions.find(p => p.cell.id === rightCell.id);
      if (rightPos) {
        connectionLines.push({
          x1: pos.x + CELL_WIDTH/2,
          y1: pos.y + CELL_HEIGHT/2,
          x2: rightPos.x + CELL_WIDTH/2,
          y2: rightPos.y + CELL_HEIGHT/2,
          dimension: xDim
        });
      }
    }
    
    // Y-axis connections (d.2 - vertical)
    const downCell = pos.cell.step(yDim, 1);
    if (downCell) {
      const downPos = cellPositions.find(p => p.cell.id === downCell.id);
      if (downPos) {
        connectionLines.push({
          x1: pos.x + CELL_WIDTH/2,
          y1: pos.y + CELL_HEIGHT/2,
          x2: downPos.x + CELL_WIDTH/2,
          y2: downPos.y + CELL_HEIGHT/2,
          dimension: yDim
        });
      }
    }
    
    // Z-axis connections (d.3 - depth)
    const depthCell = pos.cell.step(zDim, 1);
    if (depthCell) {
      const depthPos = cellPositions.find(p => p.cell.id === depthCell.id);
      if (depthPos) {
        connectionLines.push({
          x1: pos.x + CELL_WIDTH/2,
          y1: pos.y + CELL_HEIGHT/2,
          x2: depthPos.x + CELL_WIDTH/2,
          y2: depthPos.y + CELL_HEIGHT/2,
          dimension: zDim
        });
      }
    }
  });

  return (
    <div className="original-vanishing-view">
      <div className="vanishing-container">
        {/* SVG for connection lines */}
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 1
          }}
        >
          {connectionLines.map((line, index) => {
            // Different line styles for different dimensions
            let strokeDasharray = 'none';
            let strokeWidth = '1';
            let stroke = '#666666';
            
            if (line.dimension === yDim) {
              strokeDasharray = '2,2';  // Dashed for Y-axis
            } else if (line.dimension === zDim) {
              strokeDasharray = '4,2,1,2';  // Dot-dash for Z-axis
              stroke = '#888888';
            }
            
            return (
              <line
                key={index}
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                className="original-connection"
                strokeDasharray={strokeDasharray}
                strokeWidth={strokeWidth}
                stroke={stroke}
              />
            );
          })}
        </svg>

        {/* Render cells */}
        {cellPositions.map((pos, index) => {
          const perspectiveFactor = Math.max(0.4, 1 - pos.depth * 0.15);
          return (
            <div
              key={`${pos.cell.id}-${index}`}
              className="vanishing-cell"
              style={{
                position: 'absolute',
                left: `${pos.x}px`,
                top: `${pos.y}px`,
                transform: `scale(${perspectiveFactor})`,
                transformOrigin: 'center center',
                zIndex: Math.round(100 - pos.depth * 10),
                opacity: Math.max(0.4, 1 - pos.depth * 0.2)
              }}
            >
              <OriginalZZCell
                cell={pos.cell}
                isActive={pos.cell.id === cursor.cellId}
                cursorType={cursorType}
                onClick={() => onCursorChange({ ...cursor, cellId: pos.cell.id })}
                showTooltip={pos.distance <= 1}
              />
            </div>
          );
        })}

        {/* Dimension indicators */}
        <div style={{
          position: 'absolute',
          top: '8px',
          left: '8px',
          fontSize: '9px',
          fontFamily: 'monospace',
          color: '#666',
          background: 'rgba(255,255,255,0.8)',
          padding: '4px',
          borderRadius: '2px'
        }}>
          <div>X: {xDim} (horizontal, solid lines)</div>
          <div>Y: {yDim} (vertical, dashed lines)</div>
          <div>Z: {zDim} (depth, dot-dash lines)</div>
          <div style={{ marginTop: '2px', fontSize: '8px', fontStyle: 'italic' }}>
            Vanishing View - Manhattan Distance ≤ {MAX_DISTANCE}
          </div>
        </div>
      </div>
    </div>
  );
};