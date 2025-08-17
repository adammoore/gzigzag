import dotenv from 'dotenv';
import { Pool } from 'pg';
import { logger } from '../utils/logger';

dotenv.config();

async function migrate() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    logger.info('Starting database migration...');

    // Begin transaction
    const client = await pool.connect();
    await client.query('BEGIN');

    try {
      // Enable UUID extension
      await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
      logger.info('✅ UUID extension enabled');

      // Create tables
      const tables = [
        {
          name: 'users',
          query: `
            CREATE TABLE IF NOT EXISTS users (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              email VARCHAR(255) UNIQUE NOT NULL,
              username VARCHAR(255) UNIQUE NOT NULL,
              password_hash VARCHAR(255) NOT NULL,
              is_active BOOLEAN DEFAULT true,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
          `,
        },
        {
          name: 'spaces',
          query: `
            CREATE TABLE IF NOT EXISTS spaces (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              name VARCHAR(255) NOT NULL,
              description TEXT,
              owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              is_public BOOLEAN DEFAULT false,
              settings JSONB DEFAULT '{}',
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
          `,
        },
        {
          name: 'space_collaborators',
          query: `
            CREATE TABLE IF NOT EXISTS space_collaborators (
              space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
              user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              role VARCHAR(50) NOT NULL DEFAULT 'viewer',
              permissions JSONB DEFAULT '{}',
              joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              PRIMARY KEY (space_id, user_id)
            )
          `,
        },
        {
          name: 'cells',
          query: `
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
          `,
        },
        {
          name: 'cell_history',
          query: `
            CREATE TABLE IF NOT EXISTS cell_history (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              cell_id UUID NOT NULL REFERENCES cells(id) ON DELETE CASCADE,
              text_content TEXT,
              metadata JSONB,
              version INTEGER NOT NULL,
              changed_by UUID REFERENCES users(id),
              changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
          `,
        },
        {
          name: 'dimensions',
          query: `
            CREATE TABLE IF NOT EXISTS dimensions (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
              name VARCHAR(255) NOT NULL,
              color VARCHAR(7),
              description TEXT,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              UNIQUE(space_id, name)
            )
          `,
        },
        {
          name: 'files',
          query: `
            CREATE TABLE IF NOT EXISTS files (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
              filename VARCHAR(255) NOT NULL,
              mime_type VARCHAR(100),
              size_bytes BIGINT,
              storage_path TEXT,
              uploaded_by UUID REFERENCES users(id),
              uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
          `,
        },
        {
          name: 'sessions',
          query: `
            CREATE TABLE IF NOT EXISTS sessions (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              token VARCHAR(500) UNIQUE NOT NULL,
              ip_address INET,
              user_agent TEXT,
              expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
          `,
        },
        {
          name: 'import_export_jobs',
          query: `
            CREATE TABLE IF NOT EXISTS import_export_jobs (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
              user_id UUID NOT NULL REFERENCES users(id),
              type VARCHAR(20) NOT NULL CHECK (type IN ('import', 'export')),
              status VARCHAR(20) NOT NULL DEFAULT 'pending',
              file_path TEXT,
              error_message TEXT,
              started_at TIMESTAMP WITH TIME ZONE,
              completed_at TIMESTAMP WITH TIME ZONE,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
          `,
        },
      ];

      for (const table of tables) {
        await client.query(table.query);
        logger.info(`✅ Table '${table.name}' created/verified`);
      }

      // Create indexes
      const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_spaces_owner ON spaces(owner_id)',
        'CREATE INDEX IF NOT EXISTS idx_spaces_public ON spaces(is_public)',
        'CREATE INDEX IF NOT EXISTS idx_cells_space ON cells(space_id)',
        'CREATE INDEX IF NOT EXISTS idx_cells_created_by ON cells(created_by)',
        'CREATE INDEX IF NOT EXISTS idx_cell_history_cell ON cell_history(cell_id)',
        'CREATE INDEX IF NOT EXISTS idx_dimensions_space ON dimensions(space_id)',
        'CREATE INDEX IF NOT EXISTS idx_files_space ON files(space_id)',
        'CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)',
        'CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)',
        'CREATE INDEX IF NOT EXISTS idx_collaborators_user ON space_collaborators(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_import_export_space ON import_export_jobs(space_id)',
        'CREATE INDEX IF NOT EXISTS idx_import_export_user ON import_export_jobs(user_id)',
      ];

      for (const index of indexes) {
        await client.query(index);
      }
      logger.info('✅ All indexes created/verified');

      // Create update trigger for updated_at columns
      await client.query(`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ language 'plpgsql';
      `);

      const tablesWithUpdatedAt = ['users', 'spaces', 'cells'];
      for (const table of tablesWithUpdatedAt) {
        await client.query(`
          DROP TRIGGER IF EXISTS update_${table}_updated_at ON ${table};
          CREATE TRIGGER update_${table}_updated_at
            BEFORE UPDATE ON ${table}
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        `);
      }
      logger.info('✅ Update triggers created');

      // Create views for common queries
      await client.query(`
        CREATE OR REPLACE VIEW user_spaces AS
        SELECT 
          s.*,
          u.username as owner_username,
          u.email as owner_email,
          COUNT(DISTINCT c.id) as cell_count,
          COUNT(DISTINCT sc.user_id) as collaborator_count
        FROM spaces s
        JOIN users u ON s.owner_id = u.id
        LEFT JOIN cells c ON s.id = c.space_id
        LEFT JOIN space_collaborators sc ON s.id = sc.space_id
        GROUP BY s.id, u.username, u.email;
      `);
      logger.info('✅ Views created');

      // Commit transaction
      await client.query('COMMIT');
      logger.info('✅ Migration completed successfully');

      // Create test user in development
      if (process.env.NODE_ENV === 'development') {
        const bcrypt = await import('bcrypt');
        const passwordHash = await bcrypt.hash('testpassword', 10);
        
        await pool.query(`
          INSERT INTO users (email, username, password_hash)
          VALUES ('test@example.com', 'testuser', $1)
          ON CONFLICT (email) DO NOTHING
        `, [passwordHash]);
        
        logger.info('✅ Test user created (test@example.com / testpassword)');
      }

      client.release();
    } catch (error) {
      await client.query('ROLLBACK');
      client.release();
      throw error;
    }
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run migration if called directly
if (require.main === module) {
  migrate()
    .then(() => {
      logger.info('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Migration script failed:', error);
      process.exit(1);
    });
}

export default migrate;