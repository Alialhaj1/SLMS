/**
 * Input Validation Schemas and Middleware
 * Uses simple validation for now - can be replaced with Zod later
 */

import { Request, Response, NextFunction } from 'express';

// ===========================
// Validation Error Class
// ===========================
export class ValidationError extends Error {
  errors: string[];
  
  constructor(errors: string[]) {
    super('Validation failed');
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

// ===========================
// Basic Validators
// ===========================
const validators = {
  email: (value: any): string | null => {
    if (!value) return 'Email is required';
    if (typeof value !== 'string') return 'Email must be a string';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) return 'Invalid email format';
    return null;
  },

  password: (value: any): string | null => {
    if (!value) return 'Password is required';
    if (typeof value !== 'string') return 'Password must be a string';
    if (value.length < 8) return 'Password must be at least 8 characters';
    return null;
  },

  string: (minLength = 1, maxLength = 255) => (value: any): string | null => {
    if (!value) return 'This field is required';
    if (typeof value !== 'string') return 'Must be a string';
    if (value.length < minLength) return `Must be at least ${minLength} characters`;
    if (value.length > maxLength) return `Must be at most ${maxLength} characters`;
    return null;
  },

  optionalString: (maxLength = 255) => (value: any): string | null => {
    if (!value) return null; // Optional
    if (typeof value !== 'string') return 'Must be a string';
    if (value.length > maxLength) return `Must be at most ${maxLength} characters`;
    return null;
  },

  number: (value: any): string | null => {
    if (value === undefined || value === null) return 'This field is required';
    if (typeof value !== 'number' || isNaN(value)) return 'Must be a number';
    return null;
  },

  boolean: (value: any): string | null => {
    if (typeof value !== 'boolean') return 'Must be a boolean';
    return null;
  },

  array: (value: any): string | null => {
    if (!Array.isArray(value)) return 'Must be an array';
    return null;
  },

  id: (value: any): string | null => {
    if (!value) return 'ID is required';
    const num = parseInt(value, 10);
    if (isNaN(num) || num <= 0) return 'Invalid ID';
    return null;
  },
};

// ===========================
// Schema Definitions
// ===========================

export const schemas = {
  // Auth Schemas
  login: {
    email: validators.email,
    password: validators.password,
  },

  register: {
    email: validators.email,
    password: validators.password,
    full_name: validators.string(2, 100),
  },

  refreshToken: {
    refreshToken: validators.string(1),
  },

  // User Schemas
  createUser: {
    email: validators.email,
    password: validators.password,
    full_name: validators.string(2, 100),
    role_ids: validators.array,
  },

  updateUser: {
    full_name: validators.optionalString(100),
    email: validators.email,
    role_ids: validators.array,
  },

  updatePassword: {
    password: validators.password,
  },

  // Role Schemas
  createRole: {
    name: validators.string(2, 50),
    description: validators.optionalString(500),
    permissions: validators.array,
  },

  updateRole: {
    name: validators.string(2, 50),
    description: validators.optionalString(500),
    permissions: validators.array,
  },

  cloneRole: {
    newName: validators.string(2, 50),
    description: validators.optionalString(500),
  },

  // Company Schemas
  createCompany: {
    name: validators.string(2, 100),
    address: validators.optionalString(500),
    phone: validators.optionalString(20),
    email: validators.email,
  },

  // Branch Schemas
  createBranch: {
    company_id: validators.id,
    name: validators.string(2, 100),
    address: validators.optionalString(500),
    phone: validators.optionalString(20),
  },

  // Shipment Schemas
  createShipment: {
    tracking_number: validators.string(1, 50),
    sender_name: validators.string(2, 100),
    receiver_name: validators.string(2, 100),
    origin: validators.string(2, 100),
    destination: validators.string(2, 100),
    status: validators.string(2, 50),
  },
};

// ===========================
// Validation Middleware Factory
// ===========================

export function validate(schema: Record<string, (value: any) => string | null>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = [];
    const body = req.body;

    // Validate each field in schema
    for (const [field, validator] of Object.entries(schema)) {
      const error = validator(body[field]);
      if (error) {
        errors.push(`${field}: ${error}`);
      }
    }

    // If validation fails, return 400
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Input validation failed',
          details: errors,
        },
      });
    }

    // Validation passed
    next();
  };
}

// ===========================
// Validate ID Parameter
// ===========================

export function validateId(paramName = 'id') {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = req.params[paramName];
    const error = validators.id(id);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: error,
        },
      });
    }
    
    next();
  };
}

// ===========================
// Validate Query Parameters
// ===========================

export function validateQuery(schema: Record<string, (value: any) => string | null>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = [];
    const query = req.query;

    for (const [field, validator] of Object.entries(schema)) {
      const error = validator(query[field]);
      if (error) {
        errors.push(`${field}: ${error}`);
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Query parameter validation failed',
          details: errors,
        },
      });
    }

    next();
  };
}
