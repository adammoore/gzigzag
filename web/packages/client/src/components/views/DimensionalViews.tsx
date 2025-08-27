// packages/client/src/components/views/DimensionalViews.tsx
import React from 'react';
import styled from 'styled-components';

type ZZCell = {
  id: string;
  text: string;
  step: (dimension: string, direction: 1 | -1) => ZZCell | null;
};

type ZZSpace = {
  getCell: (id: string) => ZZCell | null;
};

type ZZCursor = {
  cellId: string;
  dimension: string;
  viewType: 'rank' | 'vanishing' | 'rowcol';
};

type DimensionalMapping = {
  x: string;
  y: string;
  z: string;
};

interface DimensionalViewProps {
  space: ZZSpace;
  cursor: ZZCursor;
  dimensionalMapping: DimensionalMapping;
  onCellClick: (cellId: string) => void;
  onCellDoubleClick: (cellId: string) => void;
}

// Styled components
const ViewContainer = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  position: relative;
`;

const CellBox = styled.div<{ 
  isActive: boolean; 
  depth?: number;
  x?: number;
  y?: number;
}>`
  padding: 8px 12px;
  margin: 4px;
  border: 2px solid ${props => props.isActive ? '#00ff00' : '#666'};
  background: ${props => props.isActive ? '#2a3a2a' : '#222'};
  color: white;
  border-radius: 4px;
  cursor: pointer;
  min-width: 100px;
  text-align: center;
  transition: all 0.3s ease;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  position: absolute;
  
  ${props => props.depth && `
    transform: scale(${1 - props.depth * 0.1});
    opacity: ${1 - props.depth * 0.2};
    z-index: ${10 - props.depth};
  `}
  
  ${props => props.x !== undefined && props.y !== undefined && `
    left: ${props.x}px;
    top: ${props.y}px;
  `}
  
  &:hover {
    border-color: #888;
    background: #333;
  }
`;

const ConnectionLine = styled.div<{
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color?: string;
}>`
  position: absolute;
  background: ${props => props.color || '#666'};
  height: 2px;
  transform-origin: left center;
  pointer-events: none;
  z-index: 1;
  
  ${props => {
    const dx = props.x2 - props.x1;
    const dy = props.y2 - props.y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    
    return `
      left: ${props.x1}px;
      top: ${props.y1}px;
      width: ${length}px;
      transform: rotate(${angle}deg);
    `;
  }}
`;

const AxisLabel = styled.div<{ position: 'top' | 'left' | 'right' }>`
  position: absolute;
  color: #888;
  font-size: 12px;
  font-family: 'Courier New', monospace;
  
  ${props => {
    switch (props.position) {
      case 'top': return 'top: 10px; left: 50%; transform: translateX(-50%);';
      case 'left': return 'left: 10px; top: 50%; transform: translateY(-50%) rotate(-90deg);';
      case 'right': return 'right: 10px; top: 50%; transform: translateY(-50%) rotate(90deg);';
    }
  }}
