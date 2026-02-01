import './config/env'; // Load and validate environment first
import app from './app';
import runMigrations from './db/migrate';
import { config } from './config/env';
import logger from './utils/logger';
import { initBackupScheduler } from './services/backupScheduler';

(async () => {
  try {
    logger.info('🚀 Starting SLMS Backend...', {
      nodeVersion: process.version,
      platform: process.platform,
    });
    
    logger.info('Running database migrations...');
    await runMigrations();
    
    app.listen(config.PORT, () => {
      logger.info(`✅ SLMS backend listening on port ${config.PORT}`, {
        environment: process.env.NODE_ENV || 'development',
        apiUrl: `http://localhost:${config.PORT}`,
      });
      
      // Initialize backup scheduler after server starts
      if (process.env.ENABLE_BACKUP_SCHEDULER !== 'false') {
        initBackupScheduler();
      }
    });
    
  } catch (err) {
    logger.error('❌ Failed to start application', err);
    process.exit(1);
  }
})();

// Graceful shutdown handlers
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Promise Rejection', { 
    reason: reason?.message || reason,
    stack: reason?.stack 
  });
});

// Uncaught exception handler
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception', error);
  process.exit(1);
});

