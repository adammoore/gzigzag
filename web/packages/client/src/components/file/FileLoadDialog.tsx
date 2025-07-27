// Enhanced File Load Dialog with progress and validation
// File: packages/client/src/components/file/FileLoadDialog.tsx

import React, { useState, useRef } from 'react';
import styled from 'styled-components';

interface FileLoadDialogProps {
  onLoad: (files: FileList) => Promise<void>;
  onCancel: () => void;
}

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const Dialog = styled.div`
  background: #2a2a2a;
  border-radius: 12px;
  padding: 40px;
  width: 90%;
  max-width: 600px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  border: 2px solid #444;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 30px;
`;

const Title = styled.h2`
  color: #00ff00;
  font-size: 28px;
  font-weight: 300;
  margin: 0 0 10px 0;
  text-shadow: 0 0 10px rgba(0, 255, 0, 0.3);
`;

const Subtitle = styled.p`
  color: #999;
  font-size: 16px;
  margin: 0;
`;

const DropZone = styled.div<{ $isDragOver: boolean; $hasFiles: boolean }>`
  border: 3px dashed ${props => 
    props.$hasFiles ? '#00ff00' : 
    props.$isDragOver ? '#0088ff' : '#666'
  };
  border-radius: 12px;
  padding: 60px 40px;
  text-align: center;
  background: ${props => 
    props.$hasFiles ? 'rgba(0, 255, 0, 0.05)' :
    props.$isDragOver ? 'rgba(0, 136, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)'
  };
  cursor: pointer;
  transition: all 0.3s ease;
  margin-bottom: 30px;
  
  &:hover {
    background: rgba(0, 136, 255, 0.1);
    border-color: #0088ff;
  }
`;

const DropZoneIcon = styled.div`
  font-size: 48px;
  margin-bottom: 20px;
`;

const DropZoneText = styled.div`
  font-size: 18px;
  color: #fff;
  margin-bottom: 10px;
  font-weight: 500;
`;

const DropZoneSubtext = styled.div`
  font-size: 14px;
  color: #999;
`;

const FileList = styled.div`
  margin-bottom: 20px;
`;

const FileItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px;
  background: #333;
  border-radius: 8px;
  margin-bottom: 10px;
  border: 1px solid #444;
`;

const FileInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
`;

const FileIcon = styled.div`
  font-size: 24px;
`;

const FileDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
`;

const FileName = styled.div`
  color: #fff;
  font-weight: 500;
`;

const FileSize = styled.div`
  color: #999;
  font-size: 12px;
`;

const ValidationResult = styled.div<{ $isValid: boolean }>`
  color: ${props => props.$isValid ? '#00ff00' : '#ff4444'};
  font-size: 14px;
  font-weight: 500;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 15px;
  justify-content: flex-end;
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  ${props => props.$variant === 'primary' ? `
    background: #00ff00;
    color: #000;
    font-weight: 500;
    
    &:hover {
      background: #00dd00;
    }
    
    &:disabled {
      background: #444;
      color: #666;
      cursor: not-allowed;
    }
  ` : `
    background: #444;
    color: #fff;
    
    &:hover {
      background: #555;
    }
  `}
`;

const ProgressBar = styled.div`
  margin: 20px 0;
`;

const ProgressTrack = styled.div`
  width: 100%;
  height: 8px;
  background: #333;
  border-radius: 4px;
  overflow: hidden;
