// packages/client/src/components/file/ImportProgress.tsx
import React from 'react';
import styled from 'styled-components';
import { GZZImportResult } from '@zigzag/core/io/GZZFileReader';

interface ImportProgressProps {
  result: GZZImportResult;
  onContinue: () => void;
  onCancel: () => void;
  isOpen: boolean;
}

const Overlay = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: ${props => props.isOpen ? 'flex' : 'none'};
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const Dialog = styled.div`
  background: #2a2a2a;
  padding: 40px;
  border-radius: 12px;
  width: 90%;
  max-width: 700px;
  color: white;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  max-height: 80vh;
  overflow-y: auto;
`;

const StatusSection = styled.div`
  margin: 20px 0;
  padding: 15px;
  border-radius: 6px;
  background: #333;
`;

const StatItem = styled.div`
  display: flex;
  justify-content: space-between;
  margin: 5px 0;
  font-family: monospace;
`;

const MessageList = styled.div`
  max-height: 200px;
  overflow-y: auto;
  font-family: monospace;
  font-size: 12px;
`;

const Message = styled.div<{ type: 'error' | 'warning' }>`
  padding: 5px 0;
  color: ${props => props.type === 'error' ? '#ff4444' : '#ffaa44'};
`;

export const ImportProgress: React.FC<ImportProgressProps> = ({
  result,
  onContinue,
  onCancel,
  isOpen
}) => {
  const hasErrors = result.errors.length > 0;
  const hasWarnings = result.warnings.length > 0;

  return (
    <Overlay isOpen={isOpen}>
      <Dialog>
        <h2 style={{ color: hasErrors ? '#ff4444' : '#00ff00', margin: '0 0 20px 0' }}>
          {hasErrors ? '⚠️ Import Issues Detected' : '✅ Import Successful'}
        </h2>

        <StatusSection>
          <h3 style={{ margin: '0 0 10px 0', color: '#00ff00' }}>Import Statistics</h3>
          <StatItem>
            <span>Cells Loaded:</span>
            <span>{result.stats.cellsLoaded}</span>
          </StatItem>
          <StatItem>
            <span>Connections Created:</span>
            <span>{result.stats.connectionsCreated}</span>
          </StatItem>
          <StatItem>
            <span>Dimensions Found:</span>
            <span>{result.stats.dimensionsFound.length}</span>
          </StatItem>
          <StatItem>
            <span>Dimensions:</span>
            <span style={{ color: '#888', fontSize: '11px' }}>
              {result.stats.dimensionsFound.join(', ')}
            </span>
          </StatItem>
        </StatusSection>

        {hasErrors && (
          <StatusSection>
            <h3 style={{ margin: '0 0 10px 0', color: '#ff4444' }}>
              Errors ({result.errors.length})
            </h3>
            <MessageList>
              {result.errors.map((error, i) => (
                <Message key={i} type="error">❌ {error}</Message>
              ))}
            </MessageList>
          </StatusSection>
        )}

        {hasWarnings && (
          <StatusSection>
            <h3 style={{ margin: '0 0 10px 0', color: '#ffaa44' }}>
              Warnings ({result.warnings.length})
            </h3>
            <MessageList>
              {result.warnings.map((warning, i) => (
                <Message key={i} type="warning">⚠️ {warning}</Message>
              ))}
            </MessageList>
          </StatusSection>
        )}

        {!hasErrors && (
          <div style={{ 
            color: '#00ff00', 
            background: 'rgba(0, 255, 0, 0.1)', 
            padding: '15px', 
            borderRadius: '6px',
            margin: '20px 0'
          }}>
            <strong>Ready to Navigate!</strong>
            <br />
            Your original ZigZag structure has been successfully loaded.
            You can now navigate through it using arrow keys and all the modern interface features.
          </div>
        )}

        <div style={{ textAlign: 'right', marginTop: '30px' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '12px 24px',
              background: '#444',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              marginRight: '10px',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={onContinue}
            disabled={hasErrors}
            style={{
              padding: '12px 24px',
              background: hasErrors ? '#666' : '#00ff00',
              color: hasErrors ? '#999' : '#000',
              border: 'none',
              borderRadius: '6px',
              cursor: hasErrors ? 'not-allowed' : 'pointer'
            }}
          >
            {hasErrors ? 'Fix Errors First' : 'Continue to ZigZag'}
          </button>
        </div>
      </Dialog>
    </Overlay>
  );
};
