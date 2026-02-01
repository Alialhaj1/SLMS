/**
 * Environment Variables Configuration
 * Validates all required environment variables on startup
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface EnvConfig {
  // Server
  PORT: number;
  NODE_ENV: 'development' | 'production' | 'test';
  
  // Database
  DATABASE_URL: string;
  
  // JWT
  JWT_SECRET: string;
  JWT_ACCESS_EXPIRATION: string;
  JWT_REFRESH_EXPIRATION: string;
  
  // Security
  BCRYPT_ROUNDS: number;
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  
  // CORS
  CORS_ORIGINS: string[];
}

/**
 * Validates and returns typed environment configuration
 * Throws error if any required variables are missing or invalid
 */
function validateEnv(): EnvConfig {
  const errors: string[] = [];

  // Validate JWT_SECRET
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    errors.push('JWT_SECRET is required in environment variables');
  } else if (JWT_SECRET === 'replace-me' || JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters long and not use default value');
  }

  // Validate DATABASE_URL
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    errors.push('DATABASE_URL is required in environment variables');
  }

  // Validate NODE_ENV
  const NODE_ENV = process.env.NODE_ENV || 'development';
  if (!['development', 'production', 'test'].includes(NODE_ENV)) {
    errors.push('NODE_ENV must be one of: development, production, test');
  }

  // If any errors, throw and prevent startup
  if (errors.length > 0) {
    console.error('❌ Environment validation failed:');
    errors.forEach(err => console.error(`   - ${err}`));
    throw new Error('Environment validation failed. Please check your .env file.');
  }

  // Parse CORS origins
  const CORS_ORIGINS = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
    : ['http://localhost:3001'];

  return {
    // Server
    PORT: parseInt(process.env.PORT || '4000', 10),
    NODE_ENV: NODE_ENV as 'development' | 'production' | 'test',
    
    // Database
    DATABASE_URL: DATABASE_URL!,
    
    // JWT
    JWT_SECRET: JWT_SECRET!,
    JWT_ACCESS_EXPIRATION: process.env.JWT_ACCESS_EXPIRATION || '15m',
    JWT_REFRESH_EXPIRATION: process.env.JWT_REFRESH_EXPIRATION || '30d',
    
    // Security
    BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || '10', 10),
    RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 min
    RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '5', 10),
    
    // CORS
    CORS_ORIGINS,
  };
}

// Export validated configuration
export const config = validateEnv();

// Log configuration (without sensitive data)
if (config.NODE_ENV !== 'test') {
  console.log('✅ Environment configuration loaded:');
  console.log(`   - NODE_ENV: ${config.NODE_ENV}`);
  console.log(`   - PORT: ${config.PORT}`);
  console.log(`   - JWT_SECRET: ${config.JWT_SECRET.substring(0, 8)}... (${config.JWT_SECRET.length} chars)`);
  console.log(`   - DATABASE_URL: ${config.DATABASE_URL.split('@')[1] || 'configured'}`);
  console.log(`   - CORS_ORIGINS: ${config.CORS_ORIGINS.join(', ')}`);
}
