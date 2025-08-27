import React, { useState } from 'react';
import { ZZCell } from '@zigzag/core';
import styled from 'styled-components';

const CellBox = styled.div<{ 
  isActive: boolean; 
  isEditing: boolean;
  cellType?: string;
}>`
  padding: 12px 16px;
  margin: 4px;
  border: 2px solid ${props => {
    if (props.isActive) return 'var(--zz-accent-primary)';
    if (props.cellType === 'compound') return '#4CAF50';
    if (props.cellType === 'category') return '#2196F3';
    return 'var(--zz-border)';
  }};
  background: ${props => {
    if (props.isEditing) return 'var(--zz-bg-secondary)';
    if (props.isActive) return 'rgba(0, 255, 0, 0.1)';
    if (props.cellType === 'compound') return 'rgba(76, 175, 80, 0.1)';
    if (props.cellType === 'category') return 'rgba(33, 150, 243, 0.1)';
    return '#2a2a2a';
  }};
  color: var(--zz-text-primary);
  border-radius: 6px;
  cursor: pointer;
  min-width: 140px;
  max-width: 200px;
  text-align: center;
  transition: all 0.2s ease;
  user-select: none;
  font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.3;
  
  &:hover {
    border-color: var(--zz-hover);
    background: ${props => props.isActive ? 
      'rgba(0, 255, 0, 0.2)' : 
      'rgba(255, 255, 255, 0.05)'
    };
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const CellInput = styled.input`
  background: transparent;
  border: none;
  color: var(--zz-text-primary);
  text-align: center;
  width: 100%;
  outline: none;
  font-family: inherit;
  font-size: inherit;
`;

const CellContent = styled.div`
  word-wrap: break-word;
  overflow-wrap: break-word;
`;

interface ZZCellComponentProps {
  cell: ZZCell;
  isActive: boolean;
  onClick: () => void;
  onTextChange?: (text: string) => void;
  showConnections?: boolean;
}

export const ZZCellComponent: React.FC<ZZCellComponentProps> = ({
  cell,
  isActive,
  onClick,
  onTextChange,
  // showConnections = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(cell.text);

  // Determine cell type for styling
  const cellType = React.useMemo(() => {
    const text = cell.text.toLowerCase();
    if (text.includes('compounds') || text.includes('category')) {
      return 'category';
    }
    if (text.includes('acetyl') || text.includes('citrate') || text.includes('coa')) {
      return 'compound';
    }
    return 'default';
  }, [cell.text]);

  const handleDoubleClick = () => {
    setIsEditing(true);
    setEditText(cell.text);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      cell.text = editText;
      onTextChange?.(editText);
      setIsEditing(false);
    } else if (e.key === 'Escape') {
      setEditText(cell.text);
      setIsEditing(false);
    }
    // Prevent navigation while editing
    e.stopPropagation();
  };

  const handleClick = () => {
    if (!isEditing) {
      onClick();
    }
  };

  return (
    <CellBox
      isActive={isActive}
      isEditing={isEditing}
      cellType={cellType}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      title={`Cell: ${cell.text}${isActive ? ' (ACTIVE)' : ''}`}
    >
      {isEditing ? (
        <CellInput
          value={editText}
          onChange={e => setEditText(e.target.value)}
          onKeyDown={handleKeyPress}
          onBlur={() => setIsEditing(false)}
          autoFocus
        />
      ) : (
        <CellContent>
          {cell.text || '(empty)'}
        </CellContent>
      )}
    </CellBox>
  );
};