import React, { useState } from 'react';
import { ZZCell } from '@zigzag/core';

interface OriginalZZCellProps {
  cell: ZZCell;
  isActive: boolean;
  cursorType?: 'green' | 'blue';
  onClick: () => void;
  onTextChange?: (text: string) => void;
  showTooltip?: boolean;
  isMarked?: boolean;
}

export const OriginalZZCell: React.FC<OriginalZZCellProps> = ({
  cell,
  isActive,
  cursorType = 'blue',
  onClick,
  onTextChange,
  showTooltip = false,
  isMarked = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(cell.text);
  const [showTooltipState, setShowTooltipState] = useState(false);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
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

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isEditing) {
      onClick();
    }
  };

  const handleMouseEnter = () => {
    if (showTooltip) {
      setShowTooltipState(true);
    }
  };

  const handleMouseLeave = () => {
    setShowTooltipState(false);
  };

  // Determine cell class based on authentic GzigZag styling
  let cellClass = 'original-cell';
  
  // Apply authentic cell colors - simpler, more faithful to original
  const cellText = cell.text.toLowerCase();
  
  // Dimension cells (d.1, d.2, d.3, etc.) - always red
  if (cellText.match(/^d\.\d+$/) || cellText.match(/^[xyz]$/)) {
    cellClass += ' dimension-cell';
  }
  // Action/system cells - green background
  else if (cellText.includes('action') || cellText.includes('views') || cellText.includes('bindings') || cellText.includes('dimlists')) {
    cellClass += ' green-action';
  }
  // Stretch/vanishing view cells - light blue
  else if (cellText.includes('stretch') || cellText.includes('vanish')) {
    cellClass += ' stretch-cell';
  }
  // Regular content cells - keep white background, distinguish with border only
  
  // Apply cursor highlighting - make it much more prominent
  if (isActive) {
    if (cursorType === 'green') {
      cellClass += ' active-green';
    } else {
      cellClass += ' active-blue';
    }
  }
  
  // Apply marked cell styling
  if (isMarked) {
    cellClass += ' marked-cell';
  }

  return (
    <div
      className={cellClass}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      title={showTooltip ? `Cell ID: ${cell.id}` : undefined}
      style={{
        position: 'relative'
      }}
    >
      {isEditing ? (
        <input
          className="original-cell-input"
          value={editText}
          onChange={e => setEditText(e.target.value)}
          onKeyDown={handleKeyPress}
          onBlur={() => setIsEditing(false)}
          autoFocus
          size={Math.max(3, editText.length + 2)}
        />
      ) : (
        <span>
          {cell.text || '(empty)'}
        </span>
      )}
      
      {showTooltipState && showTooltip && (
        <div 
          className="original-tooltip"
          style={{
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: '2px',
            whiteSpace: 'nowrap'
          }}
        >
          ID: {cell.id.substring(0, 8)}...
          <br />
          Text: \"{cell.text || '(empty)'}\"
          <br />
          Double-click to edit
        </div>
      )}
    </div>
  );
};