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
  
  // Redis
  REDIS_URL: string;
  
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

  // Payment Gateways (optional — e-commerce)
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_PUBLISHABLE_KEY: string;
  PAYPAL_CLIENT_ID: string;
  PAYPAL_CLIENT_SECRET: string;
  PAYPAL_WEBHOOK_ID: string;
  PAYPAL_SANDBOX: boolean;
  MADA_API_KEY: string;
  MADA_WEBHOOK_SECRET: string;

  // Email (optional)
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_USER: string;
  SMTP_PASS: string;
  SMTP_FROM: string;
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

    // Redis
    REDIS_URL: process.env.REDIS_URL || 'redis://redis:6379',
    
    // JWT
    JWT_SECRET: JWT_SECRET!,
    JWT_ACCESS_EXPIRATION: process.env.JWT_ACCESS_EXPIRATION || '15m',
    JWT_REFRESH_EXPIRATION: process.env.JWT_REFRESH_EXPIRATION || '7d',
    
    // Security
    BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 min
    RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '5', 10),
    
    // CORS
    CORS_ORIGINS,

    // Payment Gateways (all optional — only needed for e-commerce)
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
    STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY || '',
    PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID || '',
    PAYPAL_CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET || '',
    PAYPAL_WEBHOOK_ID: process.env.PAYPAL_WEBHOOK_ID || '',
    PAYPAL_SANDBOX: process.env.PAYPAL_SANDBOX !== 'false',
    MADA_API_KEY: process.env.MADA_API_KEY || '',
    MADA_WEBHOOK_SECRET: process.env.MADA_WEBHOOK_SECRET || '',

    // Email (optional)
    SMTP_HOST: process.env.SMTP_HOST || '',
    SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
    SMTP_USER: process.env.SMTP_USER || '',
    SMTP_PASS: process.env.SMTP_PASS || '',
    SMTP_FROM: process.env.SMTP_FROM || 'noreply@example.com',
  };
}

// Export validated configuration
export const config = validateEnv();

// Log configuration (without sensitive data)
if (config.NODE_ENV !== 'test') {
  console.log('✅ Environment configuration loaded:');
  console.log(`   - NODE_ENV: ${config.NODE_ENV}`);
  console.log(`   - PORT: ${config.PORT}`);
  console.log(`   - JWT_SECRET: ******* (${config.JWT_SECRET.length} chars)`);
  console.log(`   - DATABASE_URL: ${config.DATABASE_URL.split('@')[1] || 'configured'}`);
  console.log(`   - CORS_ORIGINS: ${config.CORS_ORIGINS.join(', ')}`);
}
