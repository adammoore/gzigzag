import { useState } from 'react';
import { ZZSpace, createKrebsCycleDemo, createBlankSpace, createAdamChemDemo } from '@zigzag/core';
import { DualPaneWorkspace } from './components/DualPaneWorkspace';
import { OriginalDualPaneWorkspace } from './components/OriginalDualPaneWorkspace';
import { Launcher } from './components/launcher';
import { ZigZagSpace } from './components/ZigZagSpace';
import { ViewControls } from './components/ViewControls';
import './App.css';

// Types
export type ViewType = 'vanishing' | 'stretchvanishing' | 'row' | 'column' | 'rank';
export type ZZCursor = {
  cellId: string;
  dimension: string;
  viewType: ViewType;
  xDimension?: string;
  yDimension?: string;
  zDimension?: string;
};

export type AppMode = 'launcher' | 'singlePane' | 'dualPane';
export type Theme = 'modern' | 'original';

function App() {
  const [mode, setMode] = useState<AppMode>('launcher');
  const [theme, setTheme] = useState<Theme>('original'); // Default to original theme
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
      viewType: 'vanishing'
    };
    
    setGreenCursor({ ...initialCursor });
    setBlueCursor({ ...initialCursor });
    setSingleCursor({ ...initialCursor });
  };

  const handleLaunchKrebsDemo = () => {
    const demoSpace = createKrebsCycleDemo();
    setSpace(demoSpace);
    initializeCursors(demoSpace);
    setMode('dualPane');
  };

  const handleLaunchAdamChemDemo = () => {
    const demoSpace = createAdamChemDemo();
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

  const toggleTheme = () => {
    setTheme(theme === 'modern' ? 'original' : 'modern');
  };

  // Launcher mode
  if (mode === 'launcher') {
    return (
      <Launcher
        onLaunchKrebsDemo={handleLaunchKrebsDemo}
        onLaunchAdamChemDemo={handleLaunchAdamChemDemo}
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
              Dual Pane
            </button>
            <button 
              onClick={toggleTheme}
              style={{
                background: theme === 'original' ? '#ffff99' : '#444',
                color: theme === 'original' ? '#000' : '#fff',
                border: theme === 'original' ? '2px outset #c0c0c0' : 'none'
              }}
            >
              {theme === 'original' ? 'Original GZZ' : 'Modern'}
            </button>
          </div>
        </div>
      </header>
      
      <main className="app-main">
        {mode === 'dualPane' ? (
          theme === 'original' ? (
            <OriginalDualPaneWorkspace
              space={space}
              greenCursor={greenCursor}
              blueCursor={blueCursor}
              onGreenCursorChange={setGreenCursor}
              onBlueCursorChange={setBlueCursor}
            />
          ) : (
            <DualPaneWorkspace
              space={space}
              greenCursor={greenCursor}
              blueCursor={blueCursor}
              onGreenCursorChange={setGreenCursor}
              onBlueCursorChange={setBlueCursor}
            />
          )
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
          Mode: {mode === 'dualPane' ? `Dual Pane (${theme === 'original' ? 'Original GZZ' : 'Modern'})` : 'Single Pane'} |
          Dimension: {mode === 'dualPane' ? blueCursor.dimension : singleCursor.dimension} | 
          View: {mode === 'dualPane' ? blueCursor.viewType : singleCursor.viewType}
        </p>
      </footer>
    </div>
  );
}

export default App;
