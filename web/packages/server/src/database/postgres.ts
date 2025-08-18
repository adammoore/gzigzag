import { Pool, PoolClient } from 'pg';
import { logger } from '../utils/logger';

let pool: Pool;

export async function initPostgres(): Promise<void> {
  const connectionString = process.env.DATABASE_URL || 
    'postgresql://zigzag_user:zigzag_password@localhost:5432/zigzag';
  
  pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    logger.info('✅ PostgreSQL connected successfully');
  } catch (error) {
    logger.error('❌ PostgreSQL connection failed:', error);
    throw error;
  }
}

export async function closePostgres(): Promise<void> {
  if (pool) {
    await pool.end();
    logger.info('PostgreSQL connection closed');
  }
}

export function getPool(): Pool {
  if (!pool) {
    throw new Error('PostgreSQL pool not initialized');
  }
  return pool;
}

export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export const queries = {
  async getUserByEmail(email: string) {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email]
    );
    return result.rows[0];
  },
  
  async getUserById(id: string) {
    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1 AND is_active = true',
      [id]
    );
    return result.rows[0];
  },
  
  async createUser(email: string, username: string, passwordHash: string) {
    const result = await pool.query(
      `INSERT INTO users (email, username, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, email, username, created_at`,
      [email, username, passwordHash]
    );
    return result.rows[0];
  },
  
  async createSpace(name: string, ownerId: string, description?: string) {
    const result = await pool.query(
      `INSERT INTO spaces (name, owner_id, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, ownerId, description]
    );
    return result.rows[0];
  },
  
  async getSpacesByUser(userId: string) {
    const result = await pool.query(
      `SELECT s.* FROM spaces s
       LEFT JOIN space_collaborators sc ON s.id = sc.space_id
       WHERE s.owner_id = $1 OR sc.user_id = $1
       ORDER BY s.updated_at DESC`,
      [userId]
    );
    return result.rows;
  },
  
  async createCell(spaceId: string, textContent: string, createdBy: string) {
    const result = await pool.query(
      `INSERT INTO cells (space_id, text_content, created_by)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [spaceId, textContent, createdBy]
    );
    return result.rows[0];
  },
  
  async updateCell(cellId: string, textContent: string, userId: string) {
    return withTransaction(async (client) => {
      const current = await client.query(
        'SELECT * FROM cells WHERE id = $1',
        [cellId]
      );
      
      if (current.rows.length === 0) {
        throw new Error('Cell not found');
      }
      
      const cell = current.rows[0];
      
      await client.query(
        `INSERT INTO cell_history (cell_id, text_content, metadata, version, changed_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [cellId, cell.text_content, cell.metadata, cell.version, userId]
      );
      
      const result = await client.query(
        `UPDATE cells 
         SET text_content = $1, version = version + 1, updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [textContent, cellId]
      );
      
      return result.rows[0];
    });
  },
  
  async getCellsBySpace(spaceId: string) {
    const result = await pool.query(
      'SELECT * FROM cells WHERE space_id = $1 ORDER BY created_at',
      [spaceId]
    );
    return result.rows;
  },
};
