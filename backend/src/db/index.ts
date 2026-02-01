import { Pool } from 'pg';
import { config } from '../config/env';

// Production-grade connection pool configuration
const pool = new Pool({
  connectionString: config.DATABASE_URL,
  max: 20,                      // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,     // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return error after 2 seconds if no connection available
  maxUses: 7500,                // Recycle connection after 7500 queries
});

// Connection pool error handler
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle database client:', err);
  // TODO: Add alert/notification here (e.g., Sentry, PagerDuty)
});

// Connection pool lifecycle logging
pool.on('connect', (client) => {
  console.log('New database client connected');
});

pool.on('acquire', (client) => {
  // Connection acquired from pool
});

pool.on('remove', (client) => {
  console.log('Database client removed from pool');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing database pool...');
  await pool.end();
  console.log('Database pool closed');
  process.exit(0);
});

export { pool };
export default pool;
