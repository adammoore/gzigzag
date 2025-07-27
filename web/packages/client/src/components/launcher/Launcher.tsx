import React, { useState } from 'react';
import './Launcher.css';

interface LaunchOption {
  id: 'demo' | 'blank' | 'load';
  title: string;
  description: string;
  icon: string;
}

interface LauncherProps {
  onLaunch: (mode: 'demo' | 'blank') => void;
}

export const Launcher: React.FC<LauncherProps> = ({ onLaunch }) => {
  const [selectedOption, setSelectedOption] = useState<LaunchOption['id'] | null>(null);
  const [showFileDialog, setShowFileDialog] = useState(false);

  const options: LaunchOption[] = [
    {
      id: 'demo',
      title: 'Krebs Cycle Demo',
      description: 'Start with the biochemistry demonstration showing the Krebs cycle with multi-dimensional connections',
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
      description: 'Load an original GzigZag file from a Z directory structure (Phase 3 feature - coming soon)',
      icon: '📁'
    }
  ];

  const handleOptionClick = (optionId: LaunchOption['id']) => {
    if (optionId === 'load') {
      setShowFileDialog(true);
    } else {
      setSelectedOption(optionId);
    }
  };

  const handleLaunch = () => {
    if (selectedOption && selectedOption !== 'load') {
      onLaunch(selectedOption);
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
              className={`launcher-option ${selectedOption === option.id ? 'selected' : ''} ${option.id === 'load' ? 'disabled' : ''}`}
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

        {selectedOption && selectedOption !== 'load' && (
          <button className="launcher-button" onClick={handleLaunch}>
            Launch ZigZag
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
        <div className="launcher-modal">
          <div className="launcher-modal-content">
            <h2>Load Z Directory</h2>
            <p>This feature will allow loading original GzigZag file structures.</p>
            <p className="launcher-coming-soon">Coming in Phase 3A.1</p>
            <div className="launcher-modal-buttons">
              <button onClick={() => setShowFileDialog(false)} className="launcher-cancel-button">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
