import React from 'react';
import { ZZSpace } from '@zigzag/core';
import { ZZCursor } from '../../App';
import styled from 'styled-components';

const PlaceholderContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--zz-text-secondary);
  text-align: center;
  padding: 40px;
`;

const PlaceholderTitle = styled.h3`
  color: var(--zz-accent-primary);
  margin-bottom: 16px;
`;

const PlaceholderText = styled.p`
  margin-bottom: 8px;
  line-height: 1.5;
`;

interface VanishingViewProps {
  space: ZZSpace;
  cursor: ZZCursor;
  onCursorChange: (cursor: ZZCursor) => void;
}

export const VanishingView: React.FC<VanishingViewProps> = ({
  space,
  cursor,
  onCursorChange
}) => {
  return (
    <PlaceholderContainer>
      <PlaceholderTitle>3D Vanishing View</PlaceholderTitle>
      <PlaceholderText>
        This will be a Three.js-powered 3D visualization of the ZigZag structure
      </PlaceholderText>
      <PlaceholderText>
        Showing multiple dimensions converging in perspective
      </PlaceholderText>
      <PlaceholderText>
        Current cell: {space.getCell(cursor.cellId)?.text}
      </PlaceholderText>
      <PlaceholderText style={{ fontSize: '12px', opacity: 0.7 }}>
        Switch back to Rank view (F1) to see the working interface
      </PlaceholderText>
    </PlaceholderContainer>
  );
};
