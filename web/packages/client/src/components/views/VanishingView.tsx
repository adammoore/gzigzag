import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Line, Sphere, Box } from '@react-three/drei';
import { ZZSpace, ZZCell } from '@zigzag/core';
import { ZZCursor } from '../../App';
import styled from 'styled-components';
import * as THREE from 'three';

const ViewContainer = styled.div`
  width: 100%;
  height: 100%;
  background: var(--zz-bg-primary);
`;

interface VanishingViewProps {
  space: ZZSpace;
  cursor: ZZCursor;
  onCursorChange: (cursor: ZZCursor) => void;
}

interface CellPosition {
  cell: ZZCell;
  position: THREE.Vector3;
  dimension: string;
}

interface Connection {
  from: THREE.Vector3;
  to: THREE.Vector3;
  dimension: string;
}

// Calculate 3D positions for cells based on dimensional relationships
function calculateCellPositions(space: ZZSpace, focusDimension: string): Map<string, CellPosition> {
  const positions = new Map<string, CellPosition>();
  const cells = space.getCells();
  const dimensions = space.getDimensions();
  
  // Create dimension indices for consistent spacing
  const dimIndices = new Map<string, number>();
  dimensions.forEach((dim, index) => dimIndices.set(dim, index));
  
  // Position cells using a force-directed approach with dimensional constraints
  cells.forEach(cell => {
    let x = 0, y = 0, z = 0;
    
    // For each dimension the cell is connected in, calculate position component
    dimensions.forEach((dim, dimIndex) => {
      const head = cell.getHead(dim);
      const rank = head.readRank(dim, 1);
      const positionInRank = rank.findIndex(c => c.id === cell.id);
      
      if (positionInRank !== -1) {
        // Map dimensions to 3D axes with some rotation for better visibility
        const angle = (dimIndex * Math.PI * 2) / dimensions.length;
        const radius = 3;
        
        if (dim === focusDimension) {
          // Primary dimension gets the X axis
          x += positionInRank * 2;
        } else if (dimIndex === 1 || dim === 'd.2') {
          // Secondary dimension gets Y axis
          y += positionInRank * 2 * Math.sin(angle);
        } else {
          // Other dimensions contribute to Z and radial positioning
          x += positionInRank * radius * Math.cos(angle);
          z += positionInRank * radius * Math.sin(angle);
        }
      }
    });
    
    // Special handling for Krebs cycle - arrange in circle
    if (focusDimension === 'd.krebs') {
      const krebsHead = cell.getHead('d.krebs');
      const krebsRank = krebsHead.readRank('d.krebs', 1);
      const indexInKrebs = krebsRank.findIndex(c => c.id === cell.id);
      
      if (indexInKrebs !== -1 && krebsRank.length > 1) {
        const cycleAngle = (indexInKrebs / krebsRank.length) * Math.PI * 2;
        const cycleRadius = 5;
        x = cycleRadius * Math.cos(cycleAngle);
        z = cycleRadius * Math.sin(cycleAngle);
        y = 0; // Keep cycle flat for clarity
      }
    }
    
    // Offset carbon classification cells vertically
    if (cell.text.includes('Compounds') || cell.text === 'Carbon Categories') {
      y += 5;
    }
    
    positions.set(cell.id, {
      cell,
      position: new THREE.Vector3(x, y, z),
      dimension: focusDimension
    });
  });
  
  return positions;
}

// Generate connection lines between cells
function generateConnections(space: ZZSpace, positions: Map<string, CellPosition>): Connection[] {
  const connections: Connection[] = [];
  const dimensions = space.getDimensions();
  const processedPairs = new Set<string>();
  
  positions.forEach(({ cell }) => {
    dimensions.forEach(dim => {
      const neighbor = cell.step(dim, 1);
      if (neighbor) {
        // Create unique pair ID to avoid duplicate connections
        const pairId = [cell.id, neighbor.id].sort().join('-');
        if (!processedPairs.has(pairId)) {
          processedPairs.add(pairId);
          
          const fromPos = positions.get(cell.id)?.position;
          const toPos = positions.get(neighbor.id)?.position;
          
          if (fromPos && toPos) {
            connections.push({
              from: fromPos.clone(),
              to: toPos.clone(),
              dimension: dim
            });
          }
        }
      }
    });
  });
  
  return connections;
}

