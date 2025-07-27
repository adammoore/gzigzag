// packages/client/src/hooks/useZigZagNavigation.ts
import { useEffect, useCallback } from 'react';

type ZZCell = {
  id: string;
  text: string;
  step: (dimension: string, direction: 1 | -1) => ZZCell | null;
};

type ZZSpace = {
  getHomeCell: () => ZZCell;
  getCell: (id: string) => ZZCell | null;
  getDimensions: () => string[];
};

type ZZCursor = {
  cellId: string;
  dimension: string;
  viewType: 'rank' | 'vanishing' | 'rowcol';
};

type DimensionalMapping = {
  x: string;  // X-axis dimension
  y: string;  // Y-axis dimension  
  z: string;  // Z-axis dimension
};

interface UseZigZagNavigationProps {
  space: ZZSpace;
  cursor: ZZCursor;
  setCursor: (cursor: ZZCursor) => void;
  dimensionalMapping: DimensionalMapping;
  setDimensionalMapping: (mapping: DimensionalMapping) => void;
}

export const useZigZagNavigation = ({
  space,
  cursor,
  setCursor,
  dimensionalMapping,
  setDimensionalMapping
}: UseZigZagNavigationProps) => {
  
  // Navigate along a specific dimension
  const navigateInDimension = useCallback((dimension: string, direction: 1 | -1) => {
    const currentCell = space.getCell(cursor.cellId);
    if (!currentCell) return false;

    const nextCell = currentCell.step(dimension, direction);
    if (nextCell) {
      setCursor(prev => ({ ...prev, cellId: nextCell.id }));
      console.log(`Navigated ${direction > 0 ? 'positive' : 'negative'} along ${dimension} to: ${nextCell.text}`);
      return true;
    }
    return false;
  }, [space, cursor.cellId, setCursor]);

  // Cycle through available dimensions
  const cycleDimension = useCallback(() => {
    const dimensions = space.getDimensions();
    const currentIndex = dimensions.indexOf(cursor.dimension);
    const nextIndex = (currentIndex + 1) % dimensions.length;
    const nextDimension = dimensions[nextIndex];
    
    setCursor(prev => ({ ...prev, dimension: nextDimension }));
    console.log(`Dimension cycled to: ${nextDimension}`);
  }, [space, cursor.dimension, setCursor]);

  // Rotate dimensional mapping (original GzigZag xyz keys)
  const rotateDimensionOnAxis = useCallback((axis: 'x' | 'y' | 'z') => {
    const dimensions = space.getDimensions();
    const currentDim = dimensionalMapping[axis];
    const currentIndex = dimensions.indexOf(currentDim);
    const nextIndex = (currentIndex + 1) % dimensions.length;
    const nextDimension = dimensions[nextIndex];
    
    setDimensionalMapping({
      ...dimensionalMapping,
      [axis]: nextDimension
    });
    console.log(`${axis.toUpperCase()}-axis rotated to dimension: ${nextDimension}`);
  }, [space, dimensionalMapping, setDimensionalMapping]);

  // Go to home cell
  const goHome = useCallback(() => {
    const homeCell = space.getHomeCell();
    setCursor(prev => ({ ...prev, cellId: homeCell.id }));
    console.log(`Returned home to: ${homeCell.text}`);
  }, [space, setCursor]);

  // Change view type
  const changeView = useCallback((viewType: 'rank' | 'vanishing' | 'rowcol') => {
    setCursor(prev => ({ ...prev, viewType }));
    console.log(`View changed to: ${viewType}`);
  }, [setCursor]);

  // Set up keyboard event handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Prevent default for navigation keys
      const navigationKeys = [
        'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
        'KeyW', 'KeyA', 'KeyS', 'KeyD',
        'Tab', 'F1', 'F2', 'F3',
        'KeyX', 'KeyY', 'KeyZ',
        'PageUp', 'PageDown', 'Home', 'Escape'
      ];
      
      if (navigationKeys.includes(event.code)) {
        event.preventDefault();
      }

      // Original GzigZag navigation patterns
      switch (event.code) {
        // Arrow key navigation (dimensional mapping)
        case 'ArrowRight':
          navigateInDimension(dimensionalMapping.x, 1);
          break;
        case 'ArrowLeft':
          navigateInDimension(dimensionalMapping.x, -1);
          break;
        case 'ArrowDown':
          navigateInDimension(dimensionalMapping.y, 1);
          break;
        case 'ArrowUp':
          navigateInDimension(dimensionalMapping.y, -1);
          break;
        case 'PageDown':
          navigateInDimension(dimensionalMapping.z, 1);
          break;
        case 'PageUp':
          navigateInDimension(dimensionalMapping.z, -1);
          break;

        // WASD navigation (alternative)
        case 'KeyD':
          navigateInDimension(dimensionalMapping.x, 1);
          break;
        case 'KeyA':
          navigateInDimension(dimensionalMapping.x, -1);
          break;
        case 'KeyS':
          navigateInDimension(dimensionalMapping.y, 1);
          break;
        case 'KeyW':
          navigateInDimension(dimensionalMapping.y, -1);
          break;

        // Current dimension navigation (original GzigZag shift+arrows)
        case 'ArrowRight':
          if (event.shiftKey) {
            navigateInDimension(cursor.dimension, 1);
          }
          break;
        case 'ArrowLeft':
          if (event.shiftKey) {
            navigateInDimension(cursor.dimension, -1);
          }
          break;

        // Tab cycles through dimensions
        case 'Tab':
          cycleDimension();
          break;

        // F-keys change views
        case 'F1':
          changeView('rank');
          break;
        case 'F2':
          changeView('vanishing');
          break;
        case 'F3':
          changeView('rowcol');
          break;

        // Dimensional rotation (original GzigZag xyz keys)
        case 'KeyX':
          rotateDimensionOnAxis('x');
          break;
        case 'KeyY':
          rotateDimensionOnAxis('y');
          break;
        case 'KeyZ':
          rotateDimensionOnAxis('z');
          break;

        // Home key
        case 'Home':
        case 'Escape':
          goHome();
          break;

        default:
          return; // Don't prevent default for other keys
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);
    
    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    navigateInDimension, 
    cycleDimension, 
    rotateDimensionOnAxis, 
    goHome, 
    changeView,
    dimensionalMapping,
    cursor.dimension
  ]);

  // Debug info
  const getNavigationInfo = useCallback(() => {
    const currentCell = space.getCell(cursor.cellId);
    const dimensions = space.getDimensions();
    
    return {
      currentCell: currentCell?.text || 'Unknown',
      currentDimension: cursor.dimension,
      availableDimensions: dimensions,
      dimensionalMapping,
      viewType: cursor.viewType,
      connections: currentCell ? dimensions.map(dim => ({
        dimension: dim,
        positive: currentCell.step(dim, 1)?.text || null,
        negative: currentCell.step(dim, -1)?.text || null
      })) : []
    };
  }, [space, cursor, dimensionalMapping]);

  return {
    navigateInDimension,
    cycleDimension,
    rotateDimensionOnAxis,
    goHome,
    changeView,
    getNavigationInfo
  };
};
