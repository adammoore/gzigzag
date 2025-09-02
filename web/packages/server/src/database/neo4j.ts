import neo4j, { Driver, Session } from 'neo4j-driver';
import { logger } from '../utils/logger';

let driver: Driver | null = null;

// Helper to get session with correct database
function getSession() {
  if (!driver) throw new Error('Neo4j driver not initialized');
  const database = process.env.NEO4J_DATABASE || 'neo4j';
  return driver.session({ database });
}

export async function initNeo4j(): Promise<void> {
  const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
  const user = process.env.NEO4J_USERNAME || process.env.NEO4J_USER || 'neo4j';
  const password = process.env.NEO4J_PASSWORD || 'zigzag_password';
  const database = process.env.NEO4J_DATABASE || 'neo4j';

  try {
    driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
    const session = getSession();
    await session.run('RETURN 1');
    await session.close();
    logger.info(`✅ Neo4j connected successfully to ${uri} (database: ${database})`);
    
    // Create constraints
    await createConstraints();
  } catch (error) {
    logger.error('❌ Neo4j connection failed:', error);
    logger.warn('Continuing without Neo4j - graph features disabled');
    driver = null;
  }
}

async function createConstraints(): Promise<void> {
  if (!driver) return;
  const session = getSession();
  try {
    await session.run(
      `CREATE CONSTRAINT cell_id_unique IF NOT EXISTS
       FOR (c:Cell) REQUIRE c.id IS UNIQUE`
    );
    await session.run(
      `CREATE INDEX cell_space_index IF NOT EXISTS
       FOR (c:Cell) ON (c.space_id)`
    );
  } catch (error) {
    logger.error('Error creating Neo4j constraints:', error);
  } finally {
    await session.close();
  }
}

export async function closeNeo4j(): Promise<void> {
  if (driver) {
    await driver.close();
    logger.info('Neo4j connection closed');
  }
}

