import fs from 'fs';
import path from 'path';
import pool from './index';
import logger from '../utils/logger';

/**
 * Enhanced Migration Runner
 * - Uses proper transactions (BEGIN/COMMIT/ROLLBACK)
 * - Prevents re-execution of already applied migrations
 * - Handles multi-statement SQL files
 * - Logs execution time
 */
async function runMigrations() {
  const client = await pool.connect();
  let appliedCount = 0;
  let skippedCount = 0;
  
  try {
    // Ensure migrations table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY, 
        name TEXT UNIQUE NOT NULL, 
        run_at TIMESTAMPTZ DEFAULT NOW(),
        checksum TEXT,
        execution_time_ms INTEGER
      )
    `);
    
    const migrationsDir = path.join(__dirname, '..', '..', 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      logger.warn('No migrations directory found');
      return;
    }
    
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql') && !f.endsWith('.done'))
      .sort();
    
    for (const file of files) {
      const name = file;
      
      // Check if already applied
      const existingMigration = await client.query(
        'SELECT 1 FROM migrations WHERE name = $1', 
        [name]
      );
      
      if (existingMigration.rowCount && existingMigration.rowCount > 0) {
        skippedCount++;
        continue;
      }
      
      // Read and prepare SQL
      const filePath = path.join(migrationsDir, file);
      let sql = fs.readFileSync(filePath, 'utf8');
      
      // Remove BOM if present
      if (sql.charCodeAt(0) === 0xFEFF) {
        sql = sql.slice(1);
      }
      
      // Calculate simple checksum
      const checksum = Buffer.from(sql).toString('base64').slice(0, 32);
      
      const startTime = Date.now();
      
      try {
        // Execute migration in transaction
        await client.query('BEGIN');
        await client.query(sql);
        
        // Record migration
        await client.query(
          'INSERT INTO migrations(name, checksum, execution_time_ms) VALUES($1, $2, $3)',
          [name, checksum, Date.now() - startTime]
        );
        
        await client.query('COMMIT');
        
        appliedCount++;
        logger.info(`✅ Migration applied: ${name}`, { 
          executionTime: `${Date.now() - startTime}ms`,
          checksum 
        });
        
      } catch (migrationError: any) {
        // Rollback on error
        await client.query('ROLLBACK');
        logger.error(`❌ Migration failed: ${name}`, migrationError);
        throw migrationError;
      }
    }
    
    if (appliedCount > 0) {
      logger.info(`📊 Migrations complete`, { 
        applied: appliedCount, 
        skipped: skippedCount 
      });
    } else if (skippedCount > 0) {
      logger.info(`📊 All migrations already applied`, { 
        totalMigrations: skippedCount 
      });
    }
    
  } catch (err) {
    logger.error('Migration runner error', err);
    throw err;
  } finally {
    client.release();
  }
}

export default runMigrations;

// Allow `ts-node src/db/migrate.ts` to run migrations directly (npm script support)
// while still supporting import-and-run usage from src/index.ts.
if (require.main === module) {
  runMigrations().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Migration runner error:', err);
    process.exit(1);
  });
}
