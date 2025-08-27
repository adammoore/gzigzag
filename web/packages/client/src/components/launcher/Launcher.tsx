import React, { useState } from 'react';
import { ZZSpace } from '@zigzag/core';
import { FileLoadDialog } from '../file';
import './Launcher.css';

interface LaunchOption {
  id: 'krebs' | 'adam_chem' | 'blank' | 'load';
  title: string;
  description: string;
  icon: string;
}

interface LauncherProps {
  onLaunchKrebsDemo: () => void;
  onLaunchAdamChemDemo: () => void;
  onLaunchBlank: () => void;
  onFileLoad?: (loadedSpace: ZZSpace) => void;
}

export const Launcher: React.FC<LauncherProps> = ({ onLaunchKrebsDemo, onLaunchAdamChemDemo, onLaunchBlank }) => {
  const [selectedOption, setSelectedOption] = useState<LaunchOption['id'] | null>(null);
  const [showFileDialog, setShowFileDialog] = useState(false);

  const options: LaunchOption[] = [
    {
      id: 'adam_chem',
      title: "Adam's Chemistry Demo",
      description: 'Comprehensive biochemistry space with periodic table, Krebs cycle, protein databases, and journal references',
      icon: '⚛️'
    },
    {
      id: 'krebs',
      title: 'Simple Krebs Cycle Demo',
      description: 'Basic biochemistry demonstration showing the Krebs cycle with multi-dimensional connections',
      icon: '🧬'
    },
    {
      id: 'blank',
      title: 'Blank ZigZag Space',
      description: 'Start with an empty space containing only the home cell and standard dimensions (d.1, d.2, d.3)',
      icon: '📄'
    },
    {
      id: 'load',
      title: 'Load Z Directory',
      description: 'Load an original GzigZag file from a Z directory structure (Drag & drop Z folders)',
      icon: '📁'
    }
  ];

  const handleOptionClick = (optionId: LaunchOption['id']) => {
    setSelectedOption(optionId);
    if (optionId === 'load') {
      setShowFileDialog(true);
    }
  };

  const handleLaunch = () => {
    if (selectedOption === 'adam_chem') {
      onLaunchAdamChemDemo();
    } else if (selectedOption === 'krebs') {
      onLaunchKrebsDemo();
    } else if (selectedOption === 'blank') {
      onLaunchBlank();
    } else if (selectedOption === 'load') {
      setShowFileDialog(true);
    }
  };

  const handleFileLoad = async (files: FileList) => {
    try {
      // TODO: Implement actual file loading from the core module
      // For now, create a blank space as a placeholder
      console.log('Loading files:', Array.from(files).map(f => f.name));
      
      // This would be replaced with actual file loading logic
      // const loadedSpace = await loadGZZFiles(files);
      
      // For now, create a demo space to show that it works
      onLaunchAdamChemDemo(); // Temporary - replace with onFileLoad(loadedSpace)
    } catch (error) {
      console.error('Failed to load files:', error);
    }
  };

  return (
    <div className="launcher-container">
      <div className="launcher-box">
        <header className="launcher-header">
          <h1 className="launcher-title">GZigZag Web</h1>
          <p className="launcher-subtitle">
            Ted Nelson's ZigZag Structure - Modern Web Implementation
          </p>
        </header>

        <div className="launcher-options">
          {options.map(option => (
            <div
              key={option.id}
              className={`launcher-option ${selectedOption === option.id ? 'selected' : ''}`}
              onClick={() => handleOptionClick(option.id)}
            >
              <div className="launcher-option-icon">{option.icon}</div>
              <div className="launcher-option-content">
                <h3 className="launcher-option-title">{option.title}</h3>
                <p className="launcher-option-description">{option.description}</p>
              </div>
              {selectedOption === option.id && option.id !== 'load' && (
                <div className="launcher-checkmark">✓</div>
              )}
            </div>
          ))}
        </div>

        {selectedOption && (
          <button className="launcher-button" onClick={handleLaunch}>
            {selectedOption === 'load' ? 'Browse Files' : 'Launch ZigZag'}
          </button>
        )}

        <footer className="launcher-footer">
          <p className="launcher-copyright">
            Original concept by Ted Nelson • Implementation by Adam Vials Moore
          </p>
          <p className="launcher-phase">Phase 3: Original GZZ Compatibility Mode</p>
        </footer>
      </div>

      {showFileDialog && (
        <FileLoadDialog
          onLoad={handleFileLoad}
          onClose={() => setShowFileDialog(false)}
        />
      )}
    </div>
  );
};