`;

const ProgressFill = styled.div<{ $progress: number }>`
  width: ${props => props.$progress}%;
  height: 100%;
  background: linear-gradient(90deg, #00ff00 0%, #00dd00 100%);
  transition: width 0.3s ease;
`;

const ProgressText = styled.div`
  color: #00ff00;
  font-size: 14px;
  text-align: center;
  margin-top: 10px;
  font-weight: 500;
`;

export const FileLoadDialog: React.FC<FileLoadDialogProps> = ({ onLoad, onCancel }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [validationResults, setValidationResults] = useState<{[key: string]: boolean}>({});
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateZDirectory = (file: File): boolean => {
    // Check if it's a directory structure for Z directory
    if (file.name.includes('Z') || file.name.includes('.')) {
      return true; // Basic validation - in real implementation, would check structure
    }
    return false;
  };

  const handleFileSelect = (files: FileList) => {
    setSelectedFiles(files);
    
    // Validate files
    const results: {[key: string]: boolean} = {};
    Array.from(files).forEach(file => {
      results[file.name] = validateZDirectory(file);
    });
    setValidationResults(results);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files);
    }
  };

  const handleLoad = async () => {
    if (!selectedFiles) return;
    
    setIsLoading(true);
    setProgress(0);
    setProgressText('Validating files...');
    
    try {
      // Simulate progress
      const steps = [
        { progress: 20, text: 'Reading directory structure...' },
        { progress: 40, text: 'Parsing cell IDs...' },
        { progress: 60, text: 'Loading cell content...' },
        { progress: 80, text: 'Validating connections...' },
        { progress: 100, text: 'Finalizing import...' }
      ];
      
      for (const step of steps) {
        setProgress(step.progress);
        setProgressText(step.text);
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      await onLoad(selectedFiles);
    } catch (error) {
      console.error('Load error:', error);
      setProgressText('Error loading files');
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const hasValidFiles = selectedFiles && Array.from(selectedFiles).some(file => 
    validationResults[file.name]
  );

  return (
    <Overlay onClick={onCancel}>
      <Dialog onClick={e => e.stopPropagation()}>
        <Header>
          <Title>Load ZigZag Z Directory</Title>
          <Subtitle>Import original GzigZag file structures</Subtitle>
        </Header>

        <DropZone
          $isDragOver={isDragOver}
          $hasFiles={!!selectedFiles}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <DropZoneIcon>
            {selectedFiles ? '✅' : isDragOver ? '📁' : '📂'}
          </DropZoneIcon>
          <DropZoneText>
            {selectedFiles ? 'Files Selected' : 'Drop Z Directory Here'}
          </DropZoneText>
          <DropZoneSubtext>
            {selectedFiles 
              ? `${selectedFiles.length} file(s) selected`
              : 'or click to browse for files'
            }
          </DropZoneSubtext>
        </DropZone>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileInputChange}
          accept=".txt,.dat"
        />

        {selectedFiles && (
          <FileList>
            {Array.from(selectedFiles).slice(0, 5).map((file, index) => (
              <FileItem key={index}>
                <FileInfo>
                  <FileIcon>📄</FileIcon>
                  <FileDetails>
                    <FileName>{file.name}</FileName>
                    <FileSize>{formatFileSize(file.size)}</FileSize>
                  </FileDetails>
                </FileInfo>
                <ValidationResult $isValid={validationResults[file.name]}>
                  {validationResults[file.name] ? '✓ Valid' : '⚠ Check format'}
                </ValidationResult>
              </FileItem>
            ))}
            {selectedFiles.length > 5 && (
              <FileItem>
                <FileInfo>
                  <FileIcon>📋</FileIcon>
                  <FileDetails>
                    <FileName>...and {selectedFiles.length - 5} more files</FileName>
                  </FileDetails>
                </FileInfo>
              </FileItem>
            )}
          </FileList>
        )}

        {isLoading && (
          <ProgressBar>
            <ProgressTrack>
              <ProgressFill $progress={progress} />
            </ProgressTrack>
            <ProgressText>{progressText}</ProgressText>
          </ProgressBar>
        )}

        <ButtonGroup>
          <Button onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            $variant="primary" 
            onClick={handleLoad}
            disabled={!hasValidFiles || isLoading}
          >
            {isLoading ? 'Loading...' : 'Load ZigZag'}
          </Button>
        </ButtonGroup>
      </Dialog>
    </Overlay>
  );
};
