import neo4j, { Driver, Session } from 'neo4j-driver';
import { logger } from '../utils/logger';

let driver: Driver | null = null;

export async function initNeo4j(): Promise<void> {
  const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
  const user = process.env.NEO4J_USER || 'neo4j';
  const password = process.env.NEO4J_PASSWORD || 'zigzag_password';

  try {
    driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
    const session = driver.session();
    await session.run('RETURN 1');
    await session.close();
    logger.info('✅ Neo4j connected successfully');
    
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
  const session = driver.session();
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
  async createCellNode(cellId: string, spaceId: string): Promise<void> {
    if (!driver) return;
    const session = driver.session();
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
    const session = driver.session();
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
    const session = driver.session();
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
    const session = driver.session();
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
    const session = driver.session();
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
    const session = driver.session();
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
    const session = driver.session();
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
    const session = driver.session();
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
    const session = driver.session();
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
    const session = driver.session();
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
};