`;

// Rank View - Linear display along single dimension
export const DimensionalRankView: React.FC<DimensionalViewProps> = ({
  space,
  cursor,
  onCellClick,
  onCellDoubleClick
}) => {
  const currentCell = space.getCell(cursor.cellId);
  if (!currentCell) return <div>No cell found</div>;

  // Get the full rank along current dimension
  const rank: ZZCell[] = [];
  
  // Find head of rank
  let head = currentCell;
  while (true) {
    const prev = head.step(cursor.dimension, -1);
    if (!prev) break;
    head = prev;
  }
  
  // Build rank from head
  let cell: ZZCell | null = head;
  while (cell) {
    rank.push(cell);
    cell = cell.step(cursor.dimension, 1);
  }

  return (
    <ViewContainer>
      <AxisLabel position="top">{cursor.dimension}</AxisLabel>
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {rank.map((cell, index) => (
          <React.Fragment key={cell.id}>
            <CellBox
              isActive={cell.id === cursor.cellId}
              onClick={() => onCellClick(cell.id)}
              onDoubleClick={() => onCellDoubleClick(cell.id)}
            >
              {cell.text}
            </CellBox>
            {index < rank.length - 1 && (
              <div style={{ color: '#666', fontSize: '20px' }}>→</div>
            )}
          </React.Fragment>
        ))}
      </div>
    </ViewContainer>
  );
};

// Vanishing View - 3D perspective with dimensional mapping
export const DimensionalVanishingView: React.FC<DimensionalViewProps> = ({
  space,
  cursor,
  dimensionalMapping,
  onCellClick,
  onCellDoubleClick
}) => {
  const currentCell = space.getCell(cursor.cellId);
  if (!currentCell) return <div>No cell found</div>;

  const centerX = 400;
  const centerY = 300;
  const cellWidth = 100;
  const cellHeight = 30;
  const stepX = 120;
  const stepY = 40;
  const stepZ = 20;

  // Collect cells within Manhattan distance of 3
  const cellsToRender: Array<{
    cell: ZZCell;
    x: number;
    y: number;
    depth: number;
    position: { x: number; y: number; z: number };
  }> = [];

  const visited = new Set<string>();
  
  const exploreFromCell = (
    cell: ZZCell, 
    pos: { x: number; y: number; z: number }, 
    depth: number
  ) => {
    if (depth > 3 || visited.has(cell.id)) return;
    visited.add(cell.id);

    const screenX = centerX + pos.x * stepX - pos.z * stepZ;
    const screenY = centerY + pos.y * stepY + pos.z * stepZ;
    const cellDepth = Math.abs(pos.x) + Math.abs(pos.y) + Math.abs(pos.z);

    cellsToRender.push({
      cell,
      x: screenX - cellWidth / 2,
      y: screenY - cellHeight / 2,
      depth: cellDepth,
      position: pos
    });

    if (depth < 3) {
      // Explore along X dimension
      const xPos = cell.step(dimensionalMapping.x, 1);
      const xNeg = cell.step(dimensionalMapping.x, -1);
      if (xPos) exploreFromCell(xPos, { x: pos.x + 1, y: pos.y, z: pos.z }, depth + 1);
      if (xNeg) exploreFromCell(xNeg, { x: pos.x - 1, y: pos.y, z: pos.z }, depth + 1);

      // Explore along Y dimension
      const yPos = cell.step(dimensionalMapping.y, 1);
      const yNeg = cell.step(dimensionalMapping.y, -1);
      if (yPos) exploreFromCell(yPos, { x: pos.x, y: pos.y + 1, z: pos.z }, depth + 1);
      if (yNeg) exploreFromCell(yNeg, { x: pos.x, y: pos.y - 1, z: pos.z }, depth + 1);

      // Explore along Z dimension
      const zPos = cell.step(dimensionalMapping.z, 1);
      const zNeg = cell.step(dimensionalMapping.z, -1);
      if (zPos) exploreFromCell(zPos, { x: pos.x, y: pos.y, z: pos.z + 1 }, depth + 1);
      if (zNeg) exploreFromCell(zNeg, { x: pos.x, y: pos.y, z: pos.z - 1 }, depth + 1);
    }
  };

  exploreFromCell(currentCell, { x: 0, y: 0, z: 0 }, 0);

  // Generate connection lines
  const connections: Array<{
    x1: number; y1: number; x2: number; y2: number; color: string;
  }> = [];

  cellsToRender.forEach(({ cell, x, y }) => {
    // Check connections along each dimension
    const dimensions = [
      { name: dimensionalMapping.x, color: '#ff6666' },
      { name: dimensionalMapping.y, color: '#66ff66' },
      { name: dimensionalMapping.z, color: '#6666ff' }
    ];

    dimensions.forEach(({ name: dimension, color }) => {
      const connected = cell.step(dimension, 1);
      if (connected) {
        const connectedRender = cellsToRender.find(r => r.cell.id === connected.id);
        if (connectedRender) {
          connections.push({
            x1: x + cellWidth / 2,
            y1: y + cellHeight / 2,
            x2: connectedRender.x + cellWidth / 2,
            y2: connectedRender.y + cellHeight / 2,
            color
          });
        }
      }
    });
  });

  return (
    <ViewContainer>
      <AxisLabel position="top">X: {dimensionalMapping.x}</AxisLabel>
      <AxisLabel position="left">Y: {dimensionalMapping.y}</AxisLabel>
      <AxisLabel position="right">Z: {dimensionalMapping.z}</AxisLabel>
      
      {/* Render connections first (behind cells) */}
      {connections.map((conn, index) => (
        <ConnectionLine
          key={index}
          x1={conn.x1}
          y1={conn.y1}
          x2={conn.x2}
          y2={conn.y2}
          color={conn.color}
        />
      ))}
      
      {/* Render cells */}
      {cellsToRender.map(({ cell, x, y, depth }) => (
        <CellBox
          key={cell.id}
          isActive={cell.id === cursor.cellId}
          x={x}
          y={y}
          depth={depth}
          onClick={() => onCellClick(cell.id)}
          onDoubleClick={() => onCellDoubleClick(cell.id)}
        >
          {cell.text}
        </CellBox>
      ))}
    </ViewContainer>
  );
};

// RowCol View - 2D grid with X/Y mapping
export const DimensionalRowColView: React.FC<DimensionalViewProps> = ({
  space,
  cursor,
  dimensionalMapping,
  onCellClick,
  onCellDoubleClick
}) => {
  const currentCell = space.getCell(cursor.cellId);
  if (!currentCell) return <div>No cell found</div>;

  const gridSize = 7; // 7x7 grid centered on current cell
  const centerPos = Math.floor(gridSize / 2);
  const cellSize = 120;
  
  // Build grid
  const grid: Array<Array<ZZCell | null>> = Array(gridSize).fill(null).map(() => 
    Array(gridSize).fill(null)
  );

  const visited = new Set<string>();
  
  const exploreGrid = (
    cell: ZZCell,
    gridX: number,
    gridY: number,
    depth: number
  ) => {
    if (depth > 3 || gridX < 0 || gridX >= gridSize || gridY < 0 || gridY >= gridSize || visited.has(cell.id)) {
      return;
    }
    
    visited.add(cell.id);
    grid[gridY][gridX] = cell;
    
    if (depth < 3) {
      // Explore along X dimension (horizontal)
      const xPos = cell.step(dimensionalMapping.x, 1);
      const xNeg = cell.step(dimensionalMapping.x, -1);
      if (xPos) exploreGrid(xPos, gridX + 1, gridY, depth + 1);
      if (xNeg) exploreGrid(xNeg, gridX - 1, gridY, depth + 1);

      // Explore along Y dimension (vertical)
      const yPos = cell.step(dimensionalMapping.y, 1);
      const yNeg = cell.step(dimensionalMapping.y, -1);
      if (yPos) exploreGrid(yPos, gridX, gridY + 1, depth + 1);
      if (yNeg) exploreGrid(yNeg, gridX, gridY - 1, depth + 1);
    }
  };

  exploreGrid(currentCell, centerPos, centerPos, 0);

  return (
    <ViewContainer>
      <AxisLabel position="top">X: {dimensionalMapping.x}</AxisLabel>
      <AxisLabel position="left">Y: {dimensionalMapping.y}</AxisLabel>
      
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${gridSize}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${gridSize}, 40px)`,
          gap: '4px'
        }}
      >
        {grid.flat().map((cell, index) => {
          const gridX = index % gridSize;
          const gridY = Math.floor(index / gridSize);
          
          if (!cell) {
            return <div key={`empty-${gridX}-${gridY}`} />;
          }
          
          return (
            <CellBox
              key={cell.id}
              isActive={cell.id === cursor.cellId}
              onClick={() => onCellClick(cell.id)}
              onDoubleClick={() => onCellDoubleClick(cell.id)}
              style={{
                position: 'relative',
                margin: 0,
                width: '100%',
                height: '100%'
              }}
            >
              {cell.text}
            </CellBox>
          );
        })}
      </div>
    </ViewContainer>
  );
};
