-- Migration: Add Soft Delete Support
-- Description: Add deleted_at column to critical tables for soft delete functionality
-- Date: 2025-12-20

-- ============================================
-- Add deleted_at columns
-- ============================================

-- Users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_by INTEGER DEFAULT NULL;

-- Roles table
ALTER TABLE roles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS deleted_by INTEGER DEFAULT NULL;

-- Companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS deleted_by INTEGER DEFAULT NULL;

-- Branches table
ALTER TABLE branches ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS deleted_by INTEGER DEFAULT NULL;

-- ============================================
-- Add foreign key constraints for deleted_by
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='fk_users_deleted_by') THEN
    ALTER TABLE users 
      ADD CONSTRAINT fk_users_deleted_by 
      FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='fk_roles_deleted_by') THEN
    ALTER TABLE roles 
      ADD CONSTRAINT fk_roles_deleted_by 
      FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='fk_companies_deleted_by') THEN
    ALTER TABLE companies 
      ADD CONSTRAINT fk_companies_deleted_by 
      FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='fk_branches_deleted_by') THEN
    ALTER TABLE branches 
      ADD CONSTRAINT fk_branches_deleted_by 
      FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================
-- Add indexes for soft delete queries
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);
CREATE INDEX IF NOT EXISTS idx_roles_deleted_at ON roles(deleted_at);
CREATE INDEX IF NOT EXISTS idx_companies_deleted_at ON companies(deleted_at);
CREATE INDEX IF NOT EXISTS idx_branches_deleted_at ON branches(deleted_at);

-- ============================================
-- Create deleted_records table for restore history
-- ============================================

CREATE TABLE IF NOT EXISTS deleted_records (
  id SERIAL PRIMARY KEY,
  table_name VARCHAR(100) NOT NULL,
  record_id INTEGER NOT NULL,
  deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  restored_at TIMESTAMP DEFAULT NULL,
  restored_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT,
  UNIQUE(table_name, record_id, deleted_at)
);

CREATE INDEX IF NOT EXISTS idx_deleted_records_table_record ON deleted_records(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_deleted_records_deleted_at ON deleted_records(deleted_at DESC);

-- ============================================
-- Comments
-- ============================================

COMMENT ON COLUMN users.deleted_at IS 'Soft delete timestamp - NULL means not deleted';
COMMENT ON COLUMN users.deleted_by IS 'User ID who performed the soft delete';
COMMENT ON COLUMN roles.deleted_at IS 'Soft delete timestamp - NULL means not deleted';
COMMENT ON COLUMN roles.deleted_by IS 'User ID who performed the soft delete';
COMMENT ON COLUMN companies.deleted_at IS 'Soft delete timestamp - NULL means not deleted';
COMMENT ON COLUMN companies.deleted_by IS 'User ID who performed the soft delete';
COMMENT ON COLUMN branches.deleted_at IS 'Soft delete timestamp - NULL means not deleted';
COMMENT ON COLUMN branches.deleted_by IS 'User ID who performed the soft delete';

COMMENT ON TABLE deleted_records IS 'History of soft deleted and restored records';
