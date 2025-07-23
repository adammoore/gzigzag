import React, { useState } from 'react';
import { ZZSpace, createKrebsCycleDemo } from '@zigzag/core';
import { ZigZagSpace } from './components/ZigZagSpace';
import { ViewControls } from './components/ViewControls';
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation';
import './App.css';

export type ViewType = 'rank' | 'vanishing' | 'rowcol';

export interface ZZCursor {
  cellId: string;
  dimension: string;
  viewType: ViewType;
}

function App() {
  // Initialize with your working Krebs cycle demo
  const [space] = useState<ZZSpace>(() => createKrebsCycleDemo());
  const [cursor, setCursor] = useState<ZZCursor>({
    cellId: space.getHomeCell().id,
    dimension: 'd.krebs', // Start with the biochemistry dimension
    viewType: 'rank'
  });

  // Set up keyboard navigation
  useKeyboardNavigation(space, cursor, setCursor);

  const currentCell = space.getCell(cursor.cellId);

  return (
    <div className="zigzag-app">
      <header className="app-header">
        <div className="header-content">
          <h1>ZigZag Web - Ted Nelson's Hyperthogonal Structure</h1>
          <p className="tagline">"Locally rational, globally paradoxical"</p>
        </div>
        
        <ViewControls 
          space={space}
          cursor={cursor} 
          onCursorChange={setCursor}
        />
      </header>
      
      <main className="app-main">
        <ZigZagSpace 
          space={space} 
          cursor={cursor}
          onCursorChange={setCursor}
        />
      </main>
      
      <footer className="app-footer">
        <div className="status-bar">
          <span className="current-cell">
            Current: {currentCell?.text || 'No cell'}
          </span>
          <span className="current-dimension">
            Dimension: {cursor.dimension}
          </span>
          <span className="current-view">
            View: {cursor.viewType}
          </span>
          <span className="help-text">
            Use arrow keys to navigate, Tab to change dimensions, F1-F3 to change views
          </span>
        </div>
      </footer>
    </div>
  );
}

export default App;