/**
 * Test Route - Trigger Error for Sentry Testing
 * 
 * DELETE THIS FILE AFTER VERIFYING SENTRY WORKS
 * 
 * Usage:
 * GET /api/test/sentry/error - Throws 500 error (should appear in Sentry)
 * GET /api/test/sentry/message - Sends warning message (should appear in Sentry)
 * GET /api/test/sentry/handled - Manually captured exception
 */

import { Router, Request, Response } from 'express';
import { captureException, captureMessage } from '../utils/sentry';
import logger from '../utils/logger';

const router = Router();

// Test 1: Unhandled exception (will be caught by errorHandler + Sentry)
router.get('/error', (req: Request, res: Response) => {
  logger.info('🧪 Testing Sentry: throwing unhandled error');
  throw new Error('Test error for Sentry - this is intentional for testing');
});

// Test 2: Captured message (warning)
router.get('/message', (req: Request, res: Response) => {
  logger.info('🧪 Testing Sentry: capturing warning message');
  
  captureMessage('Test warning message from SLMS backend', 'warning', {
    tags: { test: 'true' },
    userId: (req as any).user?.id,
    companyId: (req as any).user?.companyId,
  });

  res.json({ 
    success: true, 
    message: 'Warning message sent to Sentry (check dashboard)' 
  });
});

// Test 3: Manually captured exception (try/catch)
router.get('/handled', (req: Request, res: Response) => {
  logger.info('🧪 Testing Sentry: manually capturing exception');
  
  try {
    // Simulate error
    const data = JSON.parse('{ invalid json');
  } catch (error: any) {
    captureException(error, {
      tags: { 
        test: 'true',
        errorType: 'manual_capture' 
      },
    });

    return res.json({ 
      success: true, 
      message: 'Exception captured and sent to Sentry (check dashboard)',
      error: error.message,
    });
  }
});

// Test 4: Database error simulation
router.get('/db-error', async (req: Request, res: Response) => {
  logger.info('🧪 Testing Sentry: simulating database error');
  const pool = require('../db').default;
  
  try {
    // Invalid SQL - will throw error
    await pool.query('SELECT * FROM nonexistent_table_xyz');
    res.json({ success: true });
  } catch (error: any) {
    captureException(error, {
      tags: { 
        test: 'true',
        errorType: 'database_error' 
      },
    });
    throw error; // Re-throw to test error handler
  }
});

export default router;