// Cell component in 3D space
function Cell3D({ 
  cellData, 
  isActive, 
  onClick 
}: { 
  cellData: CellPosition; 
  isActive: boolean; 
  onClick: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = React.useState(false);
  
  useFrame((state) => {
    if (meshRef.current) {
      // Gentle rotation for active cell
      if (isActive) {
        meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 2) * 0.1;
      }
      // Hover effect
      const scale = hovered ? 1.2 : (isActive ? 1.1 : 1);
      meshRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.1);
    }
  });
  
  // Determine cell color based on content
  const getColor = () => {
    if (isActive) return '#00ff00';
    if (hovered) return '#00cc00';
    if (cellData.cell.text.includes('Compounds') || cellData.cell.text === 'Carbon Categories') {
      return '#2196F3'; // Blue for categories
    }
    return '#4CAF50'; // Green for compounds
  };
  
  return (
    <group position={cellData.position}>
      <Box
        ref={meshRef}
        args={[1.5, 0.8, 0.3]}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshStandardMaterial 
          color={getColor()} 
          emissive={isActive ? '#00ff00' : '#000000'}
          emissiveIntensity={isActive ? 0.3 : 0}
        />
      </Box>
      <Text
        position={[0, 0, 0.2]}
        fontSize={0.2}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="black"
      >
        {cellData.cell.text}
      </Text>
      {isActive && (
        <Sphere args={[0.15]} position={[0, 0.6, 0]}>
          <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={0.5} />
        </Sphere>
      )}
    </group>
  );
}

// Connection line component
function ConnectionLine({ connection }: { connection: Connection }) {
  const points = [connection.from, connection.to];
  
  // Different colors for different dimensions
  const getColor = () => {
    switch (connection.dimension) {
      case 'd.krebs': return '#ff6b6b';
      case 'd.carbons': return '#4ecdc4';
      case 'd.carbon-count': return '#ffe66d';
      case 'd.carbon-instances': return '#a8e6cf';
      default: return '#666666';
    }
  };
  
  return (
    <Line
      points={points}
      color={getColor()}
      lineWidth={2}
      opacity={0.6}
      transparent
    />
  );
}

// Camera controller that follows cursor
function CameraController({ targetPosition }: { targetPosition: THREE.Vector3 }) {
  const { camera } = useThree();
  
  useFrame(() => {
    // Smooth camera follow with offset
    const idealPosition = new THREE.Vector3(
      targetPosition.x + 5,
      targetPosition.y + 3,
      targetPosition.z + 8
    );
    
    camera.position.lerp(idealPosition, 0.05);
    camera.lookAt(targetPosition);
  });
  
  return null;
}

// Main scene content
function SceneContent({ space, cursor, onCursorChange }: VanishingViewProps) {
  const positions = useMemo(() => 
    calculateCellPositions(space, cursor.dimension), 
    [space, cursor.dimension]
  );
  
  const connections = useMemo(() => 
    generateConnections(space, positions), 
    [space, positions]
  );
  
  const currentCellPosition = positions.get(cursor.cellId)?.position || new THREE.Vector3();
  
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={0.6} />
      <pointLight position={currentCellPosition} intensity={0.5} color="#00ff00" />
      
      {/* Camera controls */}
      <CameraController targetPosition={currentCellPosition} />
      <OrbitControls 
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={50}
        target={currentCellPosition}
      />
      
      {/* Grid helper for spatial reference */}
      <gridHelper args={[50, 50, '#333333', '#222222']} />
      
      {/* Render connections */}
      {connections.map((conn, idx) => (
        <ConnectionLine key={idx} connection={conn} />
      ))}
      
      {/* Render cells */}
      {Array.from(positions.values()).map(cellData => (
        <Cell3D
          key={cellData.cell.id}
          cellData={cellData}
          isActive={cellData.cell.id === cursor.cellId}
          onClick={() => onCursorChange({ ...cursor, cellId: cellData.cell.id })}
        />
      ))}
      
      {/* Dimension labels */}
      <Text
        position={[0, -3, 0]}
        fontSize={0.5}
        color="#666666"
        anchorX="center"
      >
        Dimension: {cursor.dimension}
      </Text>
    </>
  );
}

export const VanishingView: React.FC<VanishingViewProps> = (props) => {
  return (
    <ViewContainer>
      <Canvas
        camera={{ 
          position: [10, 5, 10], 
          fov: 60,
          near: 0.1,
          far: 1000
        }}
        gl={{ 
          antialias: true,
          alpha: false
        }}
      >
        <color attach="background" args={['#1a1a1a']} />
        <fog attach="fog" args={['#1a1a1a', 10, 50]} />
        <SceneContent {...props} />
      </Canvas>
    </ViewContainer>
  );
};
