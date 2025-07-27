import React from 'react';
import { ZZSpace } from '@zigzag/core';
import { ZZCursor } from '../../App';
import { ZZCellComponent } from '../ZZCellComponent';
import styled from 'styled-components';

const VanishingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  height: 100%;
  perspective: 1000px;
  background: radial-gradient(ellipse at center, #2a2a2a 0%, #1a1a1a 100%);
`;

const CellGrid3D = styled.div`
  position: relative;
  transform-style: preserve-3d;
  width: 600px;
  height: 400px;
`;

const CellPosition = styled.div<{ 
  x: number; 
  y: number; 
  z: number; 
  distance: number;
  isActive: boolean;
}>`
  position: absolute;
  transform: translate3d(
    ${props => props.x}px, 
    ${props => props.y}px, 
    ${props => props.z}px
  ) scale(${props => Math.max(0.3, 1 - props.distance * 0.15)});
  opacity: ${props => Math.max(0.3, 1 - props.distance * 0.1)};
  z-index: ${props => Math.round(1000 - props.distance * 100)};
  transition: all 0.3s ease;
  
  ${props => props.isActive && `
    filter: brightness(1.3);
    z-index: 2000;
  `}
`;

const ConnectionLine = styled.div<{
  x1: number; y1: number; z1: number;
  x2: number; y2: number; z2: number;
  dimension: string;
}>`
  position: absolute;
  height: 2px;
  background: ${props => {
    switch(props.dimension) {
      case 'd.1': return '#ff6b6b'; // X-axis - Red
      case 'd.2': return '#4ecdc4'; // Y-axis - Teal  
      case 'd.3': return '#45b7d1'; // Z-axis - Blue
      default: return '#95a5a6';
    }
  }};
  transform-origin: left center;
  opacity: 0.7;
  pointer-events: none;
`;

const DimensionIndicator = styled.div`
  position: absolute;
  top: 20px;
  left: 20px;
  color: #fff;
  font-family: monospace;
  font-size: 14px;
  
  .axis {
    display: flex;
    align-items: center;
    margin: 5px 0;
    
    .color-box {
      width: 12px;
      height: 12px;
      margin-right: 8px;
      border-radius: 2px;
    }
  }
`;

interface VanishingViewProps {
  space: ZZSpace;
  cursor: ZZCursor;
  onCursorChange: (cursor: ZZCursor) => void;
}

export const VanishingView: React.FC<VanishingViewProps> = ({
  space,
  cursor,
  onCursorChange
}) => {
  const currentCell = space.getCell(cursor.cellId);
  if (!currentCell) return <div>No cell found</div>;

  // Define the 3D coordinate system
  const CELL_SPACING = 80;
  const MAX_DISTANCE = 4; // Maximum steps in each dimension
  const CENTER_X = 300;
  const CENTER_Y = 200;
  const CENTER_Z = 0;

  // Collect all cells within viewing distance with their 3D positions
  const visibleCells: Array<{
    cell: any;
    x: number;
    y: number;
    z: number;
    distance: number;
    pos: { dx: number; dy: number; dz: number };
  }> = [];

  const connections: Array<{
    x1: number; y1: number; z1: number;
    x2: number; y2: number; z2: number;
    dimension: string;
  }> = [];

  // Traverse the 3D space around the current cell
  for (let dx = -MAX_DISTANCE; dx <= MAX_DISTANCE; dx++) {
    for (let dy = -MAX_DISTANCE; dy <= MAX_DISTANCE; dy++) {
      for (let dz = -MAX_DISTANCE; dz <= MAX_DISTANCE; dz++) {
        let cell = currentCell;
        
        // Navigate to position (dx, dy, dz) from current cell
        // X-axis (d.1) navigation
        for (let i = 0; i < Math.abs(dx); i++) {
          const nextCell = cell.step('d.1', dx > 0 ? 1 : -1);
          if (!nextCell) break;
          cell = nextCell;
        }
        
        // Y-axis (d.2) navigation  
        for (let i = 0; i < Math.abs(dy); i++) {
          const nextCell = cell.step('d.2', dy > 0 ? 1 : -1);
          if (!nextCell) break;
          cell = nextCell;
        }
        
        // Z-axis (d.3) navigation
        for (let i = 0; i < Math.abs(dz); i++) {
          const nextCell = cell.step('d.3', dz > 0 ? 1 : -1);
          if (!nextCell) break;
          cell = nextCell;
        }
        
        if (cell) {
          const x = CENTER_X + dx * CELL_SPACING;
          const y = CENTER_Y + dy * CELL_SPACING;
          const z = CENTER_Z + dz * CELL_SPACING;
          const distance = Math.abs(dx) + Math.abs(dy) + Math.abs(dz);
          
          visibleCells.push({
            cell,
            x, y, z,
            distance,
            pos: { dx, dy, dz }
          });
          
          // Add connections for adjacent cells
          if (dx < MAX_DISTANCE) {
            const rightCell = cell.step('d.1', 1);
            if (rightCell) {
              connections.push({
                x1: x, y1: y, z1: z,
                x2: x + CELL_SPACING, y2: y, z2: z,
                dimension: 'd.1'
              });
            }
          }
          
          if (dy < MAX_DISTANCE) {
            const downCell = cell.step('d.2', 1);
            if (downCell) {
              connections.push({
                x1: x, y1: y, z1: z,
                x2: x, y2: y + CELL_SPACING, z2: z,
                dimension: 'd.2'
              });
            }
          }
          
          if (dz < MAX_DISTANCE) {
            const forwardCell = cell.step('d.3', 1);
            if (forwardCell) {
              connections.push({
                x1: x, y1: y, z1: z,
                x2: x, y2: y, z2: z + CELL_SPACING,
                dimension: 'd.3'
              });
            }
          }
        }
      }
    }
  }

  return (
    <VanishingContainer>
      <DimensionIndicator>
        <div className="axis">
          <div className="color-box" style={{ background: '#ff6b6b' }}></div>
          <span>X = d.1 (horizontal)</span>
        </div>
        <div className="axis">
          <div className="color-box" style={{ background: '#4ecdc4' }}></div>
          <span>Y = d.2 (vertical)</span>
        </div>
        <div className="axis">
          <div className="color-box" style={{ background: '#45b7d1' }}></div>
          <span>Z = d.3 (depth)</span>
        </div>
      </DimensionIndicator>

      <CellGrid3D>
        {/* Render connection lines first (background) */}
        {connections.map((conn, index) => {
          const length = Math.sqrt(
            Math.pow(conn.x2 - conn.x1, 2) +
            Math.pow(conn.y2 - conn.y1, 2) +
            Math.pow(conn.z2 - conn.z1, 2)
          );
          const angle = Math.atan2(conn.y2 - conn.y1, conn.x2 - conn.x1) * 180 / Math.PI;
          
          return (
            <ConnectionLine
              key={`conn-${index}`}
              x1={conn.x1} y1={conn.y1} z1={conn.z1}
              x2={conn.x2} y2={conn.y2} z2={conn.z2}
              dimension={conn.dimension}
              style={{
                left: conn.x1,
                top: conn.y1,
                width: length,
                transform: `translateZ(${conn.z1}px) rotate(${angle}deg)`,
              }}
            />
          );
        })}

        {/* Render cells */}
        {visibleCells.map((item, index) => (
          <CellPosition
            key={`${item.cell.id}-${item.pos.dx}-${item.pos.dy}-${item.pos.dz}`}
            x={item.x - 60} // Center the cell
            y={item.y - 20}
            z={item.z}
            distance={item.distance}
            isActive={item.cell.id === cursor.cellId}
            style={{
              left: 0,
              top: 0,
            }}
          >
            <ZZCellComponent
              cell={item.cell}
              isActive={item.cell.id === cursor.cellId}
              onClick={() => onCursorChange({ ...cursor, cellId: item.cell.id })}
            />
          </CellPosition>
        ))}
      </CellGrid3D>
    </VanishingContainer>
  );
};
