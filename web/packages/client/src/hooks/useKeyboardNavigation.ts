import { useEffect, useCallback } from 'react';
import { ZZSpace } from '@zigzag/core';
import { ZZCursor, ViewType } from '../App';

interface KeyboardNavigationConfig {
  space: ZZSpace;
  cursor: ZZCursor;
  onCursorChange: (cursor: ZZCursor) => void;
  isActive?: boolean;
}

// Single pane keyboard navigation (original functionality)
export const useKeyboardNavigation = ({
  space,
  cursor,
  onCursorChange,
  isActive = true
}: KeyboardNavigationConfig) => {
  
  const navigateInDimension = useCallback((dimension: string, direction: 1 | -1) => {
    const currentCell = space.getCell(cursor.cellId);
    if (!currentCell) return;

    const nextCell = currentCell.step(dimension, direction);
    if (nextCell) {
      onCursorChange({ ...cursor, cellId: nextCell.id });
    }
  }, [space, cursor, onCursorChange]);

  const rotateDimension = useCallback((axis: 'x' | 'y' | 'z', direction: 1 | -1 = 1) => {
    const dimensions = space.getDimensions();
    const currentDimensions = [cursor.dimension]; // For single pane, we track one dimension
    
    const currentIndex = dimensions.indexOf(currentDimensions[0]);
    let nextIndex = currentIndex + direction;
    
    if (nextIndex >= dimensions.length) nextIndex = 0;
    if (nextIndex < 0) nextIndex = dimensions.length - 1;
    
    onCursorChange({ ...cursor, dimension: dimensions[nextIndex] });
  }, [space, cursor, onCursorChange]);

  const switchView = useCallback((direction: 1 | -1 = 1) => {
    const viewTypes: ViewType[] = ['rank', 'vanishing', 'rowcol'];
    const currentIndex = viewTypes.indexOf(cursor.viewType);
    let nextIndex = currentIndex + direction;
    
    if (nextIndex >= viewTypes.length) nextIndex = 0;
    if (nextIndex < 0) nextIndex = viewTypes.length - 1;
    
    onCursorChange({ ...cursor, viewType: viewTypes[nextIndex] });
  }, [cursor, onCursorChange]);

  const goHome = useCallback(() => {
    const homeCell = space.getHomeCell();
    onCursorChange({ ...cursor, cellId: homeCell.id });
  }, [space, cursor, onCursorChange]);

  useEffect(() => {
    if (!isActive) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      // Prevent default for ZigZag navigation keys
      const zigzagKeys = [
        'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
        'i', ',', 'j', 'l', 'k', 'K',
        'x', 'y', 'z', 'v', 'h', 'Escape'
      ];
      
      if (zigzagKeys.includes(e.key)) {
        e.preventDefault();
      }

      switch (e.key) {
        // Arrow key navigation (d.1 and d.2)
        case 'ArrowRight':
        case 'l':
          navigateInDimension('d.1', 1);
          break;
        case 'ArrowLeft':
        case 'j':
          navigateInDimension('d.1', -1);
          break;
        case 'ArrowUp':
        case 'i':
          navigateInDimension('d.2', -1);
          break;
        case 'ArrowDown':
        case ',':
          navigateInDimension('d.2', 1);
          break;
        
        // Z-axis navigation
        case 'k':
          navigateInDimension('d.3', 1);
          break;
        case 'K':
          navigateInDimension('d.3', -1);
          break;

        // Current dimension navigation
        case 'shift+ArrowRight':
          navigateInDimension(cursor.dimension, 1);
          break;
        case 'shift+ArrowLeft':
          navigateInDimension(cursor.dimension, -1);
          break;

        // Dimension rotation
        case 'x':
          rotateDimension('x', 1);
          break;
        case 'y':
          rotateDimension('y', 1);
          break;
        case 'z':
          rotateDimension('z', 1);
          break;

        // View switching
        case 'v':
          switchView(1);
          break;
        case 'V':
          switchView(-1);
          break;

        // Special navigation
        case 'Escape':
        case 'h':
          goHome();
          break;

        // Tab for dimension cycling
        case 'Tab':
          e.preventDefault();
          rotateDimension('x', 1);
          break;

        // F-keys for view types
        case 'F1':
          onCursorChange({ ...cursor, viewType: 'rank' });
          break;
        case 'F2':
          onCursorChange({ ...cursor, viewType: 'vanishing' });
          break;
        case 'F3':
          onCursorChange({ ...cursor, viewType: 'rowcol' });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [
    isActive,
    navigateInDimension,
    rotateDimension,
    switchView,
    goHome,
    cursor,
    onCursorChange
  ]);

  return {
    navigateInDimension,
    rotateDimension,
    switchView,
    goHome
  };
};

// Dual pane keyboard navigation (original GzigZag style)
export const useDualPaneNavigation = ({
  space,
  greenCursor,
  blueCursor,
  onGreenCursorChange,
  onBlueCursorChange,
  activeCursor = 'blue'
}: {
  space: ZZSpace;
  greenCursor: ZZCursor;
  blueCursor: ZZCursor;
  onGreenCursorChange: (cursor: ZZCursor) => void;
  onBlueCursorChange: (cursor: ZZCursor) => void;
  activeCursor?: 'green' | 'blue';
}) => {

  const navigateGreenCursor = useCallback((dimension: string, direction: 1 | -1) => {
    const currentCell = space.getCell(greenCursor.cellId);
    if (!currentCell) return;

    const nextCell = currentCell.step(dimension, direction);
    if (nextCell) {
      onGreenCursorChange({ ...greenCursor, cellId: nextCell.id });
    }
  }, [space, greenCursor, onGreenCursorChange]);

  const navigateBlueCursor = useCallback((dimension: string, direction: 1 | -1) => {
    const currentCell = space.getCell(blueCursor.cellId);
    if (!currentCell) return;

    const nextCell = currentCell.step(dimension, direction);
    if (nextCell) {
      onBlueCursorChange({ ...blueCursor, cellId: nextCell.id });
    }
  }, [space, blueCursor, onBlueCursorChange]);

  const swapCursors = useCallback(() => {
    const tempCellId = greenCursor.cellId;
    onGreenCursorChange({ ...greenCursor, cellId: blueCursor.cellId });
    onBlueCursorChange({ ...blueCursor, cellId: tempCellId });
  }, [greenCursor, blueCursor, onGreenCursorChange, onBlueCursorChange]);

  const jumpGreenToBlue = useCallback(() => {
    onGreenCursorChange({ ...greenCursor, cellId: blueCursor.cellId });
  }, [greenCursor, blueCursor, onGreenCursorChange]);

  const jumpBlueToGreen = useCallback(() => {
    onBlueCursorChange({ ...blueCursor, cellId: greenCursor.cellId });
  }, [greenCursor, blueCursor, onBlueCursorChange]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Prevent default for ZigZag navigation keys
      const zigzagKeys = [
        'e', 'c', 's', 'f', 'd', 'D',
        'i', ',', 'j', 'l', 'k', 'K',
        'X', 'Y', 'Z', 'x', 'y', 'z',
        'V', 'v', '~', '<', '>'
      ];
      
      if (zigzagKeys.includes(e.key)) {
        e.preventDefault();
      }

      switch (e.key) {
        // Green cursor navigation (left pane)
        case 'e':
          navigateGreenCursor('d.2', -1);
          break;
        case 'c':
          navigateGreenCursor('d.2', 1);
          break;
        case 's':
          navigateGreenCursor('d.1', -1);
          break;
        case 'f':
          navigateGreenCursor('d.1', 1);
          break;
        case 'D':
          navigateGreenCursor('d.3', -1);
          break;
        case 'd':
          navigateGreenCursor('d.3', 1);
          break;

        // Blue cursor navigation (right pane)
        case 'i':
          navigateBlueCursor('d.2', -1);
          break;
        case ',':
          navigateBlueCursor('d.2', 1);
          break;
        case 'j':
          navigateBlueCursor('d.1', -1);
          break;
        case 'l':
          navigateBlueCursor('d.1', 1);
          break;
        case 'K':
          navigateBlueCursor('d.3', -1);
          break;
        case 'k':
          navigateBlueCursor('d.3', 1);
          break;

        // Cursor coordination
        case '~':
          swapCursors();
          break;
        case '<':
          jumpGreenToBlue();
          break;
        case '>':
          jumpBlueToGreen();
          break;

        // View switching
        case 'V':
          // Switch green pane view
          const greenViews: ViewType[] = ['rank', 'vanishing', 'rowcol'];
          const greenIndex = greenViews.indexOf(greenCursor.viewType);
          const nextGreenIndex = (greenIndex + 1) % greenViews.length;
          onGreenCursorChange({ ...greenCursor, viewType: greenViews[nextGreenIndex] });
          break;
        case 'v':
          // Switch blue pane view
          const blueViews: ViewType[] = ['rank', 'vanishing', 'rowcol'];
          const blueIndex = blueViews.indexOf(blueCursor.viewType);
          const nextBlueIndex = (blueIndex + 1) % blueViews.length;
          onBlueCursorChange({ ...blueCursor, viewType: blueViews[nextBlueIndex] });
          break;

        // Dimension rotation
        case 'X':
          // Rotate green pane X dimension
          const greenDimensions = space.getDimensions();
          const greenCurrentIndex = greenDimensions.indexOf(greenCursor.dimension);
          const nextGreenDimIndex = (greenCurrentIndex + 1) % greenDimensions.length;
          onGreenCursorChange({ ...greenCursor, dimension: greenDimensions[nextGreenDimIndex] });
          break;
        case 'x':
          // Rotate blue pane X dimension
          const blueDimensions = space.getDimensions();
          const blueCurrentIndex = blueDimensions.indexOf(blueCursor.dimension);
          const nextBlueDimIndex = (blueCurrentIndex + 1) % blueDimensions.length;
          onBlueCursorChange({ ...blueCursor, dimension: blueDimensions[nextBlueDimIndex] });
          break;

        // Home navigation
        case 'Escape':
          const homeCell = space.getHomeCell();
          onGreenCursorChange({ ...greenCursor, cellId: homeCell.id });
          onBlueCursorChange({ ...blueCursor, cellId: homeCell.id });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [
    space,
    greenCursor,
    blueCursor,
    onGreenCursorChange,
    onBlueCursorChange,
    navigateGreenCursor,
    navigateBlueCursor,
    swapCursors,
    jumpGreenToBlue,
    jumpBlueToGreen
  ]);

  return {
    navigateGreenCursor,
    navigateBlueCursor,
    swapCursors,
    jumpGreenToBlue,
    jumpBlueToGreen
  };
};

// Export alias for compatibility
export const useSinglePaneNavigation = useKeyboardNavigation;