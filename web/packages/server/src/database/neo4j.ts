import neo4j, { Driver, Session } from 'neo4j-driver';
import { logger } from '../utils/logger';

let driver: Driver;

export async function initNeo4j(): Promise<void> {
  const uri = process.env.NEO4J_URI || 'neo4j://localhost:7687';
  const user = process.env.NEO4J_USER || 'neo4j';
  const password = process.env.NEO4J_PASSWORD;

  if (!password) {
    throw new Error('NEO4J_PASSWORD environment variable is not set');
  }

  try {
    driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
      maxConnectionPoolSize: 50,
      connectionAcquisitionTimeout: 60000,
      logging: {
        level: 'info',
        logger: (level, message) => {
          logger.debug(`Neo4j [${level}]: ${message}`);
        },
      },
    });

    // Test connection
    const session = driver.session();
    await session.run('RETURN 1');
    await session.close();
    
    logger.info('✅ Neo4j connected successfully');
    
    // Create constraints and indexes
    await createConstraints();
  } catch (error) {
    logger.error('❌ Neo4j connection failed:', error);
    throw error;
  }
}

export async function closeNeo4j(): Promise<void> {
  if (driver) {
    await driver.close();
    logger.info('Neo4j connection closed');
  }
}

export function getDriver(): Driver {
  if (!driver) {
    throw new Error('Neo4j driver not initialized');
  }
  return driver;
}

// Create constraints and indexes for performance
async function createConstraints(): Promise<void> {
  const session = driver.session();
  try {
    // Unique constraint on Cell id
    await session.run(`
      CREATE CONSTRAINT cell_id_unique IF NOT EXISTS
      FOR (c:Cell) REQUIRE c.id IS UNIQUE
    `);
    
    // Index on space_id for efficient filtering
    await session.run(`
      CREATE INDEX cell_space_index IF NOT EXISTS
      FOR (c:Cell) ON (c.space_id)
    `);
    
    // Index on dimension relationships
    await session.run(`
      CREATE INDEX connection_dimension_index IF NOT EXISTS
      FOR ()-[r:CONNECTED]-() ON (r.dimension)
    `);
    
    logger.info('Neo4j constraints and indexes created');
  } catch (error) {
    logger.error('Error creating Neo4j constraints:', error);
  } finally {
    await session.close();
  }
}

// Transaction helper
export async function withSession<T>(
  callback: (session: Session) => Promise<T>
): Promise<T> {
  const session = driver.session();
  try {
    return await callback(session);
  } finally {
    await session.close();
  }
}

// ZigZag-specific Neo4j operations
export const graph = {
  // Create a cell node
  async createCellNode(cellId: string, spaceId: string): Promise<void> {
    await withSession(async (session) => {
      await session.run(
        `
        CREATE (c:Cell {
          id: $cellId,
          space_id: $spaceId,
          created_at: datetime()
        })
        `,
        { cellId, spaceId }
      );
    });
  },
  
  // Delete a cell node and all its connections
  async deleteCellNode(cellId: string): Promise<void> {
    await withSession(async (session) => {
      await session.run(
        'MATCH (c:Cell {id: $cellId}) DETACH DELETE c',
        { cellId }
      );
    });
  },
  
  // Connect two cells in a dimension
  async connectCells(
    fromCellId: string,
    toCellId: string,
    dimension: string,
    direction: 'positive' | 'negative' = 'positive'
  ): Promise<void> {
    await withSession(async (session) => {
      await session.run(
        `
        MATCH (from:Cell {id: $fromCellId})
        MATCH (to:Cell {id: $toCellId})
        CREATE (from)-[:CONNECTED {
          dimension: $dimension,
          direction: $direction,
          created_at: datetime()
        }]->(to)
        `,
        { fromCellId, toCellId, dimension, direction }
      );
    });
  },
  
  // Disconnect cells in a dimension
  async disconnectCells(
    fromCellId: string,
    toCellId: string,
    dimension: string
  ): Promise<void> {
    await withSession(async (session) => {
      await session.run(
        `
        MATCH (from:Cell {id: $fromCellId})
          -[r:CONNECTED {dimension: $dimension}]->
          (to:Cell {id: $toCellId})
        DELETE r
        `,
        { fromCellId, toCellId, dimension }
      );
    });
  },
  
  // Get connections for a cell in a dimension
  async getCellConnections(
    cellId: string,
    dimension: string,
    direction?: 'positive' | 'negative'
  ): Promise<any[]> {
    return withSession(async (session) => {
      const query = direction
        ? `
          MATCH (c:Cell {id: $cellId})
            -[r:CONNECTED {dimension: $dimension, direction: $direction}]->
            (connected:Cell)
          RETURN connected.id as id, r.direction as direction
          ORDER BY r.created_at
          `
        : `
          MATCH (c:Cell {id: $cellId})
            -[r:CONNECTED {dimension: $dimension}]-
            (connected:Cell)
          RETURN connected.id as id, r.direction as direction, 
                 (c)-[:CONNECTED]->(connected) as isOutgoing
          ORDER BY r.created_at
          `;
      
      const result = await session.run(query, { cellId, dimension, direction });
      return result.records.map(record => record.toObject());
    });
  },
  
  // Get all connections for a cell
  async getAllCellConnections(cellId: string): Promise<any[]> {
    return withSession(async (session) => {
      const result = await session.run(
        `
        MATCH (c:Cell {id: $cellId})-[r:CONNECTED]-(connected:Cell)
        RETURN connected.id as id, 
               r.dimension as dimension,
               r.direction as direction,
               (c)-[:CONNECTED]->(connected) as isOutgoing
        ORDER BY r.dimension, r.created_at
        `,
        { cellId }
      );
      return result.records.map(record => record.toObject());
    });
  },
  
  // Get all cells in a space with their connections
  async getSpaceGraph(spaceId: string): Promise<any> {
    return withSession(async (session) => {
      const result = await session.run(
        `
        MATCH (c:Cell {space_id: $spaceId})
        OPTIONAL MATCH (c)-[r:CONNECTED]-(connected:Cell {space_id: $spaceId})
        WITH c, collect(DISTINCT {
          id: connected.id,
          dimension: r.dimension,
          direction: r.direction,
          isOutgoing: (c)-[:CONNECTED]->(connected)
        }) as connections
        RETURN c.id as id, connections
        `,
        { spaceId }
      );
      
      const nodes = new Map();
      result.records.forEach(record => {
        const id = record.get('id');
        const connections = record.get('connections')
          .filter((conn: any) => conn.id !== null);
        nodes.set(id, connections);
      });
      
      return Object.fromEntries(nodes);
    });
  },
  
  // Navigate along a dimension (ZigZag traversal)
  async traverseDimension(
    startCellId: string,
    dimension: string,
    direction: 'positive' | 'negative',
    maxSteps: number = 10
  ): Promise<string[]> {
    return withSession(async (session) => {
      const result = await session.run(
        `
        MATCH path = (start:Cell {id: $startCellId})
          -[:CONNECTED* 1..${maxSteps} {dimension: $dimension, direction: $direction}]->
          (end:Cell)
        RETURN [n in nodes(path) | n.id] as path
        ORDER BY length(path) DESC
        LIMIT 1
        `,
        { startCellId, dimension, direction }
      );
      
      if (result.records.length === 0) {
        return [startCellId];
      }
      
      return result.records[0].get('path');
    });
  },
  
  // Find paths between cells
  async findPath(
    fromCellId: string,
    toCellId: string,
    maxLength: number = 5
  ): Promise<any[]> {
    return withSession(async (session) => {
      const result = await session.run(
        `
        MATCH path = shortestPath(
          (from:Cell {id: $fromCellId})
          -[:CONNECTED*..${maxLength}]-
          (to:Cell {id: $toCellId})
        )
        RETURN [n in nodes(path) | n.id] as nodes,
               [r in relationships(path) | {
                 dimension: r.dimension,
                 direction: r.direction
               }] as edges
        `,
        { fromCellId, toCellId }
      );
      
      return result.records.map(record => ({
        nodes: record.get('nodes'),
        edges: record.get('edges'),
      }));
    });
  },
  
  // Clone connections when duplicating cells
  async cloneConnections(
    oldCellId: string,
    newCellId: string,
    spaceId: string
  ): Promise<void> {
    await withSession(async (session) => {
      // First create the new cell node
      await session.run(
        `
        CREATE (c:Cell {
          id: $newCellId,
          space_id: $spaceId,
          created_at: datetime()
        })
        `,
        { newCellId, spaceId }
      );
      
      // Then clone all connections
      await session.run(
        `
        MATCH (old:Cell {id: $oldCellId})-[r:CONNECTED]-(connected:Cell)
        MATCH (new:Cell {id: $newCellId})
        FOREACH (ignore IN CASE WHEN (old)-[:CONNECTED]->(connected) THEN [1] ELSE [] END |
          CREATE (new)-[:CONNECTED {
            dimension: r.dimension,
            direction: r.direction,
            created_at: datetime()
          }]->(connected)
        )
        FOREACH (ignore IN CASE WHEN (connected)-[:CONNECTED]->(old) THEN [1] ELSE [] END |
          CREATE (connected)-[:CONNECTED {
            dimension: r.dimension,
            direction: r.direction,
            created_at: datetime()
          }]->(new)
        )
        `,
        { oldCellId, newCellId }
      );
    });
  },
  
  // Get dimension statistics for a space
  async getDimensionStats(spaceId: string): Promise<any[]> {
    return withSession(async (session) => {
      const result = await session.run(
        `
        MATCH (c:Cell {space_id: $spaceId})-[r:CONNECTED]-(connected:Cell)
        RETURN r.dimension as dimension,
               count(DISTINCT r) as connectionCount,
               count(DISTINCT c) as cellCount
        ORDER BY connectionCount DESC
        `,
        { spaceId }
      );
      
      return result.records.map(record => record.toObject());
    });
  },
  
  // Bulk operations for import/export
  async bulkCreateNodes(cells: Array<{ id: string; spaceId: string }>): Promise<void> {
    await withSession(async (session) => {
      await session.run(
        `
        UNWIND $cells as cell
        CREATE (c:Cell {
          id: cell.id,
          space_id: cell.spaceId,
          created_at: datetime()
        })
        `,
        { cells }
      );
    });
  },
  
  async bulkCreateConnections(
    connections: Array<{
      from: string;
      to: string;
      dimension: string;
      direction: string;
    }>
  ): Promise<void> {
    await withSession(async (session) => {
      await session.run(
        `
        UNWIND $connections as conn
        MATCH (from:Cell {id: conn.from})
        MATCH (to:Cell {id: conn.to})
        CREATE (from)-[:CONNECTED {
          dimension: conn.dimension,
          direction: conn.direction,
          created_at: datetime()
        }]->(to)
        `,
        { connections }
      );
    });
  },
};