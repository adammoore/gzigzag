import React, { useEffect, useRef, useState } from 'react';
import { ZZSpace, ZZCell } from '@zigzag/core';
import { ZZCursor } from '../../App';
import { ZZCellComponent } from '../ZZCellComponent';
import styled, { keyframes, css } from 'styled-components';

const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const RankContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--zz-bg-primary);
  overflow: hidden;
  position: relative;
`;

const RankScrollArea = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 40px;
  position: relative;
  
  &::-webkit-scrollbar {
    height: 8px;
    background: var(--zz-bg-secondary);
  }
  
  &::-webkit-scrollbar-thumb {
    background: var(--zz-border);
    border-radius: 4px;
    
    &:hover {
      background: var(--zz-hover);
    }
  }
`;

const RankTrack = styled.div<{ shouldAnimate: boolean }>`
  display: flex;
  align-items: center;
  gap: 20px;
  position: relative;
  min-width: min-content;
  padding: 20px 40px;
  
  ${props => props.shouldAnimate && css`
    animation: ${slideIn} 0.3s ease-out;
  `}
`;

const CellWrapper = styled.div<{ isActive: boolean; index: number }>`
  position: relative;
  transform-origin: center;
  animation: ${slideIn} 0.3s ease-out ${props => props.index * 0.05}s both;
  
  ${props => props.isActive && css`
    animation: ${pulse} 1s ease-in-out infinite;
  `}
`;

const ConnectionSVG = styled.svg`
  position: absolute;
  width: 60px;
  height: 40px;
  left: 100%;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  z-index: 1;
`;

const ConnectionPath = styled.path<{ dimension: string }>`
  fill: none;
  stroke: ${props => {
    switch (props.dimension) {
      case 'd.krebs': return '#ff6b6b';
      case 'd.carbons': return '#4ecdc4';
      case 'd.carbon-count': return '#ffe66d';
      case 'd.carbon-instances': return '#a8e6cf';
      default: return '#666666';
    }
  }};
  stroke-width: 2;
  stroke-dasharray: 100;
  stroke-dashoffset: 100;
  animation: drawPath 0.5s ease-out forwards;
  
  @keyframes drawPath {
    to {
      stroke-dashoffset: 0;
    }
  }
`;

const InfoBar = styled.div`
  padding: 16px 24px;
  background: var(--zz-bg-secondary);
  border-top: 1px solid var(--zz-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: 'Courier New', monospace;
  font-size: 14px;
  color: var(--zz-text-secondary);
`;

const DimensionIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const DimensionDot = styled.div<{ dimension: string }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${props => {
    switch (props.dimension) {
      case 'd.krebs': return '#ff6b6b';
      case 'd.carbons': return '#4ecdc4';
      case 'd.carbon-count': return '#ffe66d';
      case 'd.carbon-instances': return '#a8e6cf';
      default: return '#666666';
    }
  }};
  box-shadow: 0 0 10px ${props => {
    switch (props.dimension) {
      case 'd.krebs': return '#ff6b6b';
      case 'd.carbons': return '#4ecdc4';
      case 'd.carbon-count': return '#ffe66d';
      case 'd.carbon-instances': return '#a8e6cf';
      default: return '#666666';
    }
  }}40;
`;

const RankStats = styled.div`
  display: flex;
  gap: 20px;
  font-size: 12px;
`;

const NavigationHints = styled.div`
  position: absolute;
  top: 20px;
  right: 20px;
  padding: 12px 16px;
  background: var(--zz-bg-secondary);
  border: 1px solid var(--zz-border);
  border-radius: 4px;
  font-size: 12px;
  color: var(--zz-text-secondary);
  opacity: 0.8;
  transition: opacity 0.2s;
  
  &:hover {
    opacity: 1;
  }
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [shouldAnimate, setShouldAnimate] = useState(true);
  const [showHints, setShowHints] = useState(true);
  
  if (!currentCell) return <div>No cell found</div>;

  // Get the full rank along current dimension
  const headCell = currentCell.getHead(cursor.dimension);
  const rank = headCell.readRank(cursor.dimension, 1);
  const currentIndex = rank.findIndex(c => c.id === cursor.cellId);
  
  // Auto-scroll to active cell
  useEffect(() => {
    if (scrollRef.current && currentIndex !== -1) {
      const container = scrollRef.current;
      const cellElements = container.querySelectorAll('[data-cell-index]');
      const activeCell = cellElements[currentIndex] as HTMLElement;
      
      if (activeCell) {
        const containerRect = container.getBoundingClientRect();
        const cellRect = activeCell.getBoundingClientRect();
        const scrollLeft = container.scrollLeft + cellRect.left - containerRect.left - 
                          (containerRect.width / 2) + (cellRect.width / 2);
        
        container.scrollTo({
          left: scrollLeft,
          behavior: 'smooth'
        });
      }
    }
  }, [currentIndex]);
  
  // Hide hints after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowHints(false), 5000);
    return () => clearTimeout(timer);
  }, []);
  
  // Count connections for current cell
  const connectionCount = space.getDimensions().filter(dim => 
    currentCell.step(dim, 1) || currentCell.step(dim, -1)
  ).length;

  return (
    <RankContainer>
      <RankScrollArea ref={scrollRef}>
        <RankTrack shouldAnimate={shouldAnimate}>
          {rank.map((cell, index) => (
            <CellWrapper
              key={cell.id}
              isActive={cell.id === cursor.cellId}
              index={index}
              data-cell-index={index}
            >
              <ZZCellComponent
                cell={cell}
                isActive={cell.id === cursor.cellId}
                onClick={() => {
                  setShouldAnimate(false);
                  onCursorChange({ ...cursor, cellId: cell.id });
                }}
              />
              {index < rank.length - 1 && (
                <ConnectionSVG viewBox="0 0 60 40">
                  <ConnectionPath
                    dimension={cursor.dimension}
                    d="M 5 20 Q 30 20 55 20"
                  />
                  <ConnectionPath
                    dimension={cursor.dimension}
                    d="M 50 15 L 55 20 L 50 25"
                  />
                </ConnectionSVG>
              )}
            </CellWrapper>
          ))}
        </RankTrack>
        
        {showHints && (
          <NavigationHints>
            <div>← → Navigate cells</div>
            <div>Tab: Switch dimensions</div>
            <div>Double-click: Edit</div>
          </NavigationHints>
        )}
      </RankScrollArea>
      
      <InfoBar>
        <DimensionIndicator>
          <DimensionDot dimension={cursor.dimension} />
          <span>Dimension: {cursor.dimension}</span>
        </DimensionIndicator>
        
        <RankStats>
          <span>Position: {currentIndex + 1} / {rank.length}</span>
          <span>•</span>
          <span>Connections: {connectionCount}</span>
          <span>•</span>
          <span>Cell ID: {currentCell.id.slice(0, 8)}...</span>
        </RankStats>
      </InfoBar>
    </RankContainer>
  );
};
