-- =====================================================
-- Migration 052: Create Cheque Books
-- Adds cheque_books table for tracking cheque book inventory and usage
-- =====================================================

-- Main cheque books table
CREATE TABLE IF NOT EXISTS cheque_books (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  bank_account_id INTEGER NOT NULL REFERENCES bank_accounts(id),

  code VARCHAR(50) NOT NULL,
  series_name VARCHAR(150) NOT NULL,
  cheque_prefix VARCHAR(20),

  start_number INTEGER NOT NULL CHECK (start_number >= 1),
  end_number INTEGER NOT NULL CHECK (end_number >= 1),
  current_number INTEGER NOT NULL CHECK (current_number >= 1),

  used_leaves INTEGER NOT NULL DEFAULT 0 CHECK (used_leaves >= 0),
  cancelled_leaves INTEGER NOT NULL DEFAULT 0 CHECK (cancelled_leaves >= 0),

  issue_date DATE NOT NULL,
  expiry_date DATE,

  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired', 'cancelled')),
  is_default BOOLEAN NOT NULL DEFAULT false,

  notes TEXT,

  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Soft delete columns (kept inline to avoid dependency on helper functions)
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by INTEGER REFERENCES users(id),

  UNIQUE(company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_cheque_books_company ON cheque_books(company_id);
CREATE INDEX IF NOT EXISTS idx_cheque_books_bank_account ON cheque_books(company_id, bank_account_id);

-- Permissions (best-effort; safe if permissions table already exists)
CREATE TABLE IF NOT EXISTS permissions (
  id SERIAL PRIMARY KEY,
  permission_code VARCHAR(100) UNIQUE NOT NULL,
  resource VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL,
  description TEXT,
  module VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO permissions (permission_code, resource, action, description, module) VALUES
('finance:cheque_books:view', 'finance:cheque_books', 'view', 'View cheque books', 'Finance'),
('finance:cheque_books:create', 'finance:cheque_books', 'create', 'Create cheque books', 'Finance'),
('finance:cheque_books:edit', 'finance:cheque_books', 'edit', 'Edit cheque books', 'Finance'),
('finance:cheque_books:delete', 'finance:cheque_books', 'delete', 'Delete cheque books', 'Finance')
ON CONFLICT (permission_code) DO NOTHING;
