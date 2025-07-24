import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Text, RoundedBox, Line, OrbitControls } from '@react-three/drei';
import { ZZSpace, ZZCell } from '@zigzag/core';
import { ZZCursor } from '../../App';
import styled from 'styled-components';
import * as THREE from 'three';
import { useHotkeys } from 'react-hotkeys-hook';

const ViewContainer = styled.div`
  width: 100%;
  height: 100%;
  background: var(--zz-bg-primary);
  position: relative;
`;

const ControlsOverlay = styled.div`
  position: absolute;
  bottom: 20px;
  left: 20px;
  padding: 12px 16px;
  background: rgba(42, 42, 42, 0.9);
  border: 1px solid var(--zz-border);
  border-radius: 4px;
  font-size: 12px;
  color: var(--zz-text-secondary);
  pointer-events: none;
`;

const ViewControls = styled.div`
  position: absolute;
  top: 20px;
  right: 20px;
  display: flex;
  gap: 8px;
  z-index: 10;
`;

const CameraControls = styled.div`
  position: absolute;
  bottom: 20px;
  right: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 10;
`;

const ControlGroup = styled.div`
  display: flex;
  gap: 4px;
  align-items: center;
  background: rgba(42, 42, 42, 0.9);
  padding: 4px;
  border-radius: 4px;
  border: 1px solid var(--zz-border);
`;

const ViewButton = styled.button<{ active?: boolean }>`
  padding: 8px 12px;
  background: ${props => props.active ? 'var(--zz-accent-primary)' : 'var(--zz-bg-secondary)'};
  color: ${props => props.active ? 'black' : 'var(--zz-text-primary)'};
  border: 1px solid ${props => props.active ? 'var(--zz-accent-primary)' : 'var(--zz-border)'};
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: ${props => props.active ? 'var(--zz-accent-primary)' : 'var(--zz-bg-primary)'};
    border-color: var(--zz-accent-primary);
  }
`;

const ControlButton = styled.button<{ active?: boolean; size?: 'small' | 'normal' }>`
  padding: ${props => props.size === 'small' ? '4px' : '6px 10px'};
  background: ${props => props.active ? 'var(--zz-accent-primary)' : 'var(--zz-bg-secondary)'};
  color: ${props => props.active ? 'black' : 'var(--zz-text-primary)'};
  border: 1px solid ${props => props.active ? 'var(--zz-accent-primary)' : 'var(--zz-border)'};
  border-radius: 4px;
  font-size: ${props => props.size === 'small' ? '16px' : '12px'};
  cursor: pointer;
  transition: all 0.2s;
  min-width: ${props => props.size === 'small' ? '28px' : 'auto'};
  height: ${props => props.size === 'small' ? '28px' : 'auto'};
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background: ${props => props.active ? 'var(--zz-accent-primary)' : 'var(--zz-bg-primary)'};
    border-color: var(--zz-accent-primary);
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

const ZoomSlider = styled.input`
  width: 100px;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--zz-border);
  outline: none;
  opacity: 0.8;
  transition: opacity 0.2s;
  
  &:hover {
    opacity: 1;
  }
  
  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 12px;
    height: 12px;
    background: var(--zz-accent-primary);
    cursor: pointer;
    border-radius: 50%;
  }
  
  &::-moz-range-thumb {
    width: 12px;
    height: 12px;
    background: var(--zz-accent-primary);
    cursor: pointer;
    border-radius: 50%;
    border: none;
  }
