/**
 * Jest Global Setup
 * Runs before all tests
 */

import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://slms:slms_pass@localhost:5432/slms_db';

// Global test timeout
jest.setTimeout(30000);

// Suppress console logs during tests (optional)
if (process.env.SUPPRESS_LOGS === 'true') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    // Keep error and assert for test failures
  };
}

// Mock timers (optional - enable if needed)
// jest.useFakeTimers();

console.log('✅ Jest setup complete');
console.log('📦 Test environment:', process.env.NODE_ENV);
console.log('🗄️  Database:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@'));
