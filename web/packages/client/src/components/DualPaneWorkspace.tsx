import React, { useState } from 'react';
import styled from 'styled-components';
import { ZZSpace } from '@zigzag/core';
import { ZZCursor } from '../App';
import { ZigZagSpace } from './ZigZagSpace';
import { ViewControls } from './ViewControls';
import { useDualPaneNavigation } from '../hooks/useKeyboardNavigation';

// Styled Components
const WorkspaceContainer = styled.div`
  display: flex;
  height: 100%;
  width: 100%;
  background: #1a1a1a;
`;

const Pane = styled.div<{ paneType: 'green' | 'blue'; isActive: boolean }>`
  flex: 1;
  display: flex;
  flex-direction: column;
  border: 3px solid ${props => props.paneType === 'green' ? '#00ff00' : '#0088ff'};
  margin: 5px;
  border-radius: 8px;
  overflow: hidden;
  background: ${props => props.paneType === 'green' ? '#1a2a1a' : '#1a1a2a'};
  opacity: ${props => props.isActive ? 1 : 0.8};
  transition: all 0.3s ease;
  
  &:hover {
    opacity: 1;
  }
`;

const PaneHeader = styled.header<{ paneType: 'green' | 'blue' }>`
  background: ${props => props.paneType === 'green' ? '#004400' : '#000044'};
  color: white;
  padding: 8px 16px;
  font-weight: bold;
  font-size: 14px;
  border-bottom: 1px solid ${props => props.paneType === 'green' ? '#00ff00' : '#0088ff'};
  display: flex;
  justify-content: between;
  align-items: center;
`;

const PaneTitle = styled.div<{ paneType: 'green' | 'blue' }>`
  color: ${props => props.paneType === 'green' ? '#00ff00' : '#0088ff'};
  flex: 1;
`;

const PaneContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const Splitter = styled.div`
  width: 6px;
  background: #333;
  cursor: col-resize;
  position: relative;
  
  &:hover {
    background: #555;
  }
  
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 2px;
    height: 40px;
    background: #666;
    border-radius: 1px;
  }
`;

const KeyHintOverlay = styled.div<{ show: boolean }>`
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 15px;
  border-radius: 8px;
  font-family: monospace;
  font-size: 12px;
  line-height: 1.4;
  opacity: ${props => props.show ? 0.9 : 0};
  pointer-events: none;
  transition: opacity 0.3s ease;
  z-index: 1000;
  border: 1px solid #444;
`;

interface DualPaneWorkspaceProps {
  space: ZZSpace;
  greenCursor: ZZCursor;
  blueCursor: ZZCursor;
  onGreenCursorChange: (cursor: ZZCursor) => void;
  onBlueCursorChange: (cursor: ZZCursor) => void;
}

export const DualPaneWorkspace: React.FC<DualPaneWorkspaceProps> = ({
  space,
  greenCursor,
  blueCursor,
  onGreenCursorChange,
  onBlueCursorChange
}) => {
  const [activeCursor, setActiveCursor] = useState<'green' | 'blue'>('blue');
  const [showKeyHints, setShowKeyHints] = useState(false);

  // Initialize dual pane keyboard navigation
  useDualPaneNavigation({
    space,
    greenCursor,
    blueCursor,
    onGreenCursorChange,
    onBlueCursorChange,
    activeCursor
  });

  const handlePaneClick = (paneType: 'green' | 'blue') => {
    setActiveCursor(paneType);
  };

  const toggleKeyHints = () => {
    setShowKeyHints(!showKeyHints);
  };

  return (
    <WorkspaceContainer>
      {/* Green Cursor Pane (Left) - Command Execution */}
      <Pane 
        paneType="green" 
        isActive={activeCursor === 'green'}
        onClick={() => handlePaneClick('green')}
      >
        <PaneHeader paneType="green">
          <PaneTitle paneType="green">
            🟢 Command Pane (Green Cursor)
          </PaneTitle>
          <div style={{ fontSize: '11px', opacity: 0.8 }}>
            esfc • dD
          </div>
        </PaneHeader>
        <PaneContent>
          <ViewControls 
            space={space}
            cursor={greenCursor}
            onCursorChange={onGreenCursorChange}
          />
          <ZigZagSpace 
            space={space}
            cursor={greenCursor}
            onCursorChange={onGreenCursorChange}
          />
        </PaneContent>
      </Pane>

      {/* Resizable Splitter */}
      <Splitter />

      {/* Blue Cursor Pane (Right) - Data Manipulation */}
      <Pane 
        paneType="blue" 
        isActive={activeCursor === 'blue'}
        onClick={() => handlePaneClick('blue')}
      >
        <PaneHeader paneType="blue">
          <PaneTitle paneType="blue">
            🔵 Data Pane (Blue Cursor)
          </PaneTitle>
          <div style={{ fontSize: '11px', opacity: 0.8 }}>
            ijl, • kK
          </div>
          <button 
            onClick={toggleKeyHints}
            style={{
              background: 'transparent',
              border: '1px solid #0088ff',
              color: '#0088ff',
              padding: '2px 6px',
              fontSize: '10px',
              marginLeft: '10px',
              cursor: 'pointer',
              borderRadius: '3px'
            }}
          >
            ?
          </button>
        </PaneHeader>
        <PaneContent>
          <ViewControls 
            space={space}
            cursor={blueCursor}
            onCursorChange={onBlueCursorChange}
          />
          <ZigZagSpace 
            space={space}
            cursor={blueCursor}
            onCursorChange={onBlueCursorChange}
          />
        </PaneContent>
      </Pane>

      {/* Keyboard Hints Overlay */}
      <KeyHintOverlay show={showKeyHints}>
        <div style={{ marginBottom: '10px', color: '#00ff00' }}>
          <strong>🟢 Green Cursor (Command Pane):</strong>
        </div>
        <div>e/c = up/down • s/f = left/right • D/d = Z-axis</div>
        <div>V = change view • X/Y/Z = rotate dimensions</div>
        
        <div style={{ marginTop: '15px', marginBottom: '10px', color: '#0088ff' }}>
          <strong>🔵 Blue Cursor (Data Pane):</strong>
        </div>
        <div>i/, = up/down • j/l = left/right • K/k = Z-axis</div>
        <div>v = change view • x/y/z = rotate dimensions</div>
        
        <div style={{ marginTop: '15px', marginBottom: '10px', color: '#ffff00' }}>
          <strong>⚡ Cursor Coordination:</strong>
        </div>
        <div>~ = swap cursors • &lt; = green→blue • &gt; = blue→green</div>
        <div>ESC = both cursors home</div>
        
        <div style={{ marginTop: '15px', fontSize: '10px', opacity: 0.7 }}>
          Press ? again to hide • Click pane to activate cursor
        </div>
      </KeyHintOverlay>
    </WorkspaceContainer>
  );
};
