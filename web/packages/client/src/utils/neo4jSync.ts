import { ZZSpace } from '@zigzag/core';

/**
 * Automatically sync a space structure to Neo4j for graph visualization and analysis
 */
export async function syncSpaceToNeo4j(spaceId: string, space: ZZSpace): Promise<boolean> {
  try {
    console.log(`Syncing space ${spaceId} to Neo4j Aura...`);

    // Serialize the space to the format expected by Neo4j
    const spaceData = space.toSerializableFormat();
    console.log(`Space data prepared: ${Object.keys(spaceData.cells || {}).length} cells, ${(spaceData.dimensions || []).length} dimensions`);

    // Send to server for Neo4j synchronization (no auth required)
    // Handle both development and production URLs
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? '' // In production, use relative URLs
      : 'http://localhost:3001'; // In development, use explicit server URL
      
    const url = `${baseUrl}/api/spaces/${spaceId}/sync-neo4j`;
    console.log(`Sending request to: ${url}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ spaceData })
    });

    console.log(`Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      console.error(`Neo4j sync failed with status ${response.status}: ${response.statusText}`);
      
      // Try to get error details, but handle empty responses
      try {
        const errorText = await response.text();
        if (errorText) {
          const error = JSON.parse(errorText);
          console.error('Neo4j sync error details:', error);
        } else {
          console.error('Empty error response from server');
        }
      } catch (parseError) {
        console.error('Could not parse error response');
      }
      return false;
    }

    // Handle successful response - check if it has content
    const responseText = await response.text();
    if (!responseText) {
      console.error('Empty success response from Neo4j sync');
      return false;
    }

    try {
      const result = JSON.parse(responseText);
      console.log('✅ Space synced to Neo4j:', result);
      return true;
    } catch (parseError) {
      console.error('Could not parse success response:', responseText);
      return false;
    }
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.log('Neo4j sync skipped: Server not available (running in client-only mode)');
      return false;
    }
    console.error('Error syncing space to Neo4j:', error);
    return false;
  }
}

/**
 * Get Neo4j visualization data for a space
 */
export async function getSpaceVisualization(spaceId: string): Promise<any> {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No auth token found');
    }

    const response = await fetch(`/api/spaces/${spaceId}/neo4j-visualization`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to get visualization: ${error.error}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting Neo4j visualization:', error);
    throw error;
  }
}

/**
 * Set a space as the production space (clears all other data from Neo4j)
 * Use this for the main space you want visualized in Neo4j Aura
 */
export async function setProductionSpace(spaceId: string, space: ZZSpace): Promise<boolean> {
  try {
    console.log(`Setting ${spaceId} as production space in Neo4j Aura...`);

    const spaceData = space.toSerializableFormat();
    console.log(`Production space data: ${Object.keys(spaceData.cells || {}).length} cells, ${(spaceData.dimensions || []).length} dimensions`);

    const baseUrl = process.env.NODE_ENV === 'production' 
      ? '' // In production, use relative URLs
      : 'http://localhost:3001'; // In development, use explicit server URL
      
    const url = `${baseUrl}/api/neo4j/set-production-space`;
    console.log(`Setting production space via: ${url}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ spaceId, spaceData })
    });

    console.log(`Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      console.error(`Production space sync failed with status ${response.status}: ${response.statusText}`);
      return false;
    }

    const result = await response.json();
    console.log('✅ Production space set:', result);
    
    // Mark as production space in localStorage
    localStorage.setItem('neo4j_production_space', spaceId);
    
    return true;
  } catch (error) {
    console.error('Error setting production space:', error);
    return false;
  }
}

/**
 * Clear all data from Neo4j Aura
 */
export async function clearNeo4jData(): Promise<boolean> {
  try {
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? '' 
      : 'http://localhost:3001';
      
    const response = await fetch(`${baseUrl}/api/neo4j/clear-all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`Clear failed with status ${response.status}`);
      return false;
    }

    const result = await response.json();
    console.log('✅ Neo4j data cleared:', result);
    localStorage.removeItem('neo4j_production_space');
    return true;
  } catch (error) {
    console.error('Error clearing Neo4j data:', error);
    return false;
  }
}

/**
 * Auto-sync a space to Neo4j when it's first created or significantly modified
 * This should be called after creating a blank space or loading a space
 */
export async function autoSyncSpace(spaceId: string, space: ZZSpace): Promise<void> {
  // Only auto-sync if we're in a browser environment with server connection
  if (typeof window === 'undefined') return;
  
  try {
    // Check if this space has been synced recently by storing sync timestamps
    const lastSyncKey = `neo4j_sync_${spaceId}`;
    const lastSync = localStorage.getItem(lastSyncKey);
    const now = Date.now();
    
    // Only sync if it hasn't been synced in the last 5 minutes
    if (lastSync && (now - parseInt(lastSync)) < 5 * 60 * 1000) {
      console.log('Space recently synced to Neo4j, skipping auto-sync');
      return;
    }

    const success = await syncSpaceToNeo4j(spaceId, space);
    if (success) {
      localStorage.setItem(lastSyncKey, now.toString());
      console.log(`🔄 Auto-synced space ${spaceId} to Neo4j`);
    }
  } catch (error) {
    console.warn('Auto-sync to Neo4j failed (non-critical):', error);
  }
}