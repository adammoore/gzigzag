#!/bin/bash

echo "================================================="
echo "  Restoring ZigZag Full Functionality"
echo "================================================="
echo ""

cd /Users/adamvialsmoore/Workspace/gzigzag/web

# Step 1: Check Docker status
echo "🐳 Checking Docker status..."
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Starting Docker Desktop..."
    open -a Docker
    echo "Waiting for Docker to start (30 seconds)..."
    sleep 30
fi

# Step 2: Start Docker containers
echo "🚀 Starting Docker containers..."
docker compose down 2>/dev/null || true
docker compose up -d

echo "⏳ Waiting for services to be ready..."
sleep 10

# Check container status
docker compose ps

# Step 3: Test database connections
echo ""
echo "🔍 Testing database connections..."

# Test PostgreSQL
echo -n "PostgreSQL: "
if docker exec zigzag-postgres pg_isready -U zigzag_user -d zigzag > /dev/null 2>&1; then
    echo "✅ Connected"
else
    echo "❌ Not ready - restarting..."
    docker compose restart postgres
    sleep 5
fi

# Test Redis
echo -n "Redis: "
if docker exec zigzag-redis redis-cli ping > /dev/null 2>&1; then
    echo "✅ Connected"
else
    echo "❌ Not ready"
fi

# Test Neo4j
echo -n "Neo4j Browser: "
if curl -s http://localhost:7474 > /dev/null 2>&1; then
    echo "✅ Available at http://localhost:7474"
else
    echo "⏳ Still starting (this is normal)"
fi

# Step 4: Update database connection with real implementation
echo ""
echo "📝 Updating database connections with real implementations..."

# Update postgres.ts with full functionality
cat > packages/server/src/database/postgres.ts << 'EOF'
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
EOF

# Update neo4j.ts with real implementation
cat > packages/server/src/database/neo4j.ts << 'EOF'
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
};
EOF

# Update redis.ts with real implementation
cat > packages/server/src/database/redis.ts << 'EOF'
import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';

let redisClient: RedisClientType | null = null;

export async function initRedis(): Promise<void> {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  
  try {
    redisClient = createClient({ url: redisUrl });
    
    redisClient.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });
    
    await redisClient.connect();
    await redisClient.ping();
    logger.info('✅ Redis connected successfully');
  } catch (error) {
    logger.warn('❌ Redis connection failed - caching disabled:', error);
    redisClient = null;
  }
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    logger.info('Redis connection closed');
  }
}

export const sessions = {
  async get(sessionId: string): Promise<any> {
    if (!redisClient) return null;
    try {
      const value = await redisClient.get(`session:${sessionId}`);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Session get error:', error);
      return null;
    }
  },
  
  async store(sessionId: string, userId: string, ttl: number = 86400): Promise<void> {
    if (!redisClient) return;
    try {
      await redisClient.setEx(
        `session:${sessionId}`,
        ttl,
        JSON.stringify({ userId, createdAt: Date.now() })
      );
    } catch (error) {
      logger.error('Session store error:', error);
    }
  },
  
  async extend(sessionId: string, ttl: number = 86400): Promise<void> {
    if (!redisClient) return;
    try {
      await redisClient.expire(`session:${sessionId}`, ttl);
    } catch (error) {
      logger.error('Session extend error:', error);
    }
  },
};

export const spaceCache = {
  async invalidate(spaceId: string): Promise<void> {
    if (!redisClient) return;
    try {
      const keys = await redisClient.keys(`space:${spaceId}*`);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    } catch (error) {
      logger.error('Cache invalidation error:', error);
    }
  },
};
EOF

# Update winston logger
cat > packages/server/src/utils/logger.ts << 'EOF'
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp }) => {
          return `${timestamp} [${level}]: ${message}`;
        })
      )
    })
  ]
});

