import React from 'react';
import { ZZSpace } from '@zigzag/core';
import { ZZCursor, ViewType } from '../App';
import { RankView } from './views/RankView';
import { VanishingView } from './views/VanishingView';
import { RowColView } from './views/RowColView';
import styled from 'styled-components';

const SpaceContainer = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--zz-bg-primary);
  color: var(--zz-text-primary);
  overflow: hidden;
  position: relative;
`;

const ViewContainer = styled.div<{ viewType: ViewType }>`
  flex: 1;
  display: flex;
  transition: all 0.3s ease;
  
  ${props => props.viewType === 'rank' && `
    justify-content: center;
    align-items: center;
    padding: 20px;
  `}
  
  ${props => props.viewType === 'vanishing' && `
    position: relative;
    width: 100%;
    height: 100%;
  `}
  
  ${props => props.viewType === 'rowcol' && `
    flex-direction: column;
    padding: 10px;
  `}
`;

interface ZigZagSpaceProps {
  space: ZZSpace;
  cursor: ZZCursor;
  onCursorChange: (cursor: ZZCursor) => void;
}

export const ZigZagSpace: React.FC<ZigZagSpaceProps> = ({
  space,
  cursor,
  onCursorChange
}) => {
  const renderView = () => {
    const commonProps = {
      space,
      cursor,
      onCursorChange
    };

    switch (cursor.viewType) {
      case 'rank':
        return <RankView {...commonProps} />;
      case 'vanishing':
        return <VanishingView {...commonProps} />;
      case 'rowcol':
        return <RowColView {...commonProps} />;
      default:
        return <RankView {...commonProps} />;
    }
  };

  return (
    <SpaceContainer>
      <ViewContainer viewType={cursor.viewType}>
        {renderView()}
      </ViewContainer>
    </SpaceContainer>
  );
};