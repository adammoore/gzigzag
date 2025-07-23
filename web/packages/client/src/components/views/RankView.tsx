import React from 'react';
import { ZZSpace } from '@zigzag/core';
import { ZZCursor } from '../../App';
import { ZZCellComponent } from '../ZZCellComponent';
import styled from 'styled-components';

const RankContainer = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  padding: 20px;
  overflow-x: auto;
  overflow-y: hidden;
  height: 100%;
  min-height: 200px;
  
  /* Custom scrollbar for dark theme */
  &::-webkit-scrollbar {
    height: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: var(--zz-bg-secondary);
  }
  
  &::-webkit-scrollbar-thumb {
    background: var(--zz-border);
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: var(--zz-hover);
  }
`;

const ConnectionArrow = styled.div<{ isHighlighted?: boolean }>`
  font-size: 20px;
  color: ${props => props.isHighlighted ? 'var(--zz-accent-primary)' : 'var(--zz-border)'};
  margin: 0 12px;
  transition: color 0.2s ease;
  user-select: none;
  
  &::before {
    content: '→';
  }
`;

const RankInfo = styled.div`
  position: absolute;
  top: 10px;
  left: 10px;
  background: rgba(0, 0, 0, 0.7);
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;
  color: var(--zz-text-secondary);
  font-family: monospace;
`;

const EmptyRank = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--zz-text-secondary);
  font-style: italic;
`;

interface RankViewProps {
  space: ZZSpace;
  cursor: ZZCursor;
  onCursorChange: (cursor: ZZCursor) => void;
}

export const RankView: React.FC<RankViewProps> = ({
  space,
  cursor,
  onCursorChange
}) => {
  const currentCell = space.getCell(cursor.cellId);
  
  if (!currentCell) {
    return (
      <EmptyRank>
        No current cell found
      </EmptyRank>
    );
  }

  // Get the full rank along current dimension
  const headCell = currentCell.getHead(cursor.dimension);
  const rank = headCell.readRank(cursor.dimension, 1);

  if (rank.length === 0) {
    return (
      <EmptyRank>
        No cells found in dimension "{cursor.dimension}"
      </EmptyRank>
    );
  }

  const handleCellClick = (cellId: string) => {
    onCursorChange({ ...cursor, cellId });
  };

  const currentIndex = rank.findIndex(cell => cell.id === cursor.cellId);

  return (
    <RankContainer>
      <RankInfo>
        Rank: {rank.length} cells | Position: {currentIndex + 1} | Dimension: {cursor.dimension}
      </RankInfo>
      
      {rank.map((cell, index) => (
        <React.Fragment key={cell.id}>
          <ZZCellComponent
            cell={cell}
            isActive={cell.id === cursor.cellId}
            onClick={() => handleCellClick(cell.id)}
            onTextChange={(newText) => {
              cell.text = newText;
              // Optionally trigger a re-render or state update
            }}
          />
          {index < rank.length - 1 && (
            <ConnectionArrow 
              isHighlighted={
                index === currentIndex || 
                index === currentIndex - 1
              }
            />
          )}
        </React.Fragment>
      ))}
    </RankContainer>
  );
};
