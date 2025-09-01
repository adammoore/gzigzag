import React from 'react';
import { ZZSpace } from '@zigzag/core';
import { ZZCursor, ViewType } from '../App';
import styled from 'styled-components';

const ControlsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
  padding: 12px 0;
`;

const ControlGroup = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

const ControlLabel = styled.label`
  font-size: 14px;
  color: var(--zz-text-secondary);
  font-weight: 500;
  min-width: 70px;
`;

const Select = styled.select`
  background: var(--zz-bg-secondary);
  border: 1px solid var(--zz-border);
  border-radius: 4px;
  color: var(--zz-text-primary);
  padding: 6px 12px;
  font-size: 14px;
  min-width: 120px;
  
  &:hover {
    border-color: var(--zz-hover);
  }
  
  &:focus {
    outline: none;
    border-color: var(--zz-accent-primary);
  }
  
  option {
    background: var(--zz-bg-secondary);
    color: var(--zz-text-primary);
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  border: 1px solid var(--zz-border);
  border-radius: 4px;
  overflow: hidden;
`;

const ViewButton = styled.button<{ isActive: boolean }>`
  background: ${props => props.isActive ? 'var(--zz-accent-primary)' : 'var(--zz-bg-secondary)'};
  border: none;
  color: ${props => props.isActive ? '#000' : 'var(--zz-text-primary)'};
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border-right: 1px solid var(--zz-border);
  
  &:last-child {
    border-right: none;
  }
  
  &:hover {
    background: ${props => props.isActive ? 'var(--zz-accent-primary)' : 'var(--zz-hover)'};
  }
  
  &:focus {
    outline: none;
  }
`;

const NavigationInfo = styled.div`
  font-size: 12px;
  color: var(--zz-text-secondary);
  font-family: monospace;
  background: rgba(0, 0, 0, 0.3);
  padding: 4px 8px;
  border-radius: 4px;
  margin-left: auto;
`;

interface ViewControlsProps {
  space: ZZSpace;
  cursor: ZZCursor;
  onCursorChange: (cursor: ZZCursor) => void;
}

export const ViewControls: React.FC<ViewControlsProps> = ({
  space,
  cursor,
  onCursorChange
}) => {
  const dimensions = space.getDimensions();
  const currentCell = space.getCell(cursor.cellId);
  
  // Get rank size for current dimension
  const rankSize = React.useMemo(() => {
    if (!currentCell) return 0;
    try {
      const headCell = currentCell.getHead(cursor.dimension);
      const rank = headCell.readRank(cursor.dimension, 1);
      return rank.length;
    } catch {
      return 0;
    }
  }, [currentCell, cursor.dimension]);

  const handleDimensionChange = (dimension: string) => {
    onCursorChange({ ...cursor, dimension });
  };

  const handleViewChange = (viewType: ViewType) => {
    onCursorChange({ ...cursor, viewType });
  };

  const viewTypes: { key: ViewType; label: string; shortcut: string }[] = [
    { key: 'vanishing', label: 'Vanishing', shortcut: 'v' },
    { key: 'stretchvanishing', label: 'Stretch', shortcut: 'v' },
    { key: 'row', label: 'Row', shortcut: 'v' },
    { key: 'column', label: 'Column', shortcut: 'v' },
    { key: 'rank', label: 'Rank', shortcut: 'v' },
  ];

  return (
    <ControlsContainer>
      <ControlGroup>
        <ControlLabel>Dimension:</ControlLabel>
        <Select
          value={cursor.dimension}
          onChange={(e) => handleDimensionChange(e.target.value)}
        >
          {dimensions.map(dim => (
            <option key={dim} value={dim}>
              {dim}
            </option>
          ))}
        </Select>
      </ControlGroup>

      <ControlGroup>
        <ControlLabel>View:</ControlLabel>
        <ButtonGroup>
          {viewTypes.map(({ key, label, shortcut }) => (
            <ViewButton
              key={key}
              isActive={cursor.viewType === key}
              onClick={() => handleViewChange(key)}
              title={`${label} View (${shortcut})`}
            >
              {label}
            </ViewButton>
          ))}
        </ButtonGroup>
      </ControlGroup>

      <NavigationInfo>
        Rank: {rankSize} cells | 
        Use ←→ or Tab to navigate | 
        F1-F3 for views | 
        Shift+←→ along dimension
      </NavigationInfo>
    </ControlsContainer>
  );
};
