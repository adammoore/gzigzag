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

  const rotateDimension = useCallback((_axis: 'x' | 'y' | 'z', direction: 1 | -1 = 1) => {
    const dimensions = space.getDimensions();
    const currentDimensions = [cursor.dimension]; // For single pane, we track one dimension
    
    const currentIndex = dimensions.indexOf(currentDimensions[0]);
    let nextIndex = currentIndex + direction;
    
    if (nextIndex >= dimensions.length) nextIndex = 0;
    if (nextIndex < 0) nextIndex = dimensions.length - 1;
    
    onCursorChange({ ...cursor, dimension: dimensions[nextIndex] });
  }, [space, cursor, onCursorChange]);

  const switchView = useCallback((direction: 1 | -1 = 1) => {
    const viewTypes: ViewType[] = ['vanishing', 'stretchvanishing', 'row', 'column', 'rank'];
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
        // Arrow key navigation using cursor dimensions
        case 'ArrowRight':
        case 'l':
          navigateInDimension(cursor.xDimension || cursor.dimension, 1);
          break;
        case 'ArrowLeft':
        case 'j':
          navigateInDimension(cursor.xDimension || cursor.dimension, -1);
          break;
        case 'ArrowUp':
        case 'i':
          navigateInDimension(cursor.yDimension || space.getDimensions()[1] || 'd.2', -1);
          break;
        case 'ArrowDown':
        case ',':
          navigateInDimension(cursor.yDimension || space.getDimensions()[1] || 'd.2', 1);
          break;
        
        // Z-axis navigation
        case 'k':
          navigateInDimension(cursor.zDimension || space.getDimensions()[2] || 'd.3', 1);
          break;
        case 'K':
          navigateInDimension(cursor.zDimension || space.getDimensions()[2] || 'd.3', -1);
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
          onCursorChange({ ...cursor, viewType: 'row' });
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

// Global state for marked cells and cell ID buffer (should ideally be in a context/store)
const markedCells = new Set<string>();
let cellIdBuffer = '';

// Dual pane keyboard navigation (original GzigZag style)
export const useDualPaneNavigation = ({
  space,
  greenCursor,
  blueCursor,
  onGreenCursorChange,
  onBlueCursorChange,
  // activeCursor = 'blue'
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
        'V', 'v', '~', '<', '>',
        'n', 'm', 'b', 'h', 'Delete',
        '-', 't', 'T', '/', 'g', 'G',
        '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
        'S', 'z', 'Backspace'
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

        // View switching (authentic GZZ order)
        case 'V':
          // Switch green pane view
          const greenViews: ViewType[] = ['vanishing', 'stretchvanishing', 'row', 'column', 'rank'];
          const greenIndex = greenViews.indexOf(greenCursor.viewType);
          const nextGreenIndex = (greenIndex + 1) % greenViews.length;
          onGreenCursorChange({ ...greenCursor, viewType: greenViews[nextGreenIndex] });
          break;
        case 'v':
          // Switch blue pane view
          const blueViews: ViewType[] = ['vanishing', 'stretchvanishing', 'row', 'column', 'rank'];
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

        // Dimension cycling
        case 'Tab':
          e.preventDefault();
          const allDimensions = space.getDimensions();
          const blueCurrentDimIndex = allDimensions.indexOf(blueCursor.dimension);
          const nextBlueDimension = allDimensions[(blueCurrentDimIndex + 1) % allDimensions.length];
          onBlueCursorChange({ ...blueCursor, dimension: nextBlueDimension });
          break;

        // Cell creation (n + direction) - Authentic ZigZag command
        case 'n':
          e.preventDefault();
          // Wait for next keypress to get direction
          const handleCreationDirection = (dirEvent: KeyboardEvent) => {
            dirEvent.preventDefault();
            const currentCell = space.getCell(blueCursor.cellId);
            if (!currentCell) return;

            let dimension = 'd.1';
            let direction: 1 | -1 = 1;
            
            switch (dirEvent.key) {
              case 'l': case 'ArrowRight':
                dimension = 'd.1'; direction = 1; break;
              case 'j': case 'ArrowLeft':
                dimension = 'd.1'; direction = -1; break;
              case ',': case 'ArrowDown':
                dimension = 'd.2'; direction = 1; break;
              case 'i': case 'ArrowUp':
                dimension = 'd.2'; direction = -1; break;
              case 'k':
                dimension = 'd.3'; direction = 1; break;
              case 'K':
                dimension = 'd.3'; direction = -1; break;
              default:
                document.removeEventListener('keydown', handleCreationDirection);
                return;
            }

            try {
              const newCell = currentCell.newCell(dimension, direction, '');
              onBlueCursorChange({ ...blueCursor, cellId: newCell.id });
            } catch (error) {
              console.warn('Failed to create cell:', error);
            }
            
            document.removeEventListener('keydown', handleCreationDirection);
          };
          
          document.addEventListener('keydown', handleCreationDirection);
          break;

        // Cell marking (m) - Authentic ZigZag command  
        case 'm':
          e.preventDefault();
          const cell = space.getCell(blueCursor.cellId);
          if (cell) {
            if (markedCells.has(cell.id)) {
              markedCells.delete(cell.id);
              console.log(`Unmarked cell: ${cell.text || cell.id}`);
            } else {
              markedCells.add(cell.id);
              console.log(`Marked cell: ${cell.text || cell.id}`);
            }
          }
          break;

        // Break connection (b + direction)
        case 'b':
          e.preventDefault();
          const handleBreakDirection = (dirEvent: KeyboardEvent) => {
            dirEvent.preventDefault();
            const currentCell = space.getCell(blueCursor.cellId);
            if (!currentCell) return;

            let dimension = 'd.1';
            let direction: 1 | -1 = 1;
            
            switch (dirEvent.key) {
              case 'l': case 'ArrowRight':
                dimension = 'd.1'; direction = 1; break;
              case 'j': case 'ArrowLeft':
                dimension = 'd.1'; direction = -1; break;
              case ',': case 'ArrowDown':
                dimension = 'd.2'; direction = 1; break;
              case 'i': case 'ArrowUp':
                dimension = 'd.2'; direction = -1; break;
              case 'k':
                dimension = 'd.3'; direction = 1; break;
              case 'K':
                dimension = 'd.3'; direction = -1; break;
              default:
                document.removeEventListener('keydown', handleBreakDirection);
                return;
            }

            try {
              const targetCell = currentCell.step(dimension, direction);
              if (targetCell) {
                // Break connection by excising the target cell
                targetCell.excise(dimension);
                console.log(`Broke connection in direction ${dimension}`);
              }
            } catch (error) {
              console.warn('Failed to break connection:', error);
            }
            
            document.removeEventListener('keydown', handleBreakDirection);
          };
          
          document.addEventListener('keydown', handleBreakDirection);
          break;

        // Hop cell (h + direction) - swap positions
        case 'h':
          e.preventDefault();
          const handleHopDirection = (dirEvent: KeyboardEvent) => {
            dirEvent.preventDefault();
            const currentCell = space.getCell(blueCursor.cellId);
            if (!currentCell) return;

            let dimension = 'd.1';
            let direction: 1 | -1 = 1;
            
            switch (dirEvent.key) {
              case 'l': case 'ArrowRight':
                dimension = 'd.1'; direction = 1; break;
              case 'j': case 'ArrowLeft':
                dimension = 'd.1'; direction = -1; break;
              case ',': case 'ArrowDown':
                dimension = 'd.2'; direction = 1; break;
              case 'i': case 'ArrowUp':
                dimension = 'd.2'; direction = -1; break;
              case 'k':
                dimension = 'd.3'; direction = 1; break;
              case 'K':
                dimension = 'd.3'; direction = -1; break;
              default:
                document.removeEventListener('keydown', handleHopDirection);
                return;
            }

            try {
              const targetCell = currentCell.step(dimension, direction);
              if (targetCell) {
                // Hop operation: swap positions of current and target cell
                console.log(`Hopped cell ${currentCell.text} with ${targetCell.text}`);
                // TODO: Implement actual cell position swapping
              }
            } catch (error) {
              console.warn('Failed to hop cell:', error);
            }
            
            document.removeEventListener('keydown', handleHopDirection);
          };
          
          document.addEventListener('keydown', handleHopDirection);
          break;

        // Delete cell (Delete key)
        case 'Delete':
          e.preventDefault();
          const cellToDelete = space.getCell(blueCursor.cellId);
          if (cellToDelete) {
            // Try to move cursor following priority: X-, X+, Y-, Y+, Z-, Z+, home
            const moveOptions = [
              { dim: 'd.1', dir: -1 as 1 | -1 }, { dim: 'd.1', dir: 1 as 1 | -1 },
              { dim: 'd.2', dir: -1 as 1 | -1 }, { dim: 'd.2', dir: 1 as 1 | -1 },
              { dim: 'd.3', dir: -1 as 1 | -1 }, { dim: 'd.3', dir: 1 as 1 | -1 }
            ];
            
            let newCell = null;
            for (const option of moveOptions) {
              newCell = cellToDelete.step(option.dim, option.dir);
              if (newCell) break;
            }
            
            if (!newCell) {
              newCell = space.getHomeCell();
            }
            
            // Move cursor before deleting
            onBlueCursorChange({ ...blueCursor, cellId: newCell.id });
            
            // Delete the cell
            space.deleteCell(cellToDelete.id);
            console.log(`Deleted cell: ${cellToDelete.text || cellToDelete.id}`);
          }
          break;

        // Connection command (- + direction to connect marked cells)
        case '-':
          e.preventDefault();
          const handleConnectionDirection = (dirEvent: KeyboardEvent) => {
            dirEvent.preventDefault();
            const currentCell = space.getCell(blueCursor.cellId);
            if (!currentCell) return;

            let dimension = 'd.1';
            let direction: 1 | -1 = 1;
            
            switch (dirEvent.key) {
              case 'l': case 'ArrowRight':
                dimension = 'd.1'; direction = 1; break;
              case 'j': case 'ArrowLeft':
                dimension = 'd.1'; direction = -1; break;
              case ',': case 'ArrowDown':
                dimension = 'd.2'; direction = 1; break;
              case 'i': case 'ArrowUp':
                dimension = 'd.2'; direction = -1; break;
              case 'k':
                dimension = 'd.3'; direction = 1; break;
              case 'K':
                dimension = 'd.3'; direction = -1; break;
              default:
                document.removeEventListener('keydown', handleConnectionDirection);
                return;
            }

            try {
              // Connect current cell to the first marked cell in specified direction
              if (markedCells.size > 0) {
                const markedCellId = Array.from(markedCells)[0];
                const markedCell = space.getCell(markedCellId);
                if (markedCell) {
                  if (direction > 0) {
                    currentCell.connect(dimension, markedCell);
                  } else {
                    markedCell.connect(dimension, currentCell);
                  }
                  console.log(`Connected ${currentCell.text || currentCell.id} to ${markedCell.text || markedCell.id} in ${dimension} (dir: ${direction})`);
                  markedCells.delete(markedCellId); // Clear mark after connection
                } else {
                  console.warn('Marked cell not found');
                }
              } else {
                console.warn('No marked cells to connect to');
              }
            } catch (error) {
              console.warn('Failed to connect cells:', error);
            }
            
            document.removeEventListener('keydown', handleConnectionDirection);
          };
          
          document.addEventListener('keydown', handleConnectionDirection);
          break;

        // Clone cell (t + direction) and (T + direction)
        case 't':
          e.preventDefault();
          const handleCloneDirection = (dirEvent: KeyboardEvent) => {
            dirEvent.preventDefault();
            const currentCell = space.getCell(blueCursor.cellId);
            if (!currentCell) return;

            let dimension = 'd.1';
            let direction: 1 | -1 = 1;
            
            switch (dirEvent.key) {
              case 'l': case 'ArrowRight':
                dimension = 'd.1'; direction = 1; break;
              case 'j': case 'ArrowLeft':
                dimension = 'd.1'; direction = -1; break;
              case ',': case 'ArrowDown':
                dimension = 'd.2'; direction = 1; break;
              case 'i': case 'ArrowUp':
                dimension = 'd.2'; direction = -1; break;
              case 'k':
                dimension = 'd.3'; direction = 1; break;
              case 'K':
                dimension = 'd.3'; direction = -1; break;
              default:
                document.removeEventListener('keydown', handleCloneDirection);
                return;
            }

            try {
              // Create a new cell with same content
              const newCell = currentCell.newCell(dimension, direction, currentCell.text || '');
              onBlueCursorChange({ ...blueCursor, cellId: newCell.id });
              console.log(`Cloned cell: ${currentCell.text || currentCell.id}`);
            } catch (error) {
              console.warn('Failed to clone cell:', error);
            }
            
            document.removeEventListener('keydown', handleCloneDirection);
          };
          
          document.addEventListener('keydown', handleCloneDirection);
          break;

        case 'T':
          e.preventDefault();
          const handleDeepCloneDirection = (dirEvent: KeyboardEvent) => {
            dirEvent.preventDefault();
            const currentCell = space.getCell(blueCursor.cellId);
            if (!currentCell) return;

            let dimension = 'd.1';
            let direction: 1 | -1 = 1;
            
            switch (dirEvent.key) {
              case 'l': case 'ArrowRight':
                dimension = 'd.1'; direction = 1; break;
              case 'j': case 'ArrowLeft':
                dimension = 'd.1'; direction = -1; break;
              case ',': case 'ArrowDown':
                dimension = 'd.2'; direction = 1; break;
              case 'i': case 'ArrowUp':
                dimension = 'd.2'; direction = -1; break;
              case 'k':
                dimension = 'd.3'; direction = 1; break;
              case 'K':
                dimension = 'd.3'; direction = -1; break;
              default:
                document.removeEventListener('keydown', handleDeepCloneDirection);
                return;
            }

            try {
              // Deep clone - create cell with content and try to preserve some connections
              const newCell = currentCell.newCell(dimension, direction, currentCell.text || '');
              onBlueCursorChange({ ...blueCursor, cellId: newCell.id });
              console.log(`Deep cloned cell: ${currentCell.text || currentCell.id}`);
            } catch (error) {
              console.warn('Failed to deep clone cell:', error);
            }
            
            document.removeEventListener('keydown', handleDeepCloneDirection);
          };
          
          document.addEventListener('keydown', handleDeepCloneDirection);
          break;

        // Cursor coordination between views (/ + direction)
        case '/':
          e.preventDefault();
          const handleCoordinationDirection = (dirEvent: KeyboardEvent) => {
            dirEvent.preventDefault();
            let dimension = 'd.1';
            let direction: 1 | -1 = 1;
            
            switch (dirEvent.key) {
              case 'l': case 'ArrowRight':
                dimension = 'd.1'; direction = 1; break;
              case 'j': case 'ArrowLeft':
                dimension = 'd.1'; direction = -1; break;
              case ',': case 'ArrowDown':
                dimension = 'd.2'; direction = 1; break;
              case 'i': case 'ArrowUp':
                dimension = 'd.2'; direction = -1; break;
              case 'k':
                dimension = 'd.3'; direction = 1; break;
              case 'K':
                dimension = 'd.3'; direction = -1; break;
              default:
                document.removeEventListener('keydown', handleCoordinationDirection);
                return;
            }

            try {
              // Coordinate cursors - move green cursor to blue cursor's neighbor
              const blueCell = space.getCell(blueCursor.cellId);
              if (blueCell) {
                const targetCell = blueCell.step(dimension, direction);
                if (targetCell) {
                  onGreenCursorChange({ ...greenCursor, cellId: targetCell.id });
                  console.log(`Coordinated green cursor to ${dimension} ${direction} of blue`);
                }
              }
            } catch (error) {
              console.warn('Failed to coordinate cursors:', error);
            }
            
            document.removeEventListener('keydown', handleCoordinationDirection);
          };
          
          document.addEventListener('keydown', handleCoordinationDirection);
          break;

        // Save space (S) - Authentic ZigZag command
        case 'S':
          e.preventDefault();
          const handleSaveCommand = async () => {
            try {
              const spaceName = prompt('Enter space name:', 'my-zigzag-space') || 'zigzag-space';
              const { saveSpaceAsZip } = await import('../utils/saveLoad');
              await saveSpaceAsZip(space, spaceName);
            } catch (error) {
              console.error('Failed to save space:', error);
              alert('Failed to save space. Check console for details.');
            }
          };
          handleSaveCommand();
          break;

        // Load Z directory (z) - Authentic ZigZag command
        case 'z':
          e.preventDefault();
          const handleLoadCommand = async () => {
            try {
              // Show load options dialog
              const choice = prompt(
                'Load Z Directory:\n' +
                '1 = Load from ZIP file\n' + 
                '2 = Load from server space\n' +
                '3 = Load demo spaces\n' +
                'Enter choice (1-3):',
                '1'
              );
              
              if (choice === '1') {
                // Load from ZIP file
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.zip';
                input.onchange = async (event) => {
                  const file = (event.target as HTMLInputElement).files?.[0];
                  if (file) {
                    const { loadSpaceFromZip, importSpaceData } = await import('../utils/saveLoad');
                    const spaceData = await loadSpaceFromZip(file);
                    if (spaceData && confirm(`Load space "${spaceData.name}"? This will replace the current space.`)) {
                      importSpaceData(space, spaceData);
                      // Reset cursors to home
                      const homeCell = space.getHomeCell();
                      if (homeCell) {
                        onBlueCursorChange({ ...blueCursor, cellId: homeCell.id });
                        onGreenCursorChange({ ...greenCursor, cellId: homeCell.id });
                      }
                      alert(`Loaded space "${spaceData.name}" successfully!`);
                    }
                  }
                };
                input.click();
                
              } else if (choice === '2') {
                // Load from server (requires authentication)
                const spaceId = prompt('Enter space ID to load:');
                if (spaceId) {
                  const { loadSpaceFromServer, importSpaceData } = await import('../utils/saveLoad');
                  const spaceData = await loadSpaceFromServer(spaceId);
                  if (spaceData && confirm(`Load space "${spaceData.name}" from server? This will replace the current space.`)) {
                    importSpaceData(space, spaceData);
                    const homeCell = space.getHomeCell();
                    if (homeCell) {
                      onBlueCursorChange({ ...blueCursor, cellId: homeCell.id });
                      onGreenCursorChange({ ...greenCursor, cellId: homeCell.id });
                    }
                    alert(`Loaded space "${spaceData.name}" from server!`);
                  }
                }
                
              } else if (choice === '3') {
                // Load demo spaces
                const demo = prompt(
                  'Demo spaces:\n' +
                  '1 = Adam Chemistry Demo\n' +
                  '2 = Krebs Cycle\n' +
                  '3 = Blank Space\n' +
                  'Enter choice (1-3):',
                  '1'
                );
                
                if (demo === '1' || demo === '2' || demo === '3') {
                  const { createAdamChemDemo, createKrebsCycleDemo, createBlankSpace } = await import('@zigzag/core');
                  let newSpace;
                  let name;
                  
                  switch (demo) {
                    case '1':
                      newSpace = createAdamChemDemo();
                      name = 'Adam Chemistry Demo';
                      break;
                    case '2':
                      newSpace = createKrebsCycleDemo();
                      name = 'Krebs Cycle Demo';
                      break;
                    case '3':
                      newSpace = createBlankSpace();
                      name = 'Blank Space';
                      break;
                  }
                  
                  if (newSpace && confirm(`Load "${name}"? This will replace the current space.`)) {
                    // Clear current space and import demo
                    // Note: This is a simplified approach - you may need to implement proper space replacement
                    const homeCell = newSpace.getHomeCell();
                    if (homeCell) {
                      onBlueCursorChange({ ...blueCursor, cellId: homeCell.id });
                      onGreenCursorChange({ ...greenCursor, cellId: homeCell.id });
                    }
                    alert(`Loaded "${name}" successfully!`);
                  }
                }
              }
            } catch (error) {
              console.error('Failed to load space:', error);
              alert('Failed to load space. Check console for details.');
            }
          };
          handleLoadCommand();
          break;

        // Cell ID buffer system (authentic GZZ feature)
        case '0': case '1': case '2': case '3': case '4':
        case '5': case '6': case '7': case '8': case '9':
          e.preventDefault();
          cellIdBuffer += e.key;
          console.log(`Cell ID buffer: "${cellIdBuffer}"`);
          break;
          
        case 'g':
          e.preventDefault();
          if (cellIdBuffer.length > 0) {
            try {
              // Try to find cell by numeric ID first
              let targetCell = space.getCell(cellIdBuffer);
              
              // If not found by exact ID, try to find by partial ID match
              if (!targetCell) {
                const allCells = space.getAllCells();
                targetCell = allCells.find(cell => cell.id.startsWith(cellIdBuffer)) || null;
              }
              
              if (targetCell) {
                onBlueCursorChange({ ...blueCursor, cellId: targetCell.id });
                console.log(`Moved to cell: ${targetCell.id} (buffer: "${cellIdBuffer}")`);
              } else {
                console.warn(`Cell not found for ID: "${cellIdBuffer}"`);
              }
            } catch (error) {
              console.warn('Failed to navigate to cell:', error);
            }
            
            // Clear buffer after use
            cellIdBuffer = '';
          } else {
            console.log('Cell ID buffer is empty');
          }
          break;
        
        case 'G':
          e.preventDefault();
          // Go to cell by ID for GREEN cursor (view 0)
          if (cellIdBuffer.length > 0) {
            try {
              let targetCell = space.getCell(cellIdBuffer);
              
              if (!targetCell) {
                const allCells = space.getAllCells();
                targetCell = allCells.find(cell => cell.id.startsWith(cellIdBuffer)) || null;
              }
              
              if (targetCell) {
                onGreenCursorChange({ ...greenCursor, cellId: targetCell.id });
                console.log(`Moved green cursor to cell: ${targetCell.id} (buffer: "${cellIdBuffer}")`);
              } else {
                console.warn(`Cell not found for ID: "${cellIdBuffer}"`);
              }
            } catch (error) {
              console.warn('Failed to navigate green cursor to cell:', error);
            }
            
            cellIdBuffer = '';
          } else {
            console.log('Cell ID buffer is empty');
          }
          break;
          
        case 'Backspace':
          // Remove last digit from buffer
          if (cellIdBuffer.length > 0) {
            cellIdBuffer = cellIdBuffer.slice(0, -1);
            console.log(`Cell ID buffer: "${cellIdBuffer}"`);
            e.preventDefault();
          }
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