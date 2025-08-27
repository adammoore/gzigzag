import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

// Handle both DATABASE_URL and individual config
const pool = process.env.DATABASE_URL 
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'zigzag_db',
      user: process.env.DB_USER || 'zigzag_user',
      password: process.env.DB_PASSWORD || 'zigzag_password'
    });

async function runMigrations() {
  console.log('Running database migrations...');
  
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  const files = fs.readdirSync(migrationsDir).sort();
  
  for (const file of files) {
    if (file.endsWith('.sql')) {
      console.log('Running migration:', file);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      
      try {
        await pool.query(sql);
        console.log('✓ Migration completed:', file);
      } catch (error) {
        console.error('✗ Migration failed:', file, error);
        throw error;
      }
    }
  }
  
  console.log('All migrations completed successfully!');
  await pool.end();
}

runMigrations().catch(error => {
  console.error('Migration error:', error);
  process.exit(1);
});
