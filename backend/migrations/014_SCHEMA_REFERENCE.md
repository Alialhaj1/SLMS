# Database Schema Reference - Password Reset & Notifications

**Updated:** December 21, 2025  
**Migration:** 014_password_reset_notifications.sql

---

## 📊 Table: `password_reset_requests`

### Purpose
Stores password reset requests that require manual admin approval. No self-service password reset.

### Schema

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | SERIAL | NO | AUTO | Primary key |
| `user_id` | INTEGER | NO | - | FK to users.id (ON DELETE CASCADE) |
| `reason` | TEXT | YES | NULL | Optional reason from user |
| `ip_address` | VARCHAR(45) | YES | NULL | IPv4/IPv6 address of request |
| `user_agent` | TEXT | YES | NULL | Browser/device user agent |
| `status` | VARCHAR(20) | NO | 'pending' | pending \| approved \| rejected \| cancelled |
| `handled_by` | INTEGER | YES | NULL | FK to users.id (admin who handled) |
| `handled_at` | TIMESTAMPTZ | YES | NULL | When admin handled request |
| `admin_notes` | TEXT | YES | NULL | Admin's notes about decision |
| `temp_password_hash` | VARCHAR(255) | YES | NULL | bcrypt hash (only after approval) |
| `temp_password_expires_at` | TIMESTAMPTZ | YES | NULL | Expiration time (default 24h) |
| `temp_password_used` | BOOLEAN | NO | false | Prevents password reuse |
| `requested_at` | TIMESTAMPTZ | NO | NOW() | When request was created |
| `created_at` | TIMESTAMPTZ | NO | NOW() | Record creation time |
| `updated_at` | TIMESTAMPTZ | NO | NOW() | Auto-updated by trigger |

### Constraints
- CHECK: `status IN ('pending', 'approved', 'rejected', 'cancelled')`
- FK: `user_id → users.id ON DELETE CASCADE`
- FK: `handled_by → users.id`

### Indexes
- `idx_prr_user_id` ON (user_id)
- `idx_prr_status` ON (status)
- `idx_prr_handled_by` ON (handled_by)
- `idx_prr_requested_at` ON (requested_at DESC)
- `idx_prr_pending` ON (status, requested_at) WHERE status = 'pending'

### Triggers
- `password_reset_requests_updated_at` BEFORE UPDATE → calls `update_updated_at_column()`

---

## 📊 Table: `notifications`

### Purpose
In-app notification system with i18n support and permission-based targeting.

### Schema

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | SERIAL | NO | AUTO | Primary key |
| `type` | VARCHAR(50) | NO | - | Notification type identifier |
| `category` | VARCHAR(30) | NO | - | security \| admin \| user \| system |
| `priority` | VARCHAR(20) | NO | 'normal' | low \| normal \| high \| critical |
| `title_key` | VARCHAR(100) | NO | - | i18n translation key for title |
| `message_key` | VARCHAR(100) | NO | - | i18n translation key for message |
| `payload` | JSONB | NO | '{}' | Dynamic data for message interpolation |
| `target_user_id` | INTEGER | YES | NULL | FK to users.id (specific user) |
| `target_role_id` | INTEGER | YES | NULL | FK to roles.id (all users in role) |
| `related_entity_type` | VARCHAR(50) | YES | NULL | Type of related entity |
| `related_entity_id` | INTEGER | YES | NULL | ID of related entity |
| `read_at` | TIMESTAMPTZ | YES | NULL | When user read notification |
| `dismissed_at` | TIMESTAMPTZ | YES | NULL | When user dismissed notification |
| `action_url` | VARCHAR(255) | YES | NULL | Deep link URL |
| `created_at` | TIMESTAMPTZ | NO | NOW() | When notification was created |
| `expires_at` | TIMESTAMPTZ | YES | NULL | Optional expiration time |

### Constraints
- FK: `target_user_id → users.id ON DELETE CASCADE`
- FK: `target_role_id → roles.id ON DELETE CASCADE`

### Indexes
- `idx_notif_target_user` ON (target_user_id) WHERE target_user_id IS NOT NULL
- `idx_notif_target_role` ON (target_role_id) WHERE target_role_id IS NOT NULL
- `idx_notif_type` ON (type)
- `idx_notif_category` ON (category)
- `idx_notif_read_at` ON (read_at)
- `idx_notif_created_at` ON (created_at DESC)
- `idx_notif_unread_user` ON (target_user_id, read_at, created_at DESC) WHERE read_at IS NULL
- `idx_notif_unread_role` ON (target_role_id, read_at, created_at DESC) WHERE read_at IS NULL

### Notification Types

| Type | Category | Description |
|------|----------|-------------|
| `password_reset_request` | admin | User requested password reset |
| `password_reset_approved` | user | Admin approved reset request |
| `password_reset_rejected` | user | Admin rejected reset request |
| `suspicious_login` | security | Suspicious login detected |
| `user_disabled` | user | User account disabled by admin |
| `role_changed` | user | User's role was changed |
| `permission_revoked` | user | Permission removed from user |
| `account_locked` | security | Account locked due to failed logins |

### Example Payload
```json
{
  "user_email": "john@example.com",
  "request_id": 123,
  "ip_address": "192.168.1.1",
  "reason": "Suspicious location"
}
```

---

## 📊 Table: `users` (Updated)

### New Columns Added

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `preferred_language` | VARCHAR(5) | NO | 'ar' | ar \| en |
| `must_change_password` | BOOLEAN | NO | false | Force password change on login |
| `password_changed_at` | TIMESTAMPTZ | YES | NULL | Last password change timestamp |
| `profile_image` | VARCHAR(255) | YES | NULL | URL or path to profile image |

### Constraints
- CHECK: `preferred_language IN ('ar', 'en')`

### Indexes
- `idx_users_preferred_language` ON (preferred_language)

---

## 🔍 Views

### `active_password_reset_requests`

**Purpose:** Quick view for admins to see pending password reset requests with user details.

**Columns:**
- id, user_id, user_email, user_name, user_status
- reason, status, requested_at, ip_address
- handled_by, handler_email, handled_at
- admin_notes, temp_password_expires_at, temp_password_used

**Filter:** WHERE status = 'pending'  
**Order:** requested_at DESC

**Example Query:**
```sql
SELECT * FROM active_password_reset_requests;
```

---

### `user_unread_notification_counts`

**Purpose:** Efficient count of unread notifications per user for badge display.

**Columns:**
- user_id
- unread_count

**Filter:** 
- read_at IS NULL
- dismissed_at IS NULL
- expires_at IS NULL OR expires_at > NOW()

**Example Query:**
```sql
SELECT unread_count FROM user_unread_notification_counts WHERE user_id = 123;
```

---

## 🔧 Functions

### `update_updated_at_column()`

**Type:** Trigger Function  
**Language:** plpgsql  
**Returns:** TRIGGER

**Purpose:** Automatically updates `updated_at` column to NOW() on UPDATE.

**Used By:**
- `password_reset_requests` table

**Example:**
```sql
-- Trigger automatically fires on UPDATE
UPDATE password_reset_requests SET status = 'approved' WHERE id = 1;
-- updated_at is automatically set to NOW()
```

---

### `detect_suspicious_login(user_id, ip_address, user_agent)`

**Type:** Function  
**Language:** plpgsql  
**Returns:** BOOLEAN

**Purpose:** Detects suspicious login patterns by comparing current login with previous login history.

**Parameters:**
- `p_user_id` (INTEGER) - User ID
- `p_ip_address` (VARCHAR(45)) - Current login IP
- `p_user_agent` (TEXT) - Current user agent

**Returns:** TRUE if suspicious, FALSE otherwise

**Logic:**
1. Fetches last successful login IP
2. Compares with current IP
3. Returns true if IPs differ

**Future Enhancements:**
- User agent comparison
- Geographic distance calculation
- Time-based anomaly detection

**Example:**
```sql
SELECT detect_suspicious_login(123, '192.168.1.100', 'Mozilla/5.0...');
-- Returns: true or false
```

**Used By:**
- AuthService.login() (in application layer)

---

## 🔐 Permissions

### Password Reset Requests

| Permission Code | Resource | Action | Description |
|----------------|----------|--------|-------------|
| `password_requests:view` | password_requests | view | View all password reset requests |
| `password_requests:approve` | password_requests | approve | Approve requests & generate temp passwords |
| `password_requests:reject` | password_requests | reject | Reject password reset requests |
| `password_requests:cancel` | password_requests | cancel | Cancel own password reset request |

### Notifications

| Permission Code | Resource | Action | Description |
|----------------|----------|--------|-------------|
| `notifications:view` | notifications | view | View own notifications |
| `notifications:view_all` | notifications | view_all | View all users' notifications (admin) |
| `notifications:create` | notifications | create | Create notifications for other users |
| `notifications:delete` | notifications | delete | Delete any notification |
| `notifications:manage` | notifications | manage | Full notification management |

### Security Alerts

| Permission Code | Resource | Action | Description |
|----------------|----------|--------|-------------|
| `security:alerts:view` | security | alerts_view | View security alerts |
| `security:alerts:manage` | security | alerts_manage | Manage security alerts |

