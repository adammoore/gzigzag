import React, { useState } from 'react';
import { ZZSpace, ZZCell, createKrebsCycleDemo, createBlankSpace } from '@zigzag/core';
import { DualPaneWorkspace } from './components/DualPaneWorkspace';
import { Launcher } from './components/launcher';
import { ZigZagSpace } from './components/ZigZagSpace';
import { ViewControls } from './components/ViewControls';
import './App.css';

// Types
export type ViewType = 'rank' | 'vanishing' | 'rowcol';
export type ZZCursor = {
  cellId: string;
  dimension: string;
  viewType: ViewType;
};

export type AppMode = 'launcher' | 'singlePane' | 'dualPane';

function App() {
  const [mode, setMode] = useState<AppMode>('launcher');
  const [space, setSpace] = useState<ZZSpace | null>(null);
  
  // Dual pane cursors
  const [greenCursor, setGreenCursor] = useState<ZZCursor | null>(null);
  const [blueCursor, setBlueCursor] = useState<ZZCursor | null>(null);
  
  // Single pane cursor (for backward compatibility)
  const [singleCursor, setSingleCursor] = useState<ZZCursor | null>(null);

  const initializeCursors = (newSpace: ZZSpace) => {
    const homeCell = newSpace.getHomeCell();
    const initialCursor: ZZCursor = {
      cellId: homeCell.id,
      dimension: 'd.1',
      viewType: 'rank'
    };
    
    setGreenCursor({ ...initialCursor });
    setBlueCursor({ ...initialCursor });
    setSingleCursor({ ...initialCursor });
  };

  const handleLaunchDemo = () => {
    const demoSpace = createKrebsCycleDemo();
    setSpace(demoSpace);
    initializeCursors(demoSpace);
    setMode('dualPane');
  };

  const handleLaunchBlank = () => {
    const blankSpace = createBlankSpace();
    setSpace(blankSpace);
    initializeCursors(blankSpace);
    setMode('dualPane');
  };

  const handleFileLoad = (loadedSpace: ZZSpace) => {
    setSpace(loadedSpace);
    initializeCursors(loadedSpace);
    setMode('dualPane');
  };

  const handleBackToLauncher = () => {
    setMode('launcher');
    setSpace(null);
    setGreenCursor(null);
    setBlueCursor(null);
    setSingleCursor(null);
  };

  const handleSwitchToSinglePane = () => {
    setMode('singlePane');
  };

  const handleSwitchToDualPane = () => {
    setMode('dualPane');
  };

  // Launcher mode
  if (mode === 'launcher') {
    return (
      <Launcher
        onLaunchDemo={handleLaunchDemo}
        onLaunchBlank={handleLaunchBlank}
        onFileLoad={handleFileLoad}
      />
    );
  }

  // ZigZag interface modes
  if (!space || !greenCursor || !blueCursor || !singleCursor) {
    return <div>Loading...</div>;
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <button onClick={handleBackToLauncher} className="back-button">
            ← Back to Launcher
          </button>
          <div>
            <h1>ZigZag Web</h1>
            <p className="tagline">Ted Nelson's Hyperthogonal Structure</p>
          </div>
          <div className="mode-controls">
            <button 
              onClick={handleSwitchToSinglePane}
              className={mode === 'singlePane' ? 'active' : ''}
            >
              Single Pane
            </button>
            <button 
              onClick={handleSwitchToDualPane}
              className={mode === 'dualPane' ? 'active' : ''}
            >
              Dual Pane (Original)
            </button>
          </div>
        </div>
      </header>
      
      <main className="app-main">
        {mode === 'dualPane' ? (
          <DualPaneWorkspace
            space={space}
            greenCursor={greenCursor}
            blueCursor={blueCursor}
            onGreenCursorChange={setGreenCursor}
            onBlueCursorChange={setBlueCursor}
          />
        ) : (
          <>
            <ViewControls 
              space={space}
              cursor={singleCursor} 
              onCursorChange={setSingleCursor}
            />
            <ZigZagSpace 
              space={space} 
              cursor={singleCursor}
              onCursorChange={setSingleCursor}
            />
          </>
        )}
      </main>
      
      <footer className="app-footer">
        <p>
          Current: {space.getCell(
            mode === 'dualPane' ? blueCursor.cellId : singleCursor.cellId
          )?.text} | 
          Mode: {mode === 'dualPane' ? 'Dual Pane (Original GzigZag)' : 'Single Pane'} |
          Dimension: {mode === 'dualPane' ? blueCursor.dimension : singleCursor.dimension} | 
          View: {mode === 'dualPane' ? blueCursor.viewType : singleCursor.viewType}
        </p>
      </footer>
    </div>
  );
}

export default App;
