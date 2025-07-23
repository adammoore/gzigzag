import { useEffect } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { ZZSpace } from '@zigzag/core';
import { ZZCursor } from '../App';

export const useKeyboardNavigation = (
  space: ZZSpace,
  cursor: ZZCursor,
  setCursor: (cursor: ZZCursor) => void
) => {
  const navigateInDimension = (dimension: string, direction: 1 | -1) => {
    const currentCell = space.getCell(cursor.cellId);
    if (!currentCell) return;

    const nextCell = currentCell.step(dimension, direction);
    if (nextCell) {
      setCursor(prev => ({ ...prev, cellId: nextCell.id }));
    }
  };

  const jumpToHead = (dimension: string) => {
    const currentCell = space.getCell(cursor.cellId);
    if (!currentCell) return;

    const headCell = currentCell.getHead(dimension);
    if (headCell && headCell.id !== cursor.cellId) {
      setCursor(prev => ({ ...prev, cellId: headCell.id }));
    }
  };

  const jumpToTail = (dimension: string) => {
    const currentCell = space.getCell(cursor.cellId);
    if (!currentCell) return;

    // Get tail by going to head and reading full rank
    const headCell = currentCell.getHead(dimension);
    const rank = headCell.readRank(dimension, 1);
    const tailCell = rank[rank.length - 1];
    
    if (tailCell && tailCell.id !== cursor.cellId) {
      setCursor(prev => ({ ...prev, cellId: tailCell.id }));
    }
  };

  // Primary navigation: Arrow keys for d.1 and d.2
  useHotkeys('ArrowRight', () => navigateInDimension('d.1', 1), [cursor]);
  useHotkeys('ArrowLeft', () => navigateInDimension('d.1', -1), [cursor]);
  useHotkeys('ArrowUp', () => navigateInDimension('d.2', -1), [cursor]);
  useHotkeys('ArrowDown', () => navigateInDimension('d.2', 1), [cursor]);

  // WASD navigation (alternative)
  useHotkeys('d', () => navigateInDimension('d.1', 1), [cursor]);
  useHotkeys('a', () => navigateInDimension('d.1', -1), [cursor]);
  useHotkeys('w', () => navigateInDimension('d.2', -1), [cursor]);
  useHotkeys('s', () => navigateInDimension('d.2', 1), [cursor]);

  // Navigation along current dimension
  useHotkeys('shift+ArrowRight', () => navigateInDimension(cursor.dimension, 1), [cursor]);
  useHotkeys('shift+ArrowLeft', () => navigateInDimension(cursor.dimension, -1), [cursor]);

  // Jump to head/tail of current dimension
  useHotkeys('Home', () => jumpToHead(cursor.dimension), [cursor]);
  useHotkeys('End', () => jumpToTail(cursor.dimension), [cursor]);
  useHotkeys('PageUp', () => jumpToHead(cursor.dimension), [cursor]);
  useHotkeys('PageDown', () => jumpToTail(cursor.dimension), [cursor]);

  // View switching
  useHotkeys('F1', () => setCursor(prev => ({ ...prev, viewType: 'rank' })), [cursor]);
  useHotkeys('F2', () => setCursor(prev => ({ ...prev, viewType: 'vanishing' })), [cursor]);
  useHotkeys('F3', () => setCursor(prev => ({ ...prev, viewType: 'rowcol' })), [cursor]);

  // Dimension cycling
  useHotkeys('Tab', (e) => {
    e.preventDefault();
    const dimensions = space.getDimensions();
    const currentIndex = dimensions.indexOf(cursor.dimension);
    const nextIndex = (currentIndex + 1) % dimensions.length;
    setCursor(prev => ({ ...prev, dimension: dimensions[nextIndex] }));
  }, [cursor, space]);

  // Reverse dimension cycling
  useHotkeys('shift+Tab', (e) => {
    e.preventDefault();
    const dimensions = space.getDimensions();
    const currentIndex = dimensions.indexOf(cursor.dimension);
    const prevIndex = currentIndex === 0 ? dimensions.length - 1 : currentIndex - 1;
    setCursor(prev => ({ ...prev, dimension: dimensions[prevIndex] }));
  }, [cursor, space]);

  // Quick dimension switching (for biochemistry demo)
  useHotkeys('1', () => setCursor(prev => ({ ...prev, dimension: 'd.1' })), [cursor]);
  useHotkeys('2', () => setCursor(prev => ({ ...prev, dimension: 'd.2' })), [cursor]);
  useHotkeys('k', () => setCursor(prev => ({ ...prev, dimension: 'd.krebs' })), [cursor]);
  useHotkeys('c', () => setCursor(prev => ({ ...prev, dimension: 'd.carbons' })), [cursor]);

  // Go to home cell
  useHotkeys('h', () => {
    const homeCell = space.getHomeCell();
    if (homeCell) {
      setCursor(prev => ({ ...prev, cellId: homeCell.id }));
    }
  }, [cursor, space]);

  // Debug info (console log current state)
  useHotkeys('ctrl+i', () => {
    const currentCell = space.getCell(cursor.cellId);
    console.log('ZigZag Debug Info:', {
      cursor,
      currentCell: currentCell ? {
        id: currentCell.id,
        text: currentCell.text,
        connections: Object.keys(currentCell['connections'] || {})
      } : null,
      availableDimensions: space.getDimensions(),
      totalCells: space.getCells().length
    });
  }, [cursor, space]);
};
