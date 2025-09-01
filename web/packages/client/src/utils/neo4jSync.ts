import { ZZSpace } from '@zigzag/core';

/**
 * Automatically sync a space structure to Neo4j for graph visualization and analysis
 */
export async function syncSpaceToNeo4j(spaceId: string, space: ZZSpace): Promise<boolean> {
  try {
    // Get auth token from localStorage (assuming it's stored there)
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('No auth token found - cannot sync to Neo4j');
      return false;
    }

    // Serialize the space to the format expected by Neo4j
    const spaceData = space.toSerializableFormat();

    // Send to server for Neo4j synchronization
    const response = await fetch(`/api/spaces/${spaceId}/sync-neo4j`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ spaceData })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Failed to sync space to Neo4j:', error);
      return false;
    }

    const result = await response.json();
    console.log('✅ Space synced to Neo4j:', result);
    return true;
  } catch (error) {
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