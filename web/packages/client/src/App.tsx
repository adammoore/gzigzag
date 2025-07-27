// packages/client/src/App.tsx
import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import { useZigZagNavigation } from './hooks/useZigZagNavigation';
import { 
  DimensionalRankView, 
  DimensionalVanishingView, 
  DimensionalRowColView 
} from './components/views/DimensionalViews';

// Import your working core (adjust path as needed)
// In real implementation: 
import { createKrebsCycleDemo, createBlankSpace } from '@zigzag/core';

// Mock implementations for demo - replace with your actual imports
// const createKrebsCycleDemo = () => {
//   console.log('Creating Krebs Cycle demo...');
//   return createMockSpace('demo');
// };

//const createBlankSpace = () => {
//  console.log('Creating blank space...');
//  return createMockSpace('blank');
//};

// Mock space with proper ZigZag structure
const createMockSpace = (type: 'demo' | 'blank') => {
  const cells = new Map();
  
  if (type === 'demo') {
    // Create Krebs cycle cells
    const compounds = [
      'Acetyl-CoA', 'Citrate', 'Isocitrate', 'α-Ketoglutarate', 
      'Succinyl-CoA', 'Succinate', 'Fumarate', 'Malate', 'Oxaloacetate'
    ];
    
    // Create carbon category cells
    const categories = ['C2 Compounds', 'C4 Compounds', 'C6 Compounds'];
    
    compounds.forEach((name, index) => {
      cells.set(`compound-${index}`, createMockCell(`compound-${index}`, name));
    });
    
    categories.forEach((name, index) => {
      cells.set(`category-${index}`, createMockCell(`category-${index}`, name));
    });
    
    cells.set('home', createMockCell('home', 'Biochemical Pathways'));
  } else {
    cells.set('home', createMockCell('home', 'HOME'));
    cells.set('cell1', createMockCell('cell1', 'Cell 1'));
    cells.set('cell2', createMockCell('cell2', 'Cell 2'));
  }

  return {
    getHomeCell: () => cells.get('home'),
    getCell: (id: string) => cells.get(id) || null,
    getDimensions: () => ['d.1', 'd.2', 'd.3', 'd.krebs', 'd.carbons', 'd.carbon-count'],
    getCells: () => Array.from(cells.values()),
  };
};

const createMockCell = (id: string, text: string) => ({
  id,
  text,
  step: (dimension: string, direction: 1 | -1) => {
    // Mock navigation for demo
    const mockConnections: Record<string, Record<string, string>> = {
      'home': {
        'd.biochem': 'compound-0',
        'd.carbons': 'category-0'
      },
      'compound-0': { // Acetyl-CoA
        'd.krebs': direction > 0 ? 'compound-1' : 'compound-8',
        'd.carbon-count': 'category-0' // C2
      },
      'compound-1': { // Citrate
        'd.krebs': direction > 0 ? 'compound-2' : 'compound-0',
        'd.carbon-count': 'category-2' // C6
      },
      'compound-2': { // Isocitrate
        'd.krebs': direction > 0 ? 'compound-3' : 'compound-1',
        'd.carbon-count': 'category-2' // C6
      },
      'compound-3': { // α-Ketoglutarate
        'd.krebs': direction > 0 ? 'compound-4' : 'compound-2'
      },
      'compound-4': { // Succinyl-CoA
        'd.krebs': direction > 0 ? 'compound-5' : 'compound-3'
      },
      'compound-5': { // Succinate
        'd.krebs': direction > 0 ? 'compound-6' : 'compound-4',
        'd.carbon-count': 'category-1' // C4
      },
      'compound-6': { // Fumarate
        'd.krebs': direction > 0 ? 'compound-7' : 'compound-5',
        'd.carbon-count': 'category-1' // C4
      },
      'compound-7': { // Malate
        'd.krebs': direction > 0 ? 'compound-8' : 'compound-6',
        'd.carbon-count': 'category-1' // C4
      },
      'compound-8': { // Oxaloacetate
        'd.krebs': direction > 0 ? 'compound-0' : 'compound-7',
        'd.carbon-count': 'category-1' // C4
      },
      'category-0': { // C2 Compounds
        'd.carbons': direction > 0 ? 'category-1' : 'category-2'
      },
      'category-1': { // C4 Compounds
        'd.carbons': direction > 0 ? 'category-2' : 'category-0'
      },
      'category-2': { // C6 Compounds
        'd.carbons': direction > 0 ? 'category-0' : 'category-1'
      }
    };

    const cellConnections = mockConnections[id];
    if (cellConnections && cellConnections[dimension]) {
      const targetId = cellConnections[dimension];
      const targetCell = createMockCell(targetId, getTextForId(targetId));
      return targetCell;
    }
    return null;
  }
});

const getTextForId = (id: string): string => {
  const textMap: Record<string, string> = {
    'home': 'Biochemical Pathways',
    'compound-0': 'Acetyl-CoA',
    'compound-1': 'Citrate', 
    'compound-2': 'Isocitrate',
    'compound-3': 'α-Ketoglutarate',
    'compound-4': 'Succinyl-CoA',
    'compound-5': 'Succinate',
    'compound-6': 'Fumarate',
    'compound-7': 'Malate',
    'compound-8': 'Oxaloacetate',
    'category-0': 'C2 Compounds',
    'category-1': 'C4 Compounds',
    'category-2': 'C6 Compounds'
  };
  return textMap[id] || `Cell ${id}`;
};

// Types
interface LaunchOption {
  id: 'demo' | 'blank' | 'load';
  title: string;
  description: string;
  icon: string;
}

type ViewType = 'rank' | 'vanishing' | 'rowcol';
type ZZCursor = {
  cellId: string;
  dimension: string;
  viewType: ViewType;
};

type DimensionalMapping = {
  x: string;
  y: string;
  z: string;
};

// Styled Components
const LauncherContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
`;

const LauncherBox = styled.div`
  background: #2a2a2a;
  border-radius: 12px;
  padding: 40px;
  width: 90%;
  max-width: 600px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
`;

const AppContainer = styled.div`
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #1a1a1a;
  color: white;
  font-family: 'Courier New', monospace;
`;

const AppHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px 20px;
  background: #2a2a2a;
  border-bottom: 1px solid #444;
`;

const AppMain = styled.main`
  flex: 1;
  position: relative;
  overflow: hidden;
`;

const ControlPanel = styled.div`
  display: flex;
  gap: 15px;
  align-items: center;
`;

const Button = styled.button<{ active?: boolean }>`
  padding: 8px 12px;
  background: ${props => props.active ? '#00ff00' : '#444'};
  color: ${props => props.active ? '#000' : '#fff'};
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  transition: all 0.2s;

  &:hover {
    background: ${props => props.active ? '#00dd00' : '#555'};
  }
`;

const InfoPanel = styled.div`
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.8);
  padding: 10px;
  border-radius: 6px;
  font-size: 11px;
  max-width: 300px;
  z-index: 100;
`;

const AppFooter = styled.footer`
  padding: 8px 20px;
  background: #2a2a2a;
  border-top: 1px solid #444;
  font-size: 12px;
  display: flex;
  justify-content: space-between;
`;

// Launcher Component
const Launcher: React.FC<{ onLaunch: (mode: 'demo' | 'blank') => void }> = ({ onLaunch }) => {
  const [selectedOption, setSelectedOption] = useState<LaunchOption['id'] | null>(null);

  const options: LaunchOption[] = [
    {
      id: 'demo',
      title: 'Krebs Cycle Demo',
      description: 'Start with the biochemistry demonstration showing the Krebs cycle with multi-dimensional connections',
      icon: '🧬'
    },
    {
      id: 'blank',
      title: 'Blank ZigZag Space',
      description: 'Start with an empty space containing only the home cell and standard dimensions',
      icon: '📄'
    },
    {
      id: 'load',
      title: 'Load Z Directory',
      description: 'Load an original GzigZag file (Phase 3 feature - coming soon)',
      icon: '📁'
    }
  ];

  return (
    <LauncherContainer>
      <LauncherBox>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '36px', fontWeight: '300', color: '#00ff00', margin: '0 0 10px 0' }}>
            GZigZag Web
          </h1>
          <p style={{ fontSize: '16px', color: '#999', margin: 0 }}>
            Ted Nelson's ZigZag Structure - Modern Web Implementation
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '30px' }}>
          {options.map(option => (
            <div
              key={option.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '20px',
                background: option.id === 'load' ? '#222' : selectedOption === option.id ? '#3a3a3a' : '#333',
                borderRadius: '8px',
                cursor: option.id === 'load' ? 'not-allowed' : 'pointer',
                border: `2px solid ${selectedOption === option.id ? '#00ff00' : 'transparent'}`,
                opacity: option.id === 'load' ? 0.5 : 1
              }}
              onClick={() => option.id !== 'load' && setSelectedOption(option.id)}
            >
              <div style={{ fontSize: '32px', marginRight: '20px' }}>{option.icon}</div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 5px 0', color: '#fff' }}>{option.title}</h3>
                <p style={{ margin: 0, fontSize: '14px', color: '#aaa' }}>{option.description}</p>
              </div>
              {selectedOption === option.id && option.id !== 'load' && (
                <div style={{ color: '#00ff00', fontSize: '24px' }}>✓</div>
              )}
            </div>
          ))}
        </div>

        {selectedOption && selectedOption !== 'load' && (
          <button
            style={{
              width: '100%',
              padding: '15px',
              fontSize: '18px',
              fontWeight: '500',
              color: '#000',
              background: '#00ff00',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
            onClick={() => onLaunch(selectedOption)}
          >
            Launch ZigZag
          </button>
        )}
      </LauncherBox>
    </LauncherContainer>
  );
};

// Main ZigZag Interface
const ZigZagInterface: React.FC<{ mode: 'demo' | 'blank'; onBack: () => void }> = ({ mode, onBack }) => {
  const [space] = useState(() => 
    mode === 'demo' ? createKrebsCycleDemo() : createBlankSpace()
  );
  
  const [cursor, setCursor] = useState<ZZCursor>({
    cellId: space.getHomeCell().id,
    dimension: mode === 'demo' ? 'd.krebs' : 'd.1',
    viewType: 'rank'
  });

  const [dimensionalMapping, setDimensionalMapping] = useState<DimensionalMapping>({
    x: mode === 'demo' ? 'd.krebs' : 'd.1',
    y: mode === 'demo' ? 'd.carbons' : 'd.2',
    z: mode === 'demo' ? 'd.carbon-count' : 'd.3'
  });

  const [showDebug, setShowDebug] = useState(true);

  // Initialize navigation hook
  const { getNavigationInfo } = useZigZagNavigation({
    space,
    cursor,
    setCursor,
    dimensionalMapping,
    setDimensionalMapping
  });

  const handleCellClick = useCallback((cellId: string) => {
    setCursor(prev => ({ ...prev, cellId }));
  }, []);

  const handleCellDoubleClick = useCallback((cellId: string) => {
    // TODO: Implement cell editing
    console.log('Double-clicked cell:', cellId);
  }, []);

  const handleViewChange = useCallback((viewType: ViewType) => {
    setCursor(prev => ({ ...prev, viewType }));
  }, []);

  const renderView = () => {
    const props = {
      space,
      cursor,
      dimensionalMapping,
      onCellClick: handleCellClick,
      onCellDoubleClick: handleCellDoubleClick
    };

    switch (cursor.viewType) {
      case 'rank':
        return <DimensionalRankView {...props} />;
      case 'vanishing':
        return <DimensionalVanishingView {...props} />;
      case 'rowcol':
        return <DimensionalRowColView {...props} />;
      default:
        return <DimensionalRankView {...props} />;
    }
  };

  const debugInfo = getNavigationInfo();

  return (
    <AppContainer>
      <AppHeader>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button
            style={{
              padding: '8px 16px',
              background: '#444',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
            onClick={onBack}
          >
            ← Back
          </button>
          <h1 style={{ color: '#00ff00', margin: 0, fontSize: '20px' }}>
            ZigZag Web - {mode === 'demo' ? 'Krebs Cycle Demo' : 'Blank Space'}
          </h1>
        </div>

        <ControlPanel>
          <Button
            active={cursor.viewType === 'rank'}
            onClick={() => handleViewChange('rank')}
          >
            F1: Rank
          </Button>
          <Button
            active={cursor.viewType === 'vanishing'}
            onClick={() => handleViewChange('vanishing')}
          >
            F2: Vanishing
          </Button>
          <Button
            active={cursor.viewType === 'rowcol'}
            onClick={() => handleViewChange('rowcol')}
          >
            F3: RowCol
          </Button>
          <Button onClick={() => setShowDebug(!showDebug)}>
            Debug: {showDebug ? 'ON' : 'OFF'}
          </Button>
        </ControlPanel>
      </AppHeader>

      <AppMain>
        {renderView()}
        
        {showDebug && (
          <InfoPanel>
            <div><strong>Current Cell:</strong> {debugInfo.currentCell}</div>
            <div><strong>Active Dimension:</strong> {debugInfo.currentDimension}</div>
            <div><strong>View Type:</strong> {debugInfo.viewType}</div>
            <div><strong>Dimensional Mapping:</strong></div>
            <div style={{ marginLeft: '10px', fontSize: '10px' }}>
              X: {debugInfo.dimensionalMapping.x}<br/>
              Y: {debugInfo.dimensionalMapping.y}<br/>
              Z: {debugInfo.dimensionalMapping.z}
            </div>
            <div style={{ marginTop: '10px', fontSize: '10px' }}>
              <strong>Keyboard:</strong> Arrows/WASD=Navigate, Tab=Cycle Dims, F1-F3=Views, X/Y/Z=Rotate Axes
            </div>
            <div style={{ marginTop: '5px', fontSize: '10px' }}>
              <strong>Connections from current cell:</strong>
              {debugInfo.connections.slice(0, 3).map(conn => (
                <div key={conn.dimension} style={{ marginLeft: '5px' }}>
                  {conn.dimension}: {conn.negative} ← → {conn.positive}
                </div>
              ))}
            </div>
          </InfoPanel>
        )}
      </AppMain>

      <AppFooter>
        <div>
          Cell: {debugInfo.currentCell} | Dim: {debugInfo.currentDimension} | View: {debugInfo.viewType}
        </div>
        <div>
          X:{debugInfo.dimensionalMapping.x} Y:{debugInfo.dimensionalMapping.y} Z:{debugInfo.dimensionalMapping.z}
        </div>
      </AppFooter>
    </AppContainer>
  );
};

// Main App Component
export default function App() {
  const [launched, setLaunched] = useState(false);
  const [mode, setMode] = useState<'demo' | 'blank'>('demo');

  const handleLaunch = (selectedMode: 'demo' | 'blank') => {
    setMode(selectedMode);
    setLaunched(true);
  };

  const handleBack = () => {
    setLaunched(false);
  };

  if (!launched) {
    return <Launcher onLaunch={handleLaunch} />;
  }

  return <ZigZagInterface mode={mode} onBack={handleBack} />;
}
