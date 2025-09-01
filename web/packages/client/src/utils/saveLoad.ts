import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { ZZSpace } from '@zigzag/core';

// Save ZigZag space to ZIP file
export const saveSpaceAsZip = async (space: ZZSpace, spaceName: string = 'zigzag-space') => {
  const zip = new JSZip();
  
  try {
    // Export space data
    const spaceData = {
      name: spaceName,
      cells: space.getAllCells().map(cell => ({
        id: cell.id,
        text: cell.text,
        metadata: cell.metadata || {}
      })),
      connections: space.getAllConnections().map(conn => ({
        from: conn.from,
        to: conn.to,
        dimension: conn.dimension,
        metadata: conn.metadata || {}
      })),
      dimensions: space.getDimensions(),
      homeCell: space.getHomeCell()?.id,
      timestamp: new Date().toISOString(),
      version: '4.0.0'
    };
    
    // Add main data file
    zip.file('space.json', JSON.stringify(spaceData, null, 2));
    
    // Add metadata
    zip.file('metadata.txt', `ZigZag Space Export
Name: ${spaceName}
Created: ${spaceData.timestamp}
Cells: ${spaceData.cells.length}
Connections: ${spaceData.connections.length}
Dimensions: ${spaceData.dimensions.join(', ')}
Version: ${spaceData.version}
`);
    
    // Generate ZIP and download
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    saveAs(zipBlob, `${spaceName}-${new Date().toISOString().split('T')[0]}.zip`);
    
    console.log(`✅ Saved ZigZag space "${spaceName}" as ZIP file`);
    return true;
    
  } catch (error) {
    console.error('❌ Failed to save space:', error);
    return false;
  }
};

// Load ZigZag space from ZIP file
export const loadSpaceFromZip = async (file: File): Promise<any | null> => {
  try {
    const zip = await JSZip.loadAsync(file);
    
    // Check for space.json
    const spaceFile = zip.file('space.json');
    if (!spaceFile) {
      throw new Error('Invalid ZigZag file: no space.json found');
    }
    
    const spaceDataText = await spaceFile.async('text');
    const spaceData = JSON.parse(spaceDataText);
    
    // Validate data structure
    if (!spaceData.cells || !spaceData.connections || !spaceData.dimensions) {
      throw new Error('Invalid ZigZag data: missing required fields');
    }
    
    console.log(`✅ Loaded ZigZag space "${spaceData.name}" from ZIP file`);
    console.log(`   Cells: ${spaceData.cells.length}, Connections: ${spaceData.connections.length}`);
    
    return spaceData;
    
  } catch (error) {
    console.error('❌ Failed to load space:', error);
    return null;
  }
};

// Load ZigZag space from server (for multi-user functionality)
export const loadSpaceFromServer = async (spaceId: string): Promise<any | null> => {
  try {
    const response = await fetch(`/api/spaces/${spaceId}/export`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Server error: ${response.statusText}`);
    }
    
    const spaceData = await response.json();
    console.log(`✅ Loaded space "${spaceData.name}" from server`);
    
    return spaceData;
    
  } catch (error) {
    console.error('❌ Failed to load space from server:', error);
    return null;
  }
};

// Save ZigZag space to server  
export const saveSpaceToServer = async (space: ZZSpace, spaceName: string): Promise<boolean> => {
  try {
    const spaceData = {
      name: spaceName,
      cells: space.getAllCells().map(cell => ({
        id: cell.id,
        text: cell.text,
        metadata: cell.metadata || {},
        position: { x: 0, y: 0, z: 0 } // Will be calculated by server
      })),
      connections: space.getAllConnections().map(conn => ({
        from: conn.from,
        to: conn.to,
        dimension: conn.dimension,
        metadata: conn.metadata || {}
      }))
    };
    
    const response = await fetch('/api/spaces', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(spaceData)
    });
    
    if (!response.ok) {
      throw new Error(`Server error: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log(`✅ Saved space "${spaceName}" to server with ID: ${result.id}`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Failed to save space to server:', error);
    return false;
  }
};

// Import space data into current ZZSpace
export const importSpaceData = (space: ZZSpace, spaceData: any): boolean => {
  try {
    // Clear current space (optional - might want to merge instead)
    // space.clear();
    
    // Import cells
    for (const cellData of spaceData.cells) {
      const cell = space.createCell(cellData.text || '');
      if (cellData.metadata) {
        cell.metadata = cellData.metadata;
      }
    }
    
    // Import connections
    for (const connData of spaceData.connections) {
      const fromCell = space.getCell(connData.from);
      const toCell = space.getCell(connData.to);
      
      if (fromCell && toCell) {
        fromCell.connect(connData.dimension, toCell);
      }
    }
    
    console.log(`✅ Imported ${spaceData.cells.length} cells and ${spaceData.connections.length} connections`);
    return true;
    
  } catch (error) {
    console.error('❌ Failed to import space data:', error);
    return false;
  }
};