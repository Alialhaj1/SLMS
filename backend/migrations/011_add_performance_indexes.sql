-- Migration: Add Performance Indexes
-- Description: Add indexes to improve query performance on frequently accessed columns
-- Date: 2025-01-20

-- ============================================
-- Users Table Indexes
-- ============================================

-- Index on email (used for login and lookups)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Index on status (for filtering active/inactive users)
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Index on disabled_at (for filtering disabled users)
CREATE INDEX IF NOT EXISTS idx_users_disabled_at ON users(disabled_at) WHERE disabled_at IS NOT NULL;

-- ============================================
-- Audit Logs Indexes
-- ============================================

-- Index on user_id (for filtering logs by user)
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);

-- Index on created_at (for sorting and time-based queries)
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Composite index on action and resource (for filtering by type)
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_resource ON audit_logs(action, resource);

-- Index on resource_id (for finding logs related to specific records)
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_id ON audit_logs(resource_id);

-- ============================================
-- Login History Indexes
-- ============================================

-- Index on user_id (for user login history)
CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON login_history(user_id);

-- Index on created_at (for sorting by date)
CREATE INDEX IF NOT EXISTS idx_login_history_created_at_perf ON login_history(created_at DESC);

-- Index on activity_type (for filtering successful/failed logins)
CREATE INDEX IF NOT EXISTS idx_login_history_activity_type_perf ON login_history(activity_type);

-- Composite index for failed login tracking
CREATE INDEX IF NOT EXISTS idx_login_history_user_activity_perf ON login_history(user_id, activity_type) 
WHERE activity_type = 'login_failed';

-- ============================================
-- User Roles Junction Table Indexes
-- ============================================

-- Composite index for user-role lookups (both directions)
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);

-- ============================================
-- Roles Table Indexes
-- ============================================

-- Index on name (for lookups by role name)
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);

-- Index on company_id (for multi-tenant scenarios)
CREATE INDEX IF NOT EXISTS idx_roles_company_id ON roles(company_id) WHERE company_id IS NOT NULL;

-- ============================================
-- Refresh Tokens Indexes
-- ============================================

-- Index on user_id (for finding user tokens)
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);

-- Index on expires_at (for cleanup of expired tokens)
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- Index on revoked_at (for filtering active tokens)
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_revoked_at ON refresh_tokens(revoked_at) 
WHERE revoked_at IS NULL;

-- ============================================
-- Shipments Table Indexes
-- ============================================

-- Index on tracking_number (for lookups)
CREATE INDEX IF NOT EXISTS idx_shipments_tracking_number ON shipments(tracking_number);

-- Index on status (for filtering by status)
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);

-- Index on created_at (for sorting)
CREATE INDEX IF NOT EXISTS idx_shipments_created_at ON shipments(created_at DESC);

-- Index on supplier_id already exists in 005_create_shipments_expenses.sql

-- ============================================
-- Companies Table Indexes
-- ============================================

-- Index on name (for searches)
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);

-- ============================================
-- Branches Table Indexes
-- ============================================

-- Index on company_id (for filtering branches by company)
CREATE INDEX IF NOT EXISTS idx_branches_company_id ON branches(company_id);

-- Index on name (for searches)
CREATE INDEX IF NOT EXISTS idx_branches_name ON branches(name);

-- ============================================
-- System Settings Indexes
-- ============================================

-- Index on key (for lookups - should be unique already but helps performance)
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);

-- ============================================
-- Permissions Table Indexes
-- ============================================

-- Index on permission_code (for lookups)
CREATE INDEX IF NOT EXISTS idx_permissions_code ON permissions(permission_code);

-- Index on resource (for grouping by resource)
CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource);

-- ============================================
-- Products Table Indexes
-- ============================================

-- Index on supplier_id (for filtering products by supplier)
CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON products(supplier_id);

-- Index on name (for searches)
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

-- ============================================
-- Expenses Table Indexes
-- ============================================

-- Index on shipment_id (for finding expenses by shipment)
CREATE INDEX IF NOT EXISTS idx_expenses_shipment_id ON expenses(shipment_id);

-- Index on created_at (for date-based reports)
CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses(created_at DESC);

-- ============================================
-- User Status History Indexes
-- ============================================

-- Index on user_id (for user status history)
CREATE INDEX IF NOT EXISTS idx_user_status_history_user_id ON user_status_history(user_id);

-- Index on changed_at (for sorting)
CREATE INDEX IF NOT EXISTS idx_user_status_history_changed_at ON user_status_history(changed_at DESC);

-- ============================================
-- Analyze Tables for Query Planner
-- ============================================

ANALYZE users;
ANALYZE audit_logs;
ANALYZE login_history;
ANALYZE user_roles;
ANALYZE roles;
ANALYZE refresh_tokens;
ANALYZE shipments;
ANALYZE companies;
ANALYZE branches;
ANALYZE system_settings;
ANALYZE permissions;
ANALYZE products;
ANALYZE expenses;
ANALYZE user_status_history;