---

## 📋 Common Queries

### Get pending password reset requests
```sql
SELECT * FROM active_password_reset_requests;
```

### Get unread notifications for user
```sql
SELECT * FROM notifications
WHERE target_user_id = 123
  AND read_at IS NULL
  AND (expires_at IS NULL OR expires_at > NOW())
ORDER BY created_at DESC;
```

### Get unread notification count
```sql
SELECT unread_count 
FROM user_unread_notification_counts 
WHERE user_id = 123;
```

### Approve password reset request
```sql
UPDATE password_reset_requests
SET status = 'approved',
    handled_by = 1, -- admin user id
    handled_at = NOW(),
    admin_notes = 'Verified via phone call',
    temp_password_hash = '$2b$10$...', -- bcrypt hash
    temp_password_expires_at = NOW() + INTERVAL '24 hours'
WHERE id = 123;
```

### Create notification for admins with specific permission
```sql
-- Get all users with password_requests:view permission
INSERT INTO notifications (
    type, category, priority,
    title_key, message_key,
    payload,
    target_role_id,
    related_entity_type, related_entity_id,
    action_url
)
SELECT 
    'password_reset_request',
    'admin',
    'normal',
    'notifications.password_reset.title',
    'notifications.password_reset.message',
    jsonb_build_object('user_email', u.email, 'request_id', 123),
    r.id,
    'password_reset_request',
    123,
    '/admin/password-requests/123'
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
JOIN password_reset_requests prr ON prr.id = 123
JOIN users u ON prr.user_id = u.id
WHERE p.permission_code = 'password_requests:view';
```

### Mark notification as read
```sql
UPDATE notifications
SET read_at = NOW()
WHERE id = 456 AND target_user_id = 123;
```

### Get user's language preference
```sql
SELECT preferred_language FROM users WHERE id = 123;
```

### Check if user must change password
```sql
SELECT must_change_password FROM users WHERE id = 123;
```

---

## 🔄 Workflows

### Password Reset Request Flow

```sql
-- 1. User submits request (via API)
INSERT INTO password_reset_requests (user_id, reason, ip_address, user_agent)
VALUES (123, 'Forgot my password', '192.168.1.1', 'Mozilla/5.0...');

-- 2. Notification created for admins
INSERT INTO notifications (type, category, title_key, message_key, payload, target_role_id)
SELECT 
    'password_reset_request', 'admin',
    'notifications.password_reset.title',
    'notifications.password_reset.message',
    jsonb_build_object('user_email', u.email, 'request_id', prr.id),
    r.id
FROM password_reset_requests prr
JOIN users u ON prr.user_id = u.id
CROSS JOIN roles r
WHERE prr.id = currval('password_reset_requests_id_seq')
  AND r.name = 'super_admin';

-- 3. Admin approves (via API)
UPDATE password_reset_requests
SET status = 'approved',
    handled_by = 1,
    handled_at = NOW(),
    temp_password_hash = '$2b$10$...',
    temp_password_expires_at = NOW() + INTERVAL '24 hours'
WHERE id = 123;

-- 4. Notification sent to user
INSERT INTO notifications (type, category, title_key, message_key, target_user_id)
VALUES (
    'password_reset_approved', 'user',
    'notifications.password_approved.title',
    'notifications.password_approved.message',
    123
);

-- 5. User logs in with temp password (via API)
UPDATE users
SET must_change_password = true,
    last_login_at = NOW()
WHERE id = 123;

-- 6. User changes password (via API)
UPDATE users
SET password = '$2b$10$...new_hash...',
    must_change_password = false,
    password_changed_at = NOW()
WHERE id = 123;

UPDATE password_reset_requests
SET temp_password_used = true
WHERE user_id = 123 AND status = 'approved';
```

---

## 🛡️ Security Best Practices

1. **Never expose user existence**
   - Always return same message for forgot password, regardless of email existence

2. **Rate limiting**
   - Limit forgot password requests per IP (3/hour)
   - Limit password reset requests per user (5/day)

3. **Temp password security**
   - Use bcrypt with high cost (10+)
   - Force expiration (24 hours default)
   - Mark as used after first login
   - Force immediate password change

4. **Notification permissions**
   - Verify user has permission before showing notification
   - Filter sensitive notifications by role
   - Log all notification access attempts

5. **Audit logging**
   - Log all password reset requests (success and failure)
   - Log all admin approvals/rejections
   - Log all temp password usage
   - Log suspicious login attempts

---

**Schema Documentation Complete** ✅
