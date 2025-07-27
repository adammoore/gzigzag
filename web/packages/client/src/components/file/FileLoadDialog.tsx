import React, { useCallback, useState } from 'react';
import styled from 'styled-components';

const DialogOverlay = styled.div`
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

const DialogContainer = styled.div`
  background: #2a2a2a;
  border-radius: 12px;
  padding: 30px;
  max-width: 500px;
  width: 90%;
  color: white;
`;

const DropZone = styled.div<{ isDragOver: boolean }>`
  border: 2px dashed ${props => props.isDragOver ? '#00ff00' : '#666'};
  border-radius: 8px;
  padding: 40px;
  text-align: center;
  margin: 20px 0;
  background: ${props => props.isDragOver ? '#003300' : '#1a1a1a'};
  transition: all 0.3s ease;
  cursor: pointer;
`;

const FileInput = styled.input`
  display: none;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 15px;
  justify-content: flex-end;
  margin-top: 20px;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  background: ${props => props.variant === 'primary' ? '#00ff00' : '#444'};
  color: ${props => props.variant === 'primary' ? '#000' : '#fff'};
  
  &:hover {
    background: ${props => props.variant === 'primary' ? '#00dd00' : '#555'};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

interface FileLoadDialogProps {
  onLoad: (files: FileList) => void;
  onClose: () => void;
}

export const FileLoadDialog: React.FC<FileLoadDialogProps> = ({ onLoad, onClose }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      setSelectedFiles(files);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFiles(files);
    }
  }, []);

  const handleLoad = useCallback(() => {
    if (selectedFiles) {
      onLoad(selectedFiles);
    }
  }, [selectedFiles, onLoad]);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <DialogOverlay onClick={onClose}>
      <DialogContainer onClick={(e) => e.stopPropagation()}>
        <h2>Load Original GzigZag Z Directory</h2>
        <p>Select the Z directory from your original GzigZag installation, or drag and drop it here.</p>
        
        <DropZone
          isDragOver={isDragOver}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          {selectedFiles ? (
            <div>
              <p>✅ Selected: {selectedFiles.length} files</p>
              <p style={{ color: '#00ff00', fontSize: '14px' }}>
                Ready to import Z directory structure
              </p>
            </div>
          ) : (
            <div>
              <p>📁 Drop Z directory here</p>
              <p style={{ color: '#999', fontSize: '14px' }}>
                Or click to browse for Z directory contents
              </p>
            </div>
          )}
        </DropZone>

        <FileInput
          ref={fileInputRef}
          type="file"
          multiple
          webkitdirectory
          directory=""
          onChange={handleFileSelect}
          accept=""
        />

        <div style={{ color: '#999', fontSize: '12px', marginBottom: '20px' }}>
          <strong>Note:</strong> Select the entire Z directory structure. The browser will ask you to 
          select a folder and will include all subdirectories and files automatically.
        </div>

        <ButtonGroup>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleLoad}
            disabled={!selectedFiles}
          >
            Import Z Directory
          </Button>
        </ButtonGroup>
      </DialogContainer>
    </DialogOverlay>
  );
};