`;

interface VanishingViewProps {
  space: ZZSpace;
  cursor: ZZCursor;
  onCursorChange: (cursor: ZZCursor) => void;
}

interface CellPosition {
  cell: ZZCell;
  position: THREE.Vector3;
  layer: number;
}

// Calculate 2.5D positions based on ZigZag structure
function calculatePositions(space: ZZSpace, cursor: ZZCursor): Map<string, CellPosition> {
  const positions = new Map<string, CellPosition>();
  const currentCell = space.getCell(cursor.cellId);
  if (!currentCell) return positions;
  
  const dimensions = space.getDimensions();
  const primaryDim = cursor.dimension;
  const secondaryDim = dimensions.find(d => d !== primaryDim) || dimensions[0];
  
  // Special handling for Krebs cycle - arrange in circle
  if (primaryDim === 'd.krebs') {
    const krebsHead = currentCell.getHead('d.krebs');
    const krebsRank = krebsHead.readRank('d.krebs', 1);
    
    krebsRank.forEach((cell, index) => {
      const angle = (index / krebsRank.length) * Math.PI * 2 - Math.PI / 2;
      const radius = 6;
      positions.set(cell.id, {
        cell,
        position: new THREE.Vector3(
          Math.cos(angle) * radius,
          Math.sin(angle) * radius,
          0
        ),
        layer: 0
      });
    });
  }
  
  // Add other cells in grid layout
  const cells = space.getCells();
  let gridIndex = 0;
  
  cells.forEach(cell => {
    if (!positions.has(cell.id)) {
      // Check if it's a category cell
      const isCategory = cell.text.includes('Categories') || cell.text.includes('Compounds');
      const layer = isCategory ? 1 : 2;
      
      // Position non-Krebs cells in a grid
      const col = gridIndex % 4;
      const row = Math.floor(gridIndex / 4);
      
      positions.set(cell.id, {
        cell,
        position: new THREE.Vector3(
          col * 3 - 4.5,
          isCategory ? 8 : -8 - row * 2,
          -layer * 0.5
        ),
        layer
      });
      gridIndex++;
    }
  });
  
  return positions;
}

// Generate connections between cells
function generateConnections(space: ZZSpace, positions: Map<string, CellPosition>): Array<{
  from: THREE.Vector3;
  to: THREE.Vector3;
  dimension: string;
}> {
  const connections: Array<{from: THREE.Vector3; to: THREE.Vector3; dimension: string}> = [];
  const processed = new Set<string>();
  
  positions.forEach(({ cell }) => {
    space.getDimensions().forEach(dim => {
      const neighbor = cell.step(dim, 1);
      if (neighbor) {
        const pairId = [cell.id, neighbor.id].sort().join('-');
        if (!processed.has(pairId)) {
          processed.add(pairId);
          const fromPos = positions.get(cell.id)?.position;
          const toPos = positions.get(neighbor.id)?.position;
          if (fromPos && toPos) {
            connections.push({ from: fromPos, to: toPos, dimension: dim });
          }
        }
      }
    });
  });
  
  return connections;
}

// 2.5D cell component
function Cell25D({ 
  cellData, 
  isActive, 
  onClick 
}: { 
  cellData: CellPosition; 
  isActive: boolean; 
  onClick: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  // Subtle float animation for active cell
  useFrame((state) => {
    if (meshRef.current && isActive) {
      meshRef.current.position.z = Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });
  
  const getColor = () => {
    if (isActive) return '#00ff00';
    if (hovered) return '#00cc00';
    if (cellData.cell.text.includes('Compounds') || cellData.cell.text === 'Carbon Categories') {
      return '#2196F3';
    }
    return '#4CAF50';
  };
  
  return (
    <group position={cellData.position}>
      <RoundedBox
        ref={meshRef}
        args={[2.5, 1, 0.3]}
        radius={0.1}
        smoothness={4}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshStandardMaterial 
          color={getColor()} 
          emissive={isActive ? '#00ff00' : '#000000'}
          emissiveIntensity={isActive ? 0.2 : 0}
        />
      </RoundedBox>
      
      {/* Shadow for depth */}
      <mesh position={[0, -0.6, -0.1]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.5, 0.5]} />
        <meshBasicMaterial color="black" transparent opacity={0.2} />
      </mesh>
      
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
        <mesh position={[0, 0.8, 0]}>
          <coneGeometry args={[0.15, 0.3, 4]} />
          <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={0.5} />
        </mesh>
      )}
    </group>
  );
}

// Connection line
function ConnectionLine({ from, to, dimension }: { 
  from: THREE.Vector3; 
  to: THREE.Vector3; 
  dimension: string;
}) {
  const getColor = () => {
    switch (dimension) {
      case 'd.krebs': return '#ff6b6b';
      case 'd.carbons': return '#4ecdc4';
      case 'd.carbon-count': return '#ffe66d';
      case 'd.carbon-instances': return '#a8e6cf';
      default: return '#666666';
    }
  };
  
  // Create curved path
  const curve = new THREE.CubicBezierCurve3(
    from,
    new THREE.Vector3(from.x, from.y, from.z - 0.5),
    new THREE.Vector3(to.x, to.y, to.z - 0.5),
    to
  );
  
  const points = curve.getPoints(20);
  
  return (
    <Line
      points={points}
      color={getColor()}
      lineWidth={2}
      opacity={0.4}
      transparent
    />
  );
}

// Camera controller with smooth transitions
function CameraController({ position, target, zoom, offset }: { 
  position: [number, number, number]; 
  target: THREE.Vector3;
  zoom: number;
  offset: { x: number; y: number };
}) {
  const { camera } = useThree();
  
  useFrame(() => {
    // Apply zoom by moving camera closer/further
    const zoomFactor = zoom / 20; // Convert zoom to distance multiplier
    const adjustedPosition = new THREE.Vector3(
      position[0] * zoomFactor + offset.x,
      position[1] * zoomFactor + offset.y,
      position[2] * zoomFactor
    );
    
    // Smooth camera movement
    camera.position.lerp(adjustedPosition, 0.1);
    camera.lookAt(target);
  });
  
  return null;
}

// Main scene
function Scene({ space, cursor, onCursorChange, cameraPosition, freelook, zoom, cameraOffset }: VanishingViewProps & {
  cameraPosition: [number, number, number];
  freelook: boolean;
  zoom: number;
  cameraOffset: { x: number; y: number };
}) {
  const positions = useMemo(() => 
    calculatePositions(space, cursor), 
    [space, cursor]
  );
  
  const connections = useMemo(() => 
    generateConnections(space, positions), 
    [space, positions]
  );
  
  const currentCellPos = positions.get(cursor.cellId)?.position || new THREE.Vector3();
  const groupRef = useRef<THREE.Group>(null);
  
  // Smooth centering on current cell
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.x = THREE.MathUtils.lerp(
        groupRef.current.position.x,
        -currentCellPos.x,
        0.05
      );
      groupRef.current.position.y = THREE.MathUtils.lerp(
        groupRef.current.position.y,
        -currentCellPos.y,
        0.05
      );
    }
  });
  
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={0.4} />
      <pointLight position={currentCellPos} intensity={0.3} color="#00ff00" />
      
      {!freelook && (
        <CameraController 
          position={cameraPosition} 
          target={new THREE.Vector3(0, 0, 0)}
          zoom={zoom}
          offset={cameraOffset}
        />
      )}
      
      {/* Orbit controls - enabled only in freelook mode */}
      <OrbitControls 
        enableRotate={freelook}
        enablePan={true}
        enableZoom={true}
        minDistance={5}
        maxDistance={50}
        target={new THREE.Vector3(0, 0, 0)}
        enabled={freelook}
      />
      
      {/* Background */}
      <mesh position={[0, 0, -5]}>
        <planeGeometry args={[50, 50]} />
        <meshBasicMaterial color="#0a0a0a" />
      </mesh>
      
      <gridHelper args={[30, 30, '#1a1a1a', '#151515']} position={[0, -10, 0]} />
      
      <group ref={groupRef}>
        {/* Render connections */}
        {connections.map((conn, idx) => (
          <ConnectionLine key={idx} {...conn} />
        ))}
        
        {/* Render cells */}
        {Array.from(positions.values()).map(cellData => (
          <Cell25D
            key={cellData.cell.id}
            cellData={cellData}
            isActive={cellData.cell.id === cursor.cellId}
            onClick={() => onCursorChange({ ...cursor, cellId: cellData.cell.id })}
          />
        ))}
      </group>
    </>
  );
}

export const VanishingView: React.FC<VanishingViewProps> = (props) => {
  const [viewIndex, setViewIndex] = useState(0);
  const [freelook, setFreelook] = useState(false);
  const [zoom, setZoom] = useState(20);
  const [cameraOffset, setCameraOffset] = useState({ x: 0, y: 0 });
  
  const views: Array<{ name: string; position: [number, number, number] }> = [
    { name: 'Isometric', position: [10, 10, 15] },
    { name: 'Top', position: [0, 20, 0.1] },
    { name: 'Front', position: [0, 0, 20] },
    { name: 'Side', position: [20, 0, 0] },
  ];
  
  const panSpeed = 2;
  
  // Keyboard navigation for views
  useHotkeys('1', () => { setViewIndex(0); setFreelook(false); });
  useHotkeys('2', () => { setViewIndex(1); setFreelook(false); });
  useHotkeys('3', () => { setViewIndex(2); setFreelook(false); });
  useHotkeys('4', () => { setViewIndex(3); setFreelook(false); });
  useHotkeys('q', () => { setViewIndex((prev) => (prev - 1 + views.length) % views.length); setFreelook(false); });
  useHotkeys('e', () => { setViewIndex((prev) => (prev + 1 + views.length) % views.length); setFreelook(false); });
  useHotkeys('f', () => setFreelook(prev => !prev));
  
  // Zoom controls
  useHotkeys('=', () => setZoom(prev => Math.min(prev + 2, 50)));
  useHotkeys('-', () => setZoom(prev => Math.max(prev - 2, 5)));
  
  // Pan controls
  useHotkeys('shift+up', () => setCameraOffset(prev => ({ ...prev, y: prev.y + panSpeed })));
  useHotkeys('shift+down', () => setCameraOffset(prev => ({ ...prev, y: prev.y - panSpeed })));
  useHotkeys('shift+left', () => setCameraOffset(prev => ({ ...prev, x: prev.x - panSpeed })));
  useHotkeys('shift+right', () => setCameraOffset(prev => ({ ...prev, x: prev.x + panSpeed })));
  
  // Reset view
  const resetView = () => {
    setZoom(20);
    setCameraOffset({ x: 0, y: 0 });
    setFreelook(false);
    setViewIndex(0);
  };
  
  useHotkeys('r', resetView);
  
  return (
    <ViewContainer>
      <Canvas
        camera={{ 
          position: views[viewIndex].position,
          fov: 50,
          near: 0.1,
          far: 1000
        }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#0a0a0a']} />
        <Scene 
          {...props} 
          cameraPosition={views[viewIndex].position}
          freelook={freelook}
          zoom={zoom}
          cameraOffset={cameraOffset}
        />
      </Canvas>
      
      <ViewControls>
        {views.map((view, index) => (
          <ViewButton
            key={view.name}
            active={viewIndex === index && !freelook}
            onClick={() => {
              setViewIndex(index);
              setFreelook(false);
            }}
          >
            {view.name}
          </ViewButton>
        ))}
        <ViewButton
          active={freelook}
          onClick={() => setFreelook(!freelook)}
          style={{ marginLeft: '8px', background: freelook ? '#ff6b6b' : undefined }}
        >
          {freelook ? '🔓 Free' : '🔒 Lock'}
        </ViewButton>
      </ViewControls>
      
      <CameraControls>
        {/* Zoom controls */}
        <ControlGroup>
          <ControlButton size="small" onClick={() => setZoom(prev => Math.min(prev + 5, 50))}>
            +
          </ControlButton>
          <ZoomSlider
            type="range"
            min="5"
            max="50"
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
          <ControlButton size="small" onClick={() => setZoom(prev => Math.max(prev - 5, 5))}>
            -
          </ControlButton>
        </ControlGroup>
        
        {/* Pan controls */}
        <ControlGroup>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2px' }}>
            <div></div>
            <ControlButton size="small" onClick={() => setCameraOffset(prev => ({ ...prev, y: prev.y + panSpeed }))}>
              ↑
            </ControlButton>
            <div></div>
            <ControlButton size="small" onClick={() => setCameraOffset(prev => ({ ...prev, x: prev.x - panSpeed }))}>
              ←
            </ControlButton>
            <ControlButton size="small" onClick={resetView}>
              ⟲
            </ControlButton>
            <ControlButton size="small" onClick={() => setCameraOffset(prev => ({ ...prev, x: prev.x + panSpeed }))}>
              →
            </ControlButton>
            <div></div>
            <ControlButton size="small" onClick={() => setCameraOffset(prev => ({ ...prev, y: prev.y - panSpeed }))}>
              ↓
            </ControlButton>
            <div></div>
          </div>
        </ControlGroup>
      </CameraControls>
      
      <ControlsOverlay>
        <div>Arrow keys: Navigate</div>
        <div>Tab: Switch dimension</div>
        <div>1-4: Quick views • Q/E: Cycle views • F: Freelook</div>
        <div>+/-: Zoom • Shift+arrows: Pan • R: Reset</div>
      </ControlsOverlay>
    </ViewContainer>
  );
};
