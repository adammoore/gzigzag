import React, { useState } from 'react';
import { ZZSpace } from '@zigzag/core';
import { ZZCursor } from '../App';
import { useDualPaneNavigation } from '../hooks/useKeyboardNavigation';
import { useSpaceSystem } from '../hooks/useSpaceSystem';
import { OriginalVanishingView } from './views/OriginalVanishingView';
import { OriginalRankView } from './views/OriginalRankView';
import { OriginalRowColView } from './views/OriginalRowColView';
import '../themes/originalGzigZag.css';

interface OriginalDualPaneWorkspaceProps {
  space: ZZSpace;
  greenCursor: ZZCursor;
  blueCursor: ZZCursor;
  onGreenCursorChange: (cursor: ZZCursor) => void;
  onBlueCursorChange: (cursor: ZZCursor) => void;
}

export const OriginalDualPaneWorkspace: React.FC<OriginalDualPaneWorkspaceProps> = ({
  space,
  greenCursor,
  blueCursor,
  onGreenCursorChange,
  onBlueCursorChange
}) => {
  const [activeCursor, setActiveCursor] = useState<'green' | 'blue'>('blue');
  const [showKeyHints, setShowKeyHints] = useState(true);

  // Read system configuration from the space structure
  const systemConfig = useSpaceSystem(space);

  // Initialize dual pane keyboard navigation
  useDualPaneNavigation({
    space,
    greenCursor,
    blueCursor,
    onGreenCursorChange,
    onBlueCursorChange,
    activeCursor
  });

  // Get current cells for display
  const greenCell = space.getCell(greenCursor.cellId);
  const blueCell = space.getCell(blueCursor.cellId);
  
  // Get available dimensions (for future use)
  // const dimensions = space.getDimensions();

  const handlePaneClick = (paneType: 'green' | 'blue') => {
    setActiveCursor(paneType);
  };

  const toggleKeyHints = () => {
    setShowKeyHints(!showKeyHints);
  };

  const renderView = (cursor: ZZCursor, paneType: 'green' | 'blue') => {
    const onCursorChange = paneType === 'green' ? onGreenCursorChange : onBlueCursorChange;
    
    // Check if the view is available in the system configuration
    if (!systemConfig.availableViews.includes(cursor.viewType)) {
      return (
        <div className="original-view-error">
          <div>View "{cursor.viewType}" not available</div>
          <div>Available views: {systemConfig.availableViews.join(', ')}</div>
        </div>
      );
    }
    
    switch (cursor.viewType) {
      case 'rank':
        return (
          <OriginalRankView
            space={space}
            cursor={cursor}
            onCursorChange={onCursorChange}
            cursorType={paneType}
          />
        );
      case 'vanishing':
        return (
          <OriginalVanishingView
            space={space}
            cursor={cursor}
            onCursorChange={onCursorChange}
            cursorType={paneType}
          />
        );
      case 'rowcol':
        return (
          <OriginalRowColView
            space={space}
            cursor={cursor}
            onCursorChange={onCursorChange}
            cursorType={paneType}
          />
        );
      default:
        return (
          <div className="original-view-error">
            <div>Unknown view type: {cursor.viewType}</div>
            <div>Available views: {systemConfig.availableViews.join(', ')}</div>
          </div>
        );
    }
  };

  return (
    <div className="original-theme original-workspace">
      {/* Green Cursor Pane (Control Pane) */}
      <div 
        className={`original-pane control ${activeCursor === 'green' ? 'active' : ''}`}
        onClick={() => handlePaneClick('green')}
      >
        <div className="original-pane-header control">
          <div className="original-pane-title">Ctrl</div>
          <div className="original-status">
            <div className="dimension-indicator" title={`Available dimensions: ${systemConfig.availableDimensions.join(', ')}`}>
              {greenCursor.dimension}
            </div>
            <div className="view-indicator" title={`Available views: ${systemConfig.availableViews.join(', ')}`}>
              {greenCursor.viewType.toUpperCase()}
            </div>
          </div>
        </div>

        <div className="original-pane-content">
          {renderView(greenCursor, 'green')}
        </div>

        <div className="original-status-bar">
          <div className="status-section">
            <span style={{ fontSize: '9px', marginRight: '8px' }}>
              Keys: esfc•dD•V (see ? for help)
            </span>
          </div>
          <div className="status-section">
            <span style={{ fontSize: '9px' }}>
              Cell: {greenCell?.text || '(none)'}
            </span>
          </div>
        </div>
      </div>

      {/* Splitter */}
      <div className="original-splitter"></div>

      {/* Blue Cursor Pane (Data Pane) */}
      <div 
        className={`original-pane data ${activeCursor === 'blue' ? 'active' : ''}`}
        onClick={() => handlePaneClick('blue')}
      >
        <div className="original-pane-header data">
          <div className="original-pane-title">Data</div>
          <div className="original-status">
            <div className="dimension-indicator" title={`Available dimensions: ${systemConfig.availableDimensions.join(', ')}`}>
              {blueCursor.dimension}
            </div>
            <div className="view-indicator" title={`Available views: ${systemConfig.availableViews.join(', ')}`}>
              {blueCursor.viewType.toUpperCase()}
            </div>
            <div className="window-controls">
              <div 
                className="window-control"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleKeyHints();
                }}
                title="Show/hide keyboard shortcuts"
              >
                ?
              </div>
            </div>
          </div>
        </div>

        <div className="original-pane-content">
          {renderView(blueCursor, 'blue')}
        </div>

        <div className="original-status-bar">
          <div className="status-section">
            <span style={{ fontSize: '9px', marginRight: '8px' }}>
              Keys: ijl,•kK•v (see ? for help)
            </span>
          </div>
          <div className="status-section">
            <span style={{ fontSize: '9px' }}>
              Cell: {blueCell?.text || '(none)'}
            </span>
          </div>
        </div>
      </div>

      {/* Keyboard Hints Overlay */}
      {showKeyHints && (
        <div className="original-keyhint">
          <div className="keyhint-section">
            <div className="keyhint-title keyhint-green">GREEN CURSOR (Control Pane):</div>
            <div>e/c = up/down dimension</div>
            <div>s/f = left/right dimension</div>
            <div>D/d = Z-axis dimension</div>
            <div>V = change view</div>
            <div>X = rotate X dimension</div>
          </div>
          
          <div className="keyhint-section">
            <div className="keyhint-title keyhint-blue">BLUE CURSOR (Data Pane):</div>
            <div>i/, = up/down dimension</div>
            <div>j/l = left/right dimension</div>
            <div>K/k = Z-axis dimension</div>
            <div>v = change view</div>
            <div>x = rotate X dimension</div>
          </div>
          
          <div className="keyhint-section">
            <div className="keyhint-title">CURSOR COORDINATION:</div>
            <div>~ = swap cursors</div>
            <div>&lt; = green→blue position</div>
            <div>&gt; = blue→green position</div>
            <div>ESC = both cursors to home</div>
          </div>
          
          <div className="keyhint-section">
            <div className="keyhint-title">CELL OPERATIONS:</div>
            <div>n + direction = create new cell</div>
            <div>m = mark/unmark cell</div>
            <div>b + direction = break connection</div>
            <div>h + direction = hop cell</div>
            <div>Delete = delete cell</div>
          </div>
          
          <div className="keyhint-section">
            <div className="keyhint-title">CELL CONNECTIONS:</div>
            <div>- + direction = connect to marked</div>
            <div>t + direction = clone cell</div>
            <div>T + direction = deep clone</div>
            <div>/ + direction = coordinate cursors</div>
          </div>
          
          <div className="keyhint-section">
            <div className="keyhint-title">EDITING:</div>
            <div>Double-click = edit text</div>
            <div>F1/F2/F3 = {systemConfig.availableViews.join('/')}</div>
            <div>Tab = cycle dimensions ({systemConfig.availableDimensions.length})</div>
            <div>0-9, g = goto cell by ID</div>
          </div>
          
          <div className="keyhint-section">
            <div className="keyhint-title">SAVE/LOAD:</div>
            <div>S = save space as ZIP</div>
            <div>z = load Z directory/ZIP</div>
          </div>
          
          <div style={{ fontSize: '8px', marginTop: '8px', textAlign: 'center' }}>
            Click ? again to hide • Click pane to activate cursor
          </div>
        </div>
      )}
    </div>
  );
};