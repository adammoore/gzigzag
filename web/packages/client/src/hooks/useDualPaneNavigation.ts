// Dual-pane navigation hook implementing original GzigZag key bindings
// File: packages/client/src/hooks/useDualPaneNavigation.ts

import { useEffect } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { ZZSpace, ZZCell } from '@zigzag/core';

type ViewType = 'rank' | 'vanishing' | 'rowcol';

interface ZZCursor {
  cellId: string;
  dimension: string;
  viewType: ViewType;
}

interface DualPaneState {
  space: ZZSpace;
  greenCursor: ZZCursor;
  blueCursor: ZZCursor;
  leftPane: { dimensions: [string, string, string]; viewType: ViewType };
  rightPane: { dimensions: [string, string, string]; viewType: ViewType };
  activePane: 'left' | 'right';
  markedCells: Set<string>;
}

interface NavigationHookProps {
  state: DualPaneState;
  setState: React.Dispatch<React.SetStateAction<DualPaneState>>;
}

export const useDualPaneNavigation = ({ state, setState }: NavigationHookProps) => {
  // Helper function to navigate in a specific direction
  const navigateInDimension = (
    cursor: ZZCursor,
    dimension: string,
    direction: 1 | -1,
    pane: 'left' | 'right'
  ) => {
    const currentCell = state.space.getCell(cursor.cellId);
    if (!currentCell) return;

    const nextCell = currentCell.step(dimension, direction);
    if (nextCell) {
      const cursorKey = pane === 'left' ? 'greenCursor' : 'blueCursor';
      setState(prev => ({
        ...prev,
        [cursorKey]: { ...cursor, cellId: nextCell.id },
        activePane: pane
      }));
    }
  };

  // Helper function to rotate dimensions
  const rotateDimension = (pane: 'left' | 'right', axis: number, direction: 1 | -1) => {
    const dimensions = state.space.getDimensions();
    const paneKey = pane === 'left' ? 'leftPane' : 'rightPane';
    const currentPane = state[paneKey];
    const currentDim = currentPane.dimensions[axis];
    const currentIndex = dimensions.indexOf(currentDim);
    const newIndex = (currentIndex + direction + dimensions.length) % dimensions.length;
    const newDimensions = [...currentPane.dimensions] as [string, string, string];
    newDimensions[axis] = dimensions[newIndex];

    setState(prev => ({
      ...prev,
      [paneKey]: { ...currentPane, dimensions: newDimensions }
    }));
  };

  // Helper function to change view type
  const changeView = (pane: 'left' | 'right', direction: 1 | -1) => {
    const views: ViewType[] = ['rank', 'vanishing', 'rowcol'];
    const paneKey = pane === 'left' ? 'leftPane' : 'rightPane';
    const currentPane = state[paneKey];
    const currentIndex = views.indexOf(currentPane.viewType);
    const newIndex = (currentIndex + direction + views.length) % views.length;

    setState(prev => ({
      ...prev,
      [paneKey]: { ...currentPane, viewType: views[newIndex] }
    }));
  };

  // GREEN CURSOR NAVIGATION (Left Pane) - Original GzigZag: esfc + dD
  useHotkeys('e', () => {
    navigateInDimension(state.greenCursor, state.leftPane.dimensions[1], -1, 'left');
  }, { preventDefault: true });

  useHotkeys('c', () => {
    navigateInDimension(state.greenCursor, state.leftPane.dimensions[1], 1, 'left');
  }, { preventDefault: true });

  useHotkeys('s', () => {
    navigateInDimension(state.greenCursor, state.leftPane.dimensions[0], -1, 'left');
  }, { preventDefault: true });

  useHotkeys('f', () => {
    navigateInDimension(state.greenCursor, state.leftPane.dimensions[0], 1, 'left');
  }, { preventDefault: true });

  useHotkeys('d', () => {
    navigateInDimension(state.greenCursor, state.leftPane.dimensions[2], 1, 'left');
  }, { preventDefault: true });

  useHotkeys('shift+d', () => {
    navigateInDimension(state.greenCursor, state.leftPane.dimensions[2], -1, 'left');
  }, { preventDefault: true });

  // BLUE CURSOR NAVIGATION (Right Pane) - Original GzigZag: ijl, + kK
  useHotkeys('i', () => {
    navigateInDimension(state.blueCursor, state.rightPane.dimensions[1], -1, 'right');
  }, { preventDefault: true });

  useHotkeys(',', () => {
    navigateInDimension(state.blueCursor, state.rightPane.dimensions[1], 1, 'right');
  }, { preventDefault: true });

  useHotkeys('j', () => {
    navigateInDimension(state.blueCursor, state.rightPane.dimensions[0], -1, 'right');
  }, { preventDefault: true });

  useHotkeys('l', () => {
    navigateInDimension(state.blueCursor, state.rightPane.dimensions[0], 1, 'right');
  }, { preventDefault: true });

  useHotkeys('k', () => {
    navigateInDimension(state.blueCursor, state.rightPane.dimensions[2], 1, 'right');
  }, { preventDefault: true });

  useHotkeys('shift+k', () => {
    navigateInDimension(state.blueCursor, state.rightPane.dimensions[2], -1, 'right');
  }, { preventDefault: true });

  // DIMENSION ROTATION - Original GzigZag: XYZ (left) / xyz (right)
  useHotkeys('shift+x', () => rotateDimension('left', 0, 1), { preventDefault: true });
  useHotkeys('shift+y', () => rotateDimension('left', 1, 1), { preventDefault: true });
  useHotkeys('shift+z', () => rotateDimension('left', 2, 1), { preventDefault: true });

  useHotkeys('x', () => rotateDimension('right', 0, 1), { preventDefault: true });
  useHotkeys('y', () => rotateDimension('right', 1, 1), { preventDefault: true });
  useHotkeys('z', () => rotateDimension('right', 2, 1), { preventDefault: true });

  // VIEW SWITCHING - Original GzigZag: V (left) / v (right)
  useHotkeys('shift+v', () => changeView('left', 1), { preventDefault: true });
  useHotkeys('v', () => changeView('right', 1), { preventDefault: true });

  // CURSOR COORDINATION - Original GzigZag: ~<>
  useHotkeys('shift+`', () => {
    // Swap cursor positions
    setState(prev => ({
      ...prev,
      greenCursor: { ...prev.greenCursor, cellId: prev.blueCursor.cellId },
      blueCursor: { ...prev.blueCursor, cellId: prev.greenCursor.cellId }
    }));
  }, { preventDefault: true });

  useHotkeys('shift+,', () => {
    // Move green cursor to blue cursor's position
    setState(prev => ({
      ...prev,
      greenCursor: { ...prev.greenCursor, cellId: prev.blueCursor.cellId },
      activePane: 'left'
    }));
  }, { preventDefault: true });

  useHotkeys('shift+.', () => {
    // Move blue cursor to green cursor's position
    setState(prev => ({
      ...prev,
      blueCursor: { ...prev.blueCursor, cellId: prev.greenCursor.cellId },
      activePane: 'right'
    }));
  }, { preventDefault: true });

  // CELL OPERATIONS - Original GzigZag patterns
  
  // Create new cell (n + direction)
  const createCell = (direction: string, pane: 'left' | 'right') => {
    const cursor = pane === 'left' ? state.greenCursor : state.blueCursor;
    const paneState = pane === 'left' ? state.leftPane : state.rightPane;
    const currentCell = state.space.getCell(cursor.cellId);
    if (!currentCell) return;

    let dimension: string;
    let dir: 1 | -1;

    switch (direction) {
      case 'ArrowUp':
      case 'e':
      case 'i':
        dimension = paneState.dimensions[1];
        dir = -1;
        break;
      case 'ArrowDown':
      case 'c':
      case ',':
        dimension = paneState.dimensions[1];
        dir = 1;
        break;
      case 'ArrowLeft':
      case 's':
      case 'j':
        dimension = paneState.dimensions[0];
        dir = -1;
        break;
      case 'ArrowRight':
      case 'f':
      case 'l':
        dimension = paneState.dimensions[0];
        dir = 1;
        break;
      default:
        return;
    }

    const newCell = currentCell.newCell(dimension, dir, '');
    if (newCell) {
      const cursorKey = pane === 'left' ? 'greenCursor' : 'blueCursor';
      setState(prev => ({
        ...prev,
        [cursorKey]: { ...cursor, cellId: newCell.id },
        activePane: pane
      }));
    }
  };

  // Cell creation shortcuts (n + direction)
  useHotkeys('n', () => {
    // Enable creation mode - listen for next direction key
    const handleDirection = (e: KeyboardEvent) => {
      const activePaneForCreation = state.activePane;
      createCell(e.code, activePaneForCreation);
      document.removeEventListener('keydown', handleDirection);
    };
    document.addEventListener('keydown', handleDirection);
  }, { preventDefault: true });

  // MARKING SYSTEM - Original GzigZag: m
  useHotkeys('m', () => {
    const activeCell = state.activePane === 'left' 
      ? state.greenCursor.cellId 
      : state.blueCursor.cellId;
    
    setState(prev => {
      const newMarkedCells = new Set(prev.markedCells);
      if (newMarkedCells.has(activeCell)) {
        newMarkedCells.delete(activeCell);
      } else {
        newMarkedCells.add(activeCell);
      }
      return { ...prev, markedCells: newMarkedCells };
    });
  }, { preventDefault: true });

  // HOME NAVIGATION - Original GzigZag: ESC
  useHotkeys('escape', () => {
    const homeCell = state.space.getHomeCell();
    setState(prev => ({
      ...prev,
      greenCursor: { ...prev.greenCursor, cellId: homeCell.id },
      blueCursor: { ...prev.blueCursor, cellId: homeCell.id },
      markedCells: new Set()
    }));
  }, { preventDefault: true });

  // NAVIGATION TO MARKED CELLS - Original GzigZag patterns
  useHotkeys('g', () => {
    // Go to cell by ID (placeholder - would need input system)
    console.log('Go to cell by ID - not implemented in this demo');
  }, { preventDefault: true });

  // DIMENSIONAL NAVIGATION - Navigate along current cursor dimension
  useHotkeys('shift+ArrowLeft', () => {
    const cursor = state.activePane === 'left' ? state.greenCursor : state.blueCursor;
    navigateInDimension(cursor, cursor.dimension, -1, state.activePane);
  }, { preventDefault: true });

  useHotkeys('shift+ArrowRight', () => {
    const cursor = state.activePane === 'left' ? state.greenCursor : state.blueCursor;
    navigateInDimension(cursor, cursor.dimension, 1, state.activePane);
  }, { preventDefault: true });

  // TAB - Cycle through dimensions for active cursor
  useHotkeys('tab', () => {
    const dimensions = state.space.getDimensions();
    const cursor = state.activePane === 'left' ? state.greenCursor : state.blueCursor;
    const currentIndex = dimensions.indexOf(cursor.dimension);
    const nextIndex = (currentIndex + 1) % dimensions.length;
    const newDimension = dimensions[nextIndex];

    const cursorKey = state.activePane === 'left' ? 'greenCursor' : 'blueCursor';
    setState(prev => ({
      ...prev,
      [cursorKey]: { ...cursor, dimension: newDimension }
    }));
  }, { preventDefault: true });

  // DEBUG INFO
  useHotkeys('ctrl+i', () => {
    console.log('=== DUAL PANE DEBUG INFO ===');
    console.log('Active Pane:', state.activePane);
    console.log('Green Cursor:', state.greenCursor);
    console.log('Blue Cursor:', state.blueCursor);
    console.log('Left Pane:', state.leftPane);
    console.log('Right Pane:', state.rightPane);
    console.log('Marked Cells:', Array.from(state.markedCells));
    console.log('Available Dimensions:', state.space.getDimensions());
    console.log('============================');
  }, { preventDefault: true });

  // HELP
  useHotkeys('h', () => {
    console.log(`
=== DUAL PANE KEYBOARD SHORTCUTS ===

NAVIGATION:
Green Cursor (Left):  e/c (up/down), s/f (left/right), d/D (z-axis)
Blue Cursor (Right):  i/, (up/down), j/l (left/right), k/K (z-axis)

DIMENSIONS:
Left Pane:  X/Y/Z (rotate dimensions)
Right Pane: x/y/z (rotate dimensions)

VIEWS:
Left Pane:  V (change view)
Right Pane: v (change view)

CURSOR COORDINATION:
~ - Swap cursor positions
< - Move green to blue position  
> - Move blue to green position

CELL OPERATIONS:
n + direction - Create new cell
m - Mark/unmark cell
Tab - Cycle dimension for active cursor
ESC - Return to home

Ctrl+I - Debug info
h - This help
    `);
  }, { preventDefault: true });
};
