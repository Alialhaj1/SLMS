/**
 * Production-Grade Logger Utility
 * Winston with daily rotation, 30-day retention
 * Separate logs: all.log, error.log, api.log
 * Supports: info, warn, error, http, debug levels
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

// Log levels: error (0) > warn (1) > info (2) > http (3) > debug (4)
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Determine log level based on environment
const getLogLevel = (): string => {
  const env = process.env.NODE_ENV || 'development';
  return env === 'production' ? 'info' : 'debug';
};

// Custom log format for file logs
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    
    // Build base log message
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      // Remove stack trace from meta display (already in message)
      const { stack, ...cleanMeta } = meta;
      if (Object.keys(cleanMeta).length > 0) {
        log += ` | ${JSON.stringify(cleanMeta)}`;
      }
    }
    
    return log;
  })
);

// Console format with colors
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    let log = `${timestamp} [${level}]: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      const { stack, ...cleanMeta } = meta;
      if (Object.keys(cleanMeta).length > 0) {
        log += ` | ${JSON.stringify(cleanMeta, null, 2)}`;
      }
    }
    
    return log;
  })
);

// Create logs directory path
const logsDir = path.join(__dirname, '../../logs');

// Daily rotate file transport for all logs
const allLogsTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'all-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '30d', // Keep logs for 30 days
  format: logFormat,
  level: getLogLevel(),
});

// Daily rotate file transport for error logs only
const errorLogsTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '30d', // Keep error logs for 30 days
  format: logFormat,
  level: 'error',
});

// Daily rotate file transport for API access logs (HTTP requests)
const apiLogsTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'api-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '30d',
  format: logFormat,
  level: 'http',
});

// Create the Winston logger instance
const winstonLogger = winston.createLogger({
  levels: logLevels,
  transports: [
    allLogsTransport,
    errorLogsTransport,
    apiLogsTransport,
    // Console transport for development
    new winston.transports.Console({
      format: consoleFormat,
      level: getLogLevel(),
    }),
  ],
  exitOnError: false,
});

// Stream for Morgan HTTP logging middleware (if needed)
export const loggerStream = {
  write: (message: string) => {
    winstonLogger.http(message.trim());
  },
};

// Export default logger
export const logger = winstonLogger;
export default winstonLogger;