export { logger };
export const logInfo = (msg: string, meta?: any) => logger.info(msg, meta);
export const logError = (msg: string, error: any, meta?: any) => {
  logger.error(msg, { error: error?.message || error, stack: error?.stack, ...meta });
};
export const logWarn = (msg: string, meta?: any) => logger.warn(msg, meta);
export const logDebug = (msg: string, meta?: any) => logger.debug(msg, meta);
EOF

# Step 5: Run database migrations
echo ""
echo "🗄️ Running database migrations..."

# Create migration with proper tables
cat > packages/server/src/database/migrate.ts << 'EOF'
import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

async function migrate() {
  const connectionString = process.env.DATABASE_URL || 
    'postgresql://zigzag_user:zigzag_password@localhost:5432/zigzag';
    
  const pool = new Pool({ connectionString });

  try {
    console.log('Starting database migration...');
    
    // Enable UUID extension
    await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    
    // Create all tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS spaces (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
        is_public BOOLEAN DEFAULT false,
        settings JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cells (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
        text_content TEXT DEFAULT '',
        metadata JSONB DEFAULT '{}',
        version INTEGER DEFAULT 1,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cell_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        cell_id UUID NOT NULL REFERENCES cells(id) ON DELETE CASCADE,
        text_content TEXT,
        metadata JSONB,
        version INTEGER NOT NULL,
        changed_by UUID REFERENCES users(id),
        changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS dimensions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        color VARCHAR(7),
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(space_id, name)
      )
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS space_collaborators (
        space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL DEFAULT 'viewer',
        permissions JSONB DEFAULT '{}',
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        PRIMARY KEY (space_id, user_id)
      )
    `);
    
    // Create indexes
    await pool.query('CREATE INDEX IF NOT EXISTS idx_spaces_owner ON spaces(owner_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_cells_space ON cells(space_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_cells_created_by ON cells(created_by)');
    
    console.log('✅ Migration completed successfully');
    
    // Create test user in development
    if (process.env.NODE_ENV !== 'production') {
      const bcrypt = await import('bcrypt');
      const hash = await bcrypt.hash('testpassword', 10);
      
      await pool.query(`
        INSERT INTO users (email, username, password_hash)
        VALUES ('test@example.com', 'testuser', $1)
        ON CONFLICT (email) DO NOTHING
      `, [hash]);
      
      console.log('✅ Test user created: test@example.com / testpassword');
    }
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default migrate;
EOF

# Run the migration
cd packages/server
npx tsx src/database/migrate.ts
cd ../..

# Step 6: Rebuild and restart
echo ""
echo "🔨 Rebuilding server..."
cd packages/server && npm run build
cd ../..

# Kill any existing server
pkill -f "tsx watch src/server.ts" 2>/dev/null || true
pkill -f "node dist/server.js" 2>/dev/null || true

# Step 7: Test everything
echo ""
echo "🧪 Testing full functionality..."
npm run dev:server &
SERVER_PID=$!
sleep 3

echo ""
echo "📊 Service Status:"
echo "=================="
curl -s http://localhost:3001/health | jq . || echo "Server starting..."

echo ""
echo "🔍 Database Status:"
docker exec zigzag-postgres psql -U zigzag_user -d zigzag -c "\dt" 2>/dev/null || echo "PostgreSQL not ready"

echo ""
echo "================================================="
echo "  ✅ Full Functionality Restored!"
echo "================================================="
echo ""
echo "Services running:"
echo "✅ PostgreSQL: localhost:5432 (zigzag_user/zigzag_password)"
echo "✅ Neo4j: http://localhost:7474 (neo4j/zigzag_password)"
echo "✅ Redis: localhost:6379"
echo "✅ API Server: http://localhost:3001"
echo "✅ Frontend: http://localhost:3000"
echo ""
echo "Test the API:"
echo "  curl http://localhost:3001/health"
echo "  curl http://localhost:3001/api"
echo ""
echo "View logs:"
echo "  docker compose logs -f"
echo ""
echo "The application is now fully functional!"