export const graph = {
  // Clear all data from Neo4j (for production space management)
  async clearAllData(): Promise<void> {
    if (!driver) {
      logger.warn('Neo4j driver not initialized - skipping clear');
      return;
    }
    
    const session = getSession();
    
    try {
      console.log('🧹 Clearing ALL data from Neo4j Aura...');
      
      await session.executeWrite(async tx => {
        // Delete all nodes and relationships
        const result = await tx.run('MATCH (n) DETACH DELETE n');
        const deletedCount = result.summary.counters.updates().nodesDeleted;
        const relationshipsDeleted = result.summary.counters.updates().relationshipsDeleted;
        
        console.log(`  Deleted ${deletedCount} nodes and ${relationshipsDeleted} relationships`);
      });

      logger.info('✅ All Neo4j data cleared successfully');
    } catch (error) {
      logger.error('❌ Failed to clear Neo4j data:', error);
      throw error;
    } finally {
      await session.close();
    }
  },

  async createCellNode(cellId: string, spaceId: string): Promise<void> {
    if (!driver) return;
    const session = getSession();
    try {
      await session.run(
        'CREATE (c:Cell {id: $cellId, space_id: $spaceId, created_at: datetime()})',
        { cellId, spaceId }
      );
    } finally {
      await session.close();
    }
  },
  
  async deleteCellNode(cellId: string): Promise<void> {
    if (!driver) return;
    const session = getSession();
    try {
      await session.run(
        'MATCH (c:Cell {id: $cellId}) DETACH DELETE c',
        { cellId }
      );
    } finally {
      await session.close();
    }
  },
  
  async connectCells(fromId: string, toId: string, dimension: string, direction: string = 'positive'): Promise<void> {
    if (!driver) return;
    const session = getSession();
    try {
      await session.run(
        `MATCH (from:Cell {id: $fromId}), (to:Cell {id: $toId})
         CREATE (from)-[:CONNECTED {dimension: $dimension, direction: $direction, created_at: datetime()}]->(to)`,
        { fromId, toId, dimension, direction }
      );
    } finally {
      await session.close();
    }
  },
  
  async disconnectCells(fromId: string, toId: string, dimension: string): Promise<void> {
    if (!driver) return;
    const session = getSession();
    try {
      await session.run(
        `MATCH (from:Cell {id: $fromId})-[r:CONNECTED {dimension: $dimension}]->(to:Cell {id: $toId})
         DELETE r`,
        { fromId, toId, dimension }
      );
    } finally {
      await session.close();
    }
  },
  
  async getAllCellConnections(cellId: string): Promise<any[]> {
    if (!driver) return [];
    const session = getSession();
    try {
      const result = await session.run(
        `MATCH (c:Cell {id: $cellId})-[r:CONNECTED]-(connected:Cell)
         RETURN connected.id as id, r.dimension as dimension, r.direction as direction`,
        { cellId }
      );
      return result.records.map(record => record.toObject());
    } finally {
      await session.close();
    }
  },

  async getCellConnections(cellId: string, dimension?: string): Promise<any[]> {
    if (!driver) return [];
    const session = getSession();
    try {
      const query = dimension
        ? `MATCH (c:Cell {id: $cellId})-[r:CONNECTED {dimension: $dimension}]-(connected:Cell)
           RETURN connected.id as id, r.dimension as dimension, r.direction as direction`
        : `MATCH (c:Cell {id: $cellId})-[r:CONNECTED]-(connected:Cell)
           RETURN connected.id as id, r.dimension as dimension, r.direction as direction`;
      
      const result = await session.run(query, { cellId, dimension });
      return result.records.map(record => record.toObject());
    } finally {
      await session.close();
    }
  },

  async traverseDimension(cellId: string, dimension: string, direction: string = 'positive', maxSteps: number = 10): Promise<any[]> {
    if (!driver) return [];
    const session = getSession();
    try {
      const result = await session.run(
        `MATCH path = (start:Cell {id: $cellId})
         -[r:CONNECTED*1..$maxSteps {dimension: $dimension, direction: $direction}]->
         (end:Cell)
         RETURN [node IN nodes(path) | node.id] as path_ids, length(path) as depth`,
        { cellId, dimension, direction, maxSteps }
      );
      return result.records.map(record => record.toObject());
    } finally {
      await session.close();
    }
  },

  async findPath(fromCellId: string, toCellId: string, maxLength: number = 10): Promise<any[]> {
    if (!driver) return [];
    const session = getSession();
    try {
      const result = await session.run(
        `MATCH path = allShortestPaths((start:Cell {id: $fromCellId})
         -[r:CONNECTED*1..$maxLength]-(end:Cell {id: $toCellId}))
         RETURN [node IN nodes(path) | node.id] as path_ids, 
                [rel IN relationships(path) | {dimension: rel.dimension, direction: rel.direction}] as relationships,
                length(path) as depth`,
        { fromCellId, toCellId, maxLength }
      );
      return result.records.map(record => record.toObject());
    } finally {
      await session.close();
    }
  },

  async getDimensionStats(spaceId: string): Promise<any> {
    if (!driver) return {};
    const session = getSession();
    try {
      const result = await session.run(
        `MATCH (c:Cell {space_id: $spaceId})-[r:CONNECTED]-()
         RETURN r.dimension as dimension, count(r) as count
         ORDER BY count DESC`,
        { spaceId }
      );
      const stats = result.records.map(record => record.toObject());
      return {
        dimensions: stats,
        total_connections: stats.reduce((sum, s) => sum + s.count, 0)
      };
    } finally {
      await session.close();
    }
  },

  async getSpaceGraph(spaceId: string): Promise<any> {
    if (!driver) return { nodes: [], edges: [] };
    const session = getSession();
    try {
      const result = await session.run(
        `MATCH (c:Cell {space_id: $spaceId})
         OPTIONAL MATCH (c)-[r:CONNECTED]->(connected:Cell {space_id: $spaceId})
         RETURN c.id as id, 
                collect({
                  target: connected.id, 
                  dimension: r.dimension, 
                  direction: r.direction
                }) as connections`,
        { spaceId }
      );
      
      const nodes = result.records.map(record => ({
        id: record.get('id'),
        connections: record.get('connections').filter((c: any) => c.target)
      }));
      
      const edges = nodes.flatMap(node => 
        node.connections.map((conn: any) => ({
          from: node.id,
          to: conn.target,
          dimension: conn.dimension,
          direction: conn.direction
        }))
      );
      
      return { nodes, edges };
    } finally {
      await session.close();
    }
  },

  // Sync an entire space structure to Neo4j
  async syncSpaceToNeo4j(spaceId: string, spaceData: any): Promise<void> {
    if (!driver) {
      logger.warn('Neo4j driver not initialized - skipping sync');
      return;
    }
    
    const session = getSession();
    
    try {
      // Log incoming data for debugging
      console.log('🔍 Neo4j Sync Debug:');
      console.log(`  Space ID: ${spaceId}`);
      console.log(`  Space Data Keys: ${Object.keys(spaceData || {})}`);
      console.log(`  Cells Count: ${Object.keys(spaceData.cells || {}).length}`);
      console.log(`  Dimensions: ${JSON.stringify(spaceData.dimensions || [])}`);
      
      if (spaceData.cells) {
        console.log(`  Sample cell data:`, Object.entries(spaceData.cells).slice(0, 3));
      }
      
      // Start a transaction for atomic operations
      await session.executeWrite(async tx => {
        // First, clear existing space data
        console.log(`🧹 Clearing existing data for space ${spaceId}`);
        const deleteResult = await tx.run(
          'MATCH (c:Cell {space_id: $spaceId}) DETACH DELETE c',
          { spaceId }
        );
        console.log(`  Cleared ${deleteResult.summary.counters.updates().nodesDeleted} nodes`);

        // Clear existing metadata
        await tx.run(
          'MATCH (s:SpaceMetadata {space_id: $spaceId}) DELETE s',
          { spaceId }
        );

        let cellsCreated = 0;
        let connectionsCreated = 0;

        // Create all cells first
        console.log(`📦 Creating cells...`);
        for (const [cellId, cellData] of Object.entries(spaceData.cells || {})) {
          const text = (cellData as any).text || '';
          console.log(`  Creating cell ${cellId}: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
          
          const result = await tx.run(
            `CREATE (c:Cell {
              id: $cellId, 
              space_id: $spaceId, 
              text: $text,
              created_at: datetime()
            })`,
            { 
              cellId, 
              spaceId,
              text
            }
          );
          cellsCreated++;
        }
        console.log(`✅ Created ${cellsCreated} cells`);

        // Create all connections
        console.log(`🔗 Creating connections...`);
        for (const [cellId, cellData] of Object.entries(spaceData.cells || {})) {
          const connections = (cellData as any).connections || {};
          console.log(`  Cell ${cellId} has connections:`, Object.keys(connections));
          
          for (const [dimension, connectionData] of Object.entries(connections)) {
            const conn = connectionData as any;
            console.log(`    Dimension ${dimension}:`, conn);
            
            // Create positive connection
            if (conn.positive) {
              console.log(`      Creating positive: ${cellId} → ${conn.positive} (${dimension})`);
              try {
                await tx.run(
                  `MATCH (from:Cell {id: $fromId, space_id: $spaceId}), 
                         (to:Cell {id: $toId, space_id: $spaceId})
                   CREATE (from)-[:CONNECTED {
                     dimension: $dimension, 
                     direction: 'positive',
                     created_at: datetime()
                   }]->(to)`,
                  { fromId: cellId, toId: conn.positive, dimension, spaceId }
                );
                connectionsCreated++;
              } catch (error) {
                console.error(`      Failed to create positive connection: ${error}`);
              }
            }

            // Create negative connection  
            if (conn.negative) {
              console.log(`      Creating negative: ${cellId} → ${conn.negative} (${dimension})`);
              try {
                await tx.run(
                  `MATCH (from:Cell {id: $fromId, space_id: $spaceId}), 
                         (to:Cell {id: $toId, space_id: $spaceId})
                   CREATE (from)-[:CONNECTED {
                     dimension: $dimension, 
                     direction: 'negative', 
                     created_at: datetime()
                   }]->(to)`,
                  { fromId: cellId, toId: conn.negative, dimension, spaceId }
                );
                connectionsCreated++;
              } catch (error) {
                console.error(`      Failed to create negative connection: ${error}`);
              }
            }
          }
        }
        console.log(`✅ Created ${connectionsCreated} connections`);

        // Add metadata about the space sync
        console.log(`📊 Creating space metadata...`);
        await tx.run(
          `CREATE (s:SpaceMetadata {
            space_id: $spaceId,
            synced_at: datetime(),
            cell_count: $cellCount,
            dimension_count: $dimensionCount
          })`,
          { 
            spaceId,
            cellCount: Object.keys(spaceData.cells || {}).length,
            dimensionCount: (spaceData.dimensions || []).length
          }
        );
        console.log(`✅ Metadata created`);
        
        // Verify what was actually created
        const verifyResult = await tx.run(
          'MATCH (c:Cell {space_id: $spaceId}) RETURN count(c) as cellCount',
          { spaceId }
        );
        const actualCellCount = verifyResult.records[0]?.get('cellCount')?.toNumber() || 0;
        
        const verifyConnResult = await tx.run(
          'MATCH (:Cell {space_id: $spaceId})-[r:CONNECTED]-(:Cell {space_id: $spaceId}) RETURN count(r) as connCount',
          { spaceId }
        );
        const actualConnCount = verifyConnResult.records[0]?.get('connCount')?.toNumber() || 0;
        
        console.log(`🔍 Verification: ${actualCellCount} cells, ${actualConnCount} connections created in Neo4j`);
      });

      logger.info(`✅ Space ${spaceId} synced to Neo4j Aura successfully`);
    } catch (error) {
      logger.error(`❌ Failed to sync space ${spaceId} to Neo4j:`, error);
      console.error(`Full error details:`, error);
      throw error;
    } finally {
      await session.close();
    }
  },

  // Get complete space visualization data
  async getSpaceVisualization(spaceId: string): Promise<any> {
    if (!driver) return { nodes: [], edges: [], metadata: {} };
    const session = getSession();
    
    try {
      // Get space metadata
      const metaResult = await session.run(
        'MATCH (s:SpaceMetadata {space_id: $spaceId}) RETURN s',
        { spaceId }
      );

      // Get all nodes with their text content and connections
      const result = await session.run(
        `MATCH (c:Cell {space_id: $spaceId})
         OPTIONAL MATCH (c)-[r:CONNECTED]->(connected:Cell {space_id: $spaceId})
         RETURN c.id as id, 
                c.text as text,
                collect({
                  target: connected.id, 
                  dimension: r.dimension, 
                  direction: r.direction
                }) as connections`,
        { spaceId }
      );
      
      const nodes = result.records.map(record => ({
        id: record.get('id'),
        text: record.get('text') || '',
        connections: record.get('connections').filter((c: any) => c.target)
      }));
      
      const edges = nodes.flatMap(node => 
        node.connections.map((conn: any) => ({
          from: node.id,
          to: conn.target,
          dimension: conn.dimension,
          direction: conn.direction,
          label: `${conn.dimension}${conn.direction === 'positive' ? '+' : '-'}`
        }))
      );

      const metadata = metaResult.records.length > 0 ? 
        metaResult.records[0].get('s').properties : {};
      
      return { nodes, edges, metadata };
    } finally {
      await session.close();
    }
  },
};
