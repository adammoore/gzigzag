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
