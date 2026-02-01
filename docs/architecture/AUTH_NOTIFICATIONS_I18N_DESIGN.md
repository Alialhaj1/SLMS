# 🏗️ Architecture & Implementation Plan
## Login + Forgot Password + Notifications + i18n

**Status:** Design Phase - Ready for Implementation  
**Date:** December 21, 2025  
**Scope:** Complete end-to-end architecture for authentication UX, admin-controlled password reset, notifications system, and bilingual support

---

## 📋 Table of Contents

1. [Database Schema](#1-database-schema)
2. [Backend API Design](#2-backend-api-design)
3. [Frontend Architecture](#3-frontend-architecture)
4. [i18n Structure](#4-i18n-structure)
5. [Security Design](#5-security-design)
6. [Implementation Roadmap](#6-implementation-roadmap)

---

## 1️⃣ Database Schema

### 1.1 New Table: `password_reset_requests`

```sql
CREATE TABLE password_reset_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  
  -- Request Info
  reason TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  
  -- Status Management
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- 'pending' | 'approved' | 'rejected' | 'cancelled'
  
  -- Admin Action
  handled_by INTEGER REFERENCES users(id),
  handled_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  
  -- Temporary Password (if approved)
  temp_password_hash VARCHAR(255),
  temp_password_expires_at TIMESTAMP WITH TIME ZONE,
  temp_password_used BOOLEAN DEFAULT false,
  
  -- Audit Trail
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_prr_user_id ON password_reset_requests(user_id);
CREATE INDEX idx_prr_status ON password_reset_requests(status);
CREATE INDEX idx_prr_handled_by ON password_reset_requests(handled_by);
CREATE INDEX idx_prr_requested_at ON password_reset_requests(requested_at DESC);
```

### 1.2 New Table: `notifications`

```sql
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  
  -- Type & Category
  type VARCHAR(50) NOT NULL,
    -- 'password_reset_request' | 'suspicious_login' | 'user_disabled' 
    -- | 'role_changed' | 'permission_revoked' | 'account_locked'
  
  category VARCHAR(30) NOT NULL,
    -- 'security' | 'admin' | 'user' | 'system'
  
  priority VARCHAR(20) DEFAULT 'normal',
    -- 'low' | 'normal' | 'high' | 'critical'
  
  -- Content (i18n keys)
  title_key VARCHAR(100) NOT NULL,
  message_key VARCHAR(100) NOT NULL,
  
  -- Dynamic Data (JSON)
  payload JSONB DEFAULT '{}',
    -- Example: {"user_email": "test@example.com", "request_id": 123}
  
  -- Targeting
  target_user_id INTEGER REFERENCES users(id),
  target_role_id INTEGER REFERENCES roles(id),
    -- NULL target_role_id = all admins
    -- target_user_id takes precedence over target_role_id
  
  -- Related Entity
  related_entity_type VARCHAR(50),
    -- 'user' | 'role' | 'password_reset_request' | 'login_history'
  related_entity_id INTEGER,
  
  -- Status
  read_at TIMESTAMP WITH TIME ZONE,
  dismissed_at TIMESTAMP WITH TIME ZONE,
  
  -- URL for action
  action_url VARCHAR(255),
    -- Example: '/admin/password-requests/123'
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_notif_target_user ON notifications(target_user_id) WHERE target_user_id IS NOT NULL;
CREATE INDEX idx_notif_target_role ON notifications(target_role_id) WHERE target_role_id IS NOT NULL;
CREATE INDEX idx_notif_type ON notifications(type);
CREATE INDEX idx_notif_read_at ON notifications(read_at);
CREATE INDEX idx_notif_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notif_unread ON notifications(target_user_id, read_at) WHERE read_at IS NULL;
```

### 1.3 Update Table: `users`

```sql
-- Add new columns for i18n and security
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(5) DEFAULT 'ar';
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP WITH TIME ZONE;
```

### 1.4 Permissions to Add

```sql
-- Password Reset Requests
INSERT INTO permissions (name, description, category) VALUES
('password_requests.view', 'View password reset requests', 'admin'),
('password_requests.approve', 'Approve password reset requests', 'admin'),
('password_requests.reject', 'Reject password reset requests', 'admin');

-- Notifications
INSERT INTO permissions (name, description, category) VALUES
('notifications.view', 'View notifications', 'system'),
('notifications.create', 'Create notifications for others', 'admin'),
('notifications.delete', 'Delete notifications', 'admin');

-- Security Alerts
INSERT INTO permissions (name, description, category) VALUES
('security.alerts.view', 'View security alerts', 'security'),
('security.alerts.manage', 'Manage security alerts', 'security');
```

---

## 2️⃣ Backend API Design

### 2.1 Password Reset Requests API

#### **POST** `/api/auth/forgot-password`
- **Public Endpoint** (rate-limited)
- **Purpose:** User submits password reset request
- **Request:**
  ```json
  {
    "email": "user@example.com",
    "reason": "Forgot my password" // optional
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "message": "Request submitted. Administrator will review."
  }
  ```
- **Security:**
  - Always returns same response (don't leak if user exists)
  - Rate limit: 3 requests per hour per IP
  - Log all attempts
  - Create notification for admins if user exists

#### **GET** `/api/admin/password-requests`
- **Auth Required:** `password_requests.view`
- **Purpose:** List all password reset requests
- **Query Params:**
  - `status`: pending | approved | rejected | cancelled
  - `page`, `limit`
- **Response:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 123,
        "user": {
          "id": 45,
          "email": "user@example.com",
          "full_name": "User Name",
          "status": "active"
        },
        "reason": "Forgot password",
        "status": "pending",
        "requested_at": "2025-12-21T10:00:00Z",
        "ip_address": "192.168.1.1",
        "user_agent": "Mozilla/5.0..."
      }
    ],
    "meta": { "page": 1, "limit": 20, "total": 5 }
  }
  ```

#### **POST** `/api/admin/password-requests/:id/approve`
- **Auth Required:** `password_requests.approve`
- **Purpose:** Approve request and generate temporary password
- **Request:**
  ```json
  {
    "admin_notes": "Approved after verification",
    "temp_password_expires_hours": 24 // optional, default 24
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "temp_password": "TempPass123!@#",
    "expires_at": "2025-12-22T10:00:00Z",
    "message": "Temporary password generated. User must change on first login."
  }
  ```
- **Side Effects:**
  - Generate secure temporary password
  - Set `must_change_password = true`
  - Create notification for user
  - Log to audit_logs
  - Update request status to 'approved'

#### **POST** `/api/admin/password-requests/:id/reject`
- **Auth Required:** `password_requests.reject`
- **Request:**
  ```json
  {
    "admin_notes": "Insufficient verification"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "message": "Request rejected"
  }
  ```
- **Side Effects:**
  - Update status to 'rejected'
  - Create notification for user (optional)
  - Log to audit_logs

### 2.2 Notifications API

#### **GET** `/api/notifications`
- **Auth Required:** Yes
- **Purpose:** Get user's notifications
- **Query Params:**
  - `unread_only`: boolean
  - `type`: filter by type
  - `limit`: default 20, max 100
- **Response:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 789,
        "type": "password_reset_request",
        "category": "admin",
        "priority": "normal",
        "title_key": "notifications.password_reset.title",
        "message_key": "notifications.password_reset.message",
        "payload": {
          "user_email": "user@example.com",
          "request_id": 123
        },
        "action_url": "/admin/password-requests/123",
        "read_at": null,
        "created_at": "2025-12-21T10:00:00Z"
      }
    ],
    "meta": {
      "unread_count": 3,
      "total": 15
    }
  }
  ```

#### **GET** `/api/notifications/unread-count`
- **Auth Required:** Yes
- **Purpose:** Quick count for badge
- **Response:**
  ```json
  {
    "count": 3
  }
  ```

#### **POST** `/api/notifications/:id/mark-read`
- **Auth Required:** Yes (own notifications only)
- **Response:**
  ```json
  {
    "success": true
  }
  ```

#### **POST** `/api/notifications/mark-all-read`
- **Auth Required:** Yes
- **Response:**
  ```json
  {
    "success": true,
    "marked_count": 5
  }
  ```

#### **DELETE** `/api/notifications/:id`
- **Auth Required:** Yes (own) OR `notifications.delete`
- **Response:**
  ```json
  {
    "success": true
  }
  ```

### 2.3 Enhanced Auth API

#### **POST** `/api/auth/login`
- **Enhanced:** Check `must_change_password` flag
- **Response (if temp password):**
  ```json
  {
    "accessToken": "...",
    "refreshToken": "...",
    "user": { ... },
    "must_change_password": true,
    "redirect_to": "/change-password"
  }
  ```

#### **POST** `/api/auth/change-password`
- **Auth Required:** Yes
- **Purpose:** Change password (forced or voluntary)
- **Request:**
  ```json
  {
    "current_password": "TempPass123!@#",
    "new_password": "MyNewPassword123!",
    "confirm_password": "MyNewPassword123!"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "message": "Password changed successfully"
  }
  ```
- **Side Effects:**
  - Set `must_change_password = false`
  - Update `password_changed_at`
  - Revoke all refresh tokens
  - Log to audit_logs
  - Mark temp password as used

#### **GET** `/api/auth/me`
- **Auth Required:** Yes
- **Enhanced:** Include language preference
- **Response:**
  ```json
  {
    "id": 1,
    "email": "user@example.com",
    "full_name": "User Name",
    "roles": [...],
    "permissions": [...],
    "preferred_language": "ar",
    "must_change_password": false
  }
  ```

#### **PATCH** `/api/auth/me/language`
- **Auth Required:** Yes
- **Request:**
  ```json
  {
    "language": "en"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "language": "en"
  }
  ```

---

## 3️⃣ Frontend Architecture

### 3.1 File Structure (Next.js)

```
frontend-next/
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx           # Modern login form
│   │   ├── ForgotPasswordModal.tsx # Modal for forgot password
│   │   ├── ChangePasswordForm.tsx  # Force change password
│   │   └── ProtectedRoute.tsx      # Route guard
│   │
│   ├── notifications/
│   │   ├── NotificationBell.tsx    # Header bell icon + badge
│   │   ├── NotificationDropdown.tsx # Dropdown preview (5 latest)
│   │   ├── NotificationItem.tsx    # Single notification
│   │   └── NotificationList.tsx    # Full page list
│   │
│   ├── admin/
│   │   ├── PasswordRequestList.tsx
│   │   ├── PasswordRequestCard.tsx
│   │   ├── ApproveRequestModal.tsx
│   │   └── RejectRequestModal.tsx
│   │
│   └── shared/
│       ├── Layout.tsx              # Main layout with header
│       ├── Header.tsx              # Contains NotificationBell
│       ├── LanguageSwitch.tsx      # AR / EN toggle
│       ├── Modal.tsx               # Reusable modal
│       └── Button.tsx              # i18n-aware button
│
├── lib/
│   ├── api/
│   │   ├── auth.api.ts             # Auth API calls
│   │   ├── notifications.api.ts   # Notifications API
│   │   └── passwordRequests.api.ts # Admin API
│   │
│   ├── hooks/
│   │   ├── useAuth.ts              # Auth state & actions
│   │   ├── useNotifications.ts    # Notifications state
│   │   ├── useLanguage.ts         # i18n hook
│   │   └── usePermission.ts       # Permission check
│   │
│   ├── contexts/
│   │   ├── AuthContext.tsx        # Global auth state
│   │   ├── NotificationContext.tsx # Global notifications
│   │   └── LanguageContext.tsx    # Global language
│   │
│   ├── utils/
│   │   ├── api.ts                 # Axios instance
│   │   ├── validators.ts          # Form validation
│   │   └── date.ts                # Date formatting
│   │
│   └── i18n/
│       ├── config.ts              # i18n configuration
│       ├── useTranslation.ts      # Translation hook
│       └── rtl.ts                 # RTL utilities
│
├── locales/
│   ├── ar/
│   │   ├── common.json            # Shared translations
│   │   ├── auth.json              # Auth-specific
│   │   ├── notifications.json     # Notification messages
│   │   └── errors.json            # Error messages
│   │
│   └── en/
│       ├── common.json
│       ├── auth.json
│       ├── notifications.json
│       └── errors.json
│
├── pages/
│   ├── login.tsx                  # Login page
│   ├── change-password.tsx        # Force change password
│   ├── notifications/
│   │   └── index.tsx              # Full notifications page
│   │
│   └── admin/
│       ├── password-requests/
│       │   ├── index.tsx          # List all requests
│       │   └── [id].tsx           # Request details
│       │
│       └── users/
│           └── index.tsx
│
├── styles/
│   ├── globals.css                # Global + RTL styles
│   └── rtl.css                    # RTL overrides
│
└── types/
    ├── auth.types.ts
    ├── notification.types.ts
    └── passwordRequest.types.ts
```

### 3.2 Key Components Behavior

#### **LoginForm.tsx**
- Form fields: email, password
- "Remember me" checkbox
- "Forgot Password?" link → opens ForgotPasswordModal
- Language switcher at top
- Loading state during login
- Error messages from API
- Redirect logic:
  - If `must_change_password` → `/change-password`
  - Else → dashboard

#### **ForgotPasswordModal.tsx**
- Triggered by "Forgot Password?" link
- Shows informative message (i18n):
  - AR: "لا يمكن إعادة تعيين كلمة المرور ذاتيًا. يرجى التواصل مع مدير النظام."
  - EN: "Self password reset is not allowed. Please contact system administrator."
- Email input
- Optional reason textarea
- "Submit Request" button
- Success message: "Request submitted. Please wait for admin approval."
- Rate limit warning if hit

#### **NotificationBell.tsx**
- Icon: 🔔
- Badge with unread count (if > 0)
- onClick → toggle NotificationDropdown
- Real-time updates via polling (30s) or WebSocket

#### **NotificationDropdown.tsx**
- Shows latest 5 unread notifications
- Each notification: icon + title + time ago
- "Mark all as read" button
- "View all" link → `/notifications`
- Click notification → mark as read + navigate to action_url

#### **PasswordRequestList.tsx** (Admin)
- Table with columns:
  - User (email + name)
  - Reason
  - Status (badge)
  - Requested At
  - Actions (Approve / Reject)
- Filters: Status, Date Range
- Pagination
- Click row → details modal

---

## 4️⃣ i18n Structure

### 4.1 Translation Files

#### **locales/ar/auth.json**
```json
{
  "login": {
    "title": "تسجيل الدخول",
    "email": "البريد الإلكتروني",
    "password": "كلمة المرور",
    "remember_me": "تذكرني",
    "forgot_password": "نسيت كلمة المرور؟",
    "submit": "دخول",
    "loading": "جاري التحميل..."
  },
  
  "forgot_password": {
    "title": "نسيت كلمة المرور",
    "notice": "لا يمكن إعادة تعيين كلمة المرور ذاتيًا.",
    "contact_admin": "يرجى التواصل مع مدير النظام.",
    "request_will_submit": "سيتم إرسال طلب رسمي للإدارة.",
    "email_label": "بريدك الإلكتروني",
    "reason_label": "سبب الطلب (اختياري)",
    "submit_button": "إرسال الطلب",
    "success": "تم إرسال الطلب بنجاح. سيتم مراجعته من قبل الإدارة.",
    "rate_limit": "تم تجاوز عدد المحاولات. يرجى المحاولة لاحقاً."
  },
  
  "change_password": {
    "title": "تغيير كلمة المرور",
    "required_notice": "يجب تغيير كلمة المرور المؤقتة.",
    "current_password": "كلمة المرور الحالية",
    "new_password": "كلمة المرور الجديدة",
    "confirm_password": "تأكيد كلمة المرور",
    "submit": "تغيير كلمة المرور",
    "success": "تم تغيير كلمة المرور بنجاح"
  },
  
  "errors": {
    "invalid_credentials": "بيانات الدخول غير صحيحة",
    "account_disabled": "الحساب معطل. يرجى التواصل مع الإدارة.",
    "account_locked": "الحساب مقفل بسبب محاولات دخول فاشلة متعددة.",
    "passwords_mismatch": "كلمات المرور غير متطابقة",
    "weak_password": "كلمة المرور ضعيفة. يجب أن تحتوي على 8 أحرف على الأقل"
  }
}
```

#### **locales/ar/notifications.json**
```json
{
  "bell": {
    "title": "الإشعارات",
    "no_notifications": "لا توجد إشعارات جديدة",
    "mark_all_read": "تعليم الكل كمقروء",
    "view_all": "عرض الكل"
  },
  
  "types": {
    "password_reset_request": {
      "title": "طلب إعادة تعيين كلمة مرور",
      "message": "تم استلام طلب إعادة تعيين كلمة مرور من {{user_email}}"
    },
    "password_reset_approved": {
      "title": "تمت الموافقة على طلبك",
      "message": "تم إنشاء كلمة مرور مؤقتة. يرجى تسجيل الدخول وتغييرها."
    },
    "password_reset_rejected": {
      "title": "تم رفض طلب إعادة التعيين",
      "message": "تم رفض طلب إعادة تعيين كلمة المرور الخاص بك."
    },
    "suspicious_login": {
      "title": "محاولة دخول مشبوهة",
      "message": "تم اكتشاف محاولة دخول مشبوهة للمستخدم {{user_email}}"
    },
    "user_disabled": {
      "title": "تم تعطيل الحساب",
      "message": "تم تعطيل حسابك من قبل الإدارة"
    },
    "role_changed": {
      "title": "تم تغيير الدور",
      "message": "تم تحديث دورك في النظام"
    },
    "account_locked": {
      "title": "تم قفل الحساب",
      "message": "تم قفل حساب {{user_email}} بسبب محاولات دخول فاشلة متعددة"
    }
  },
  
  "list": {
    "title": "جميع الإشعارات",
    "filters": {
      "all": "الكل",
      "unread": "غير مقروء",
      "security": "أمان",
      "admin": "إداري"
    },
    "empty": "لا توجد إشعارات"
  }
}
```

#### **locales/ar/admin.json**
```json
{
  "password_requests": {
    "title": "طلبات إعادة تعيين كلمة المرور",
    "table": {
      "user": "المستخدم",
      "email": "البريد الإلكتروني",
      "reason": "السبب",
      "status": "الحالة",
      "requested_at": "تاريخ الطلب",
      "actions": "الإجراءات"
    },
    "status": {
      "pending": "قيد الانتظار",
      "approved": "موافق عليه",
      "rejected": "مرفوض",
      "cancelled": "ملغي"
    },
    "approve": {
      "title": "الموافقة على الطلب",
      "confirm": "هل أنت متأكد من الموافقة على هذا الطلب؟",
      "temp_password_label": "كلمة المرور المؤقتة",
      "expires_in": "تنتهي خلال (ساعات)",
      "admin_notes": "ملاحظات الإدارة",
      "submit": "موافقة وإنشاء كلمة مرور",
      "success": "تمت الموافقة. كلمة المرور المؤقتة: {{password}}"
    },
    "reject": {
      "title": "رفض الطلب",
      "reason_label": "سبب الرفض",
      "submit": "رفض الطلب",
      "success": "تم رفض الطلب"
    }
  }
}
```

### 4.2 i18n Configuration

#### **lib/i18n/config.ts** (Concept)
```typescript
// Use next-i18next or similar
export const i18nConfig = {
  defaultLocale: 'ar',
  locales: ['ar', 'en'],
  fallbackLng: 'ar',
  
  // Namespace loading
  ns: ['common', 'auth', 'notifications', 'admin', 'errors'],
  defaultNS: 'common',
  
  // RTL detection
  rtlLocales: ['ar'],
  
  // Interpolation
  interpolation: {
    escapeValue: false,
  },
};
```

#### **lib/i18n/useTranslation.ts** (Hook Concept)
```typescript
// Returns: { t, i18n, language, isRTL }
// Usage: const { t } = useTranslation('auth');
// t('login.title') → 'تسجيل الدخول'
```

### 4.3 RTL Styling Strategy

#### **styles/globals.css**
```css
/* Auto RTL based on html[dir] */
html[dir="rtl"] {
  direction: rtl;
  text-align: right;
}

html[dir="ltr"] {
  direction: ltr;
  text-align: left;
}

/* Auto-mirror utilities */
[dir="rtl"] .ml-4 { margin-right: 1rem; margin-left: 0; }
[dir="rtl"] .mr-4 { margin-left: 1rem; margin-right: 0; }
[dir="rtl"] .text-left { text-align: right; }
[dir="rtl"] .text-right { text-align: left; }

/* Icons that should mirror */
[dir="rtl"] .icon-arrow-right { transform: scaleX(-1); }
```

---

## 5️⃣ Security Design

### 5.1 Password Reset Security

**Principle:** Never leak user existence

| Scenario | Response |
|----------|----------|
| Email exists | "Request submitted. Administrator will review." |
| Email doesn't exist | "Request submitted. Administrator will review." (same) |
| Rate limit hit | "Too many requests. Try again later." |

**Rate Limiting:**
- Per IP: 3 requests per hour
- Per Email: 5 requests per day
- Use Redis or in-memory cache

**Audit Logging:**
- Log ALL forgot password attempts
- Include: IP, User-Agent, Email (hashed if not exists), Timestamp
- Flag: `user_exists: boolean`

**Notifications:**
- Only create notification if user exists
- Notify ALL admins with `password_requests.view` permission

### 5.2 Temporary Password Security

**Generation:**
- Length: 12-16 characters
- Include: Uppercase, Lowercase, Numbers, Symbols
- Use crypto.randomBytes() for entropy
- Hash before storing (bcrypt)

**Expiration:**
- Default: 24 hours
- Configurable by admin
- Auto-expire in database query

**One-Time Use:**
- Mark as used after first successful login
- Cannot reuse same temp password

**Force Change:**
- Set `must_change_password = true`
- Redirect to change password immediately after login
- Block all other routes until changed

### 5.3 Notification Security

**Permission-Based Visibility:**
```typescript
// Pseudo-logic for fetching notifications
function getNotificationsForUser(userId: number, userPermissions: string[]) {
  // Get notifications WHERE:
  // 1. target_user_id = userId
  // OR
  // 2. target_role_id IN (user's roles) AND user has required permission
  
  // Filter by permission
  // Example: security alerts require 'security.alerts.view'
}
```

**Sensitive Data:**
- Never include passwords in notifications
- Payload: Only safe data (email, name, timestamps)
- URLs: Verify user has permission before showing action button

### 5.4 General Security Measures

**Authentication:**
- JWT with short expiration (15 min)
- Refresh token rotation
- Revoke all tokens on password change

**HTTPS Only:**
- All API calls over HTTPS
- Secure cookies for tokens

**CSRF Protection:**
- Use CSRF tokens for state-changing operations

**Rate Limiting:**
- Login: 5 attempts per 15 min per IP
- Forgot Password: 3 per hour per IP
- API: 100 requests per 15 min per user

---

## 6️⃣ Implementation Roadmap

### Phase 1: Database & Backend Core (Day 1-2)

**Step 1.1: Database Migration**
- [ ] Create migration file: `014_password_reset_notifications.sql`
- [ ] Add `password_reset_requests` table
- [ ] Add `notifications` table
- [ ] Update `users` table (language, must_change_password)
- [ ] Insert new permissions
- [ ] Run migration: `npm run migrate`

**Step 1.2: Backend Services**
- [ ] Create `services/passwordResetService.ts`
  - createRequest()
  - getRequests()
  - approveRequest()
  - rejectRequest()
  - generateTempPassword()
  - markTempPasswordUsed()
  
- [ ] Create `services/notificationService.ts`
  - createNotification()
  - getNotificationsForUser()
  - getUnreadCount()
  - markAsRead()
  - markAllAsRead()
  - deleteNotification()
  
- [ ] Enhance `services/authService.ts`
  - Add temp password validation
  - Add force password change logic
  - Update login() to return must_change_password flag

**Step 1.3: Backend Routes**
- [ ] Create `routes/passwordReset.ts`
  - POST /forgot-password (public)
  - GET /admin/password-requests (admin)
  - POST /admin/password-requests/:id/approve
  - POST /admin/password-requests/:id/reject
  
- [ ] Create `routes/notifications.ts`
  - GET /notifications
  - GET /notifications/unread-count
  - POST /notifications/:id/mark-read
  - POST /notifications/mark-all-read
  - DELETE /notifications/:id
  
- [ ] Enhance `routes/auth.ts`
  - POST /change-password
  - PATCH /me/language
  - Update GET /me to include language

**Step 1.4: Rate Limiting & Security**
- [ ] Add rate limiter for forgot password
- [ ] Add audit logging for all password reset events
- [ ] Add notification creation hooks

### Phase 2: i18n Foundation (Day 2)

**Step 2.1: Translation Files**
- [ ] Create `frontend-next/locales/ar/` structure
- [ ] Create `frontend-next/locales/en/` structure
- [ ] Write translations for:
  - common.json (buttons, labels)
  - auth.json (login, forgot password, change password)
  - notifications.json (all notification types)
  - admin.json (password requests)
  - errors.json (all error messages)

**Step 2.2: i18n Setup**
- [ ] Install next-i18next
- [ ] Create `lib/i18n/config.ts`
- [ ] Create `lib/i18n/useTranslation.ts`
- [ ] Setup `next-i18next.config.js`
- [ ] Add language detection logic
- [ ] Add RTL support in globals.css

**Step 2.3: Language Context**
- [ ] Create `contexts/LanguageContext.tsx`
- [ ] Implement language switcher component
- [ ] Persist language in localStorage + user profile

### Phase 3: Frontend - Auth UI (Day 3-4)

**Step 3.1: API Layer**
- [ ] Create `lib/api/auth.api.ts`
  - login()
  - logout()
  - changePassword()
  - forgotPassword()
  - updateLanguage()
  
- [ ] Create `lib/api/passwordRequests.api.ts`
  - getRequests()
  - approveRequest()
  - rejectRequest()
  
- [ ] Create `lib/api/notifications.api.ts`
  - getNotifications()
  - getUnreadCount()
  - markAsRead()
  - markAllAsRead()

**Step 3.2: Auth Context & Hooks**
- [ ] Create `contexts/AuthContext.tsx`
  - Store user, tokens, permissions
  - isAuthenticated state
  - login/logout functions
  
- [ ] Create `hooks/useAuth.ts`
- [ ] Create `hooks/usePermission.ts`
- [ ] Create `components/auth/ProtectedRoute.tsx`

**Step 3.3: Login Page**
- [ ] Create `pages/login.tsx`
- [ ] Create `components/auth/LoginForm.tsx`
  - Email + Password inputs
  - Remember me checkbox
  - Language switcher
  - Forgot password link
  - Loading states
  - Error display
  - Redirect logic
  
- [ ] Style with Tailwind (modern, clean)
- [ ] Add form validation (Formik/React Hook Form)
- [ ] Test RTL layout

**Step 3.4: Forgot Password Modal**
- [ ] Create `components/auth/ForgotPasswordModal.tsx`
  - Informative message (AR/EN)
  - Email input
  - Reason textarea (optional)
  - Submit button
  - Success/Error messages
  - Rate limit warning
  
- [ ] Create `components/shared/Modal.tsx` (reusable)
- [ ] Test both languages
- [ ] Test rate limiting

**Step 3.5: Change Password Page**
- [ ] Create `pages/change-password.tsx`
- [ ] Create `components/auth/ChangePasswordForm.tsx`
  - Current password input
  - New password input
  - Confirm password input
  - Password strength indicator
  - Submit button
  - Validation rules
  
- [ ] Force redirect if must_change_password = true
- [ ] Test temp password flow

### Phase 4: Frontend - Notifications (Day 5)

**Step 4.1: Notification Context**
- [ ] Create `contexts/NotificationContext.tsx`
  - Store notifications
  - Unread count
  - Polling logic (30s interval)
  - Real-time update function
  
- [ ] Create `hooks/useNotifications.ts`

**Step 4.2: Notification Bell (Header)**
- [ ] Create `components/notifications/NotificationBell.tsx`
  - Bell icon (🔔)
  - Badge with unread count
  - Click to toggle dropdown
  - Real-time updates
  
- [ ] Create `components/notifications/NotificationDropdown.tsx`
  - Latest 5 unread notifications
  - Mark all as read button
  - View all link
  - Loading state
  
- [ ] Create `components/notifications/NotificationItem.tsx`
  - Icon based on type
  - Title (i18n)
  - Time ago
  - Click to navigate + mark read

**Step 4.3: Full Notifications Page**
- [ ] Create `pages/notifications/index.tsx`
- [ ] Create `components/notifications/NotificationList.tsx`
  - All notifications with pagination
  - Filters (type, status)
  - Delete button
  - Empty state
  
- [ ] Test with different notification types

**Step 4.4: Integration with Header**
- [ ] Update `components/shared/Header.tsx`
- [ ] Add NotificationBell to header
- [ ] Test positioning (RTL/LTR)

### Phase 5: Frontend - Admin Password Requests (Day 6)

**Step 5.1: Password Requests List**
- [ ] Create `pages/admin/password-requests/index.tsx`
- [ ] Create `components/admin/PasswordRequestList.tsx`
  - Table with all columns
  - Status filters
  - Search by email/name
  - Pagination
  - Row click → details
  
- [ ] Create `components/admin/PasswordRequestCard.tsx`

**Step 5.2: Approve/Reject Modals**
- [ ] Create `components/admin/ApproveRequestModal.tsx`
  - Show temp password after approval
  - Copy to clipboard button
  - Expiration hours input
  - Admin notes textarea
  
- [ ] Create `components/admin/RejectRequestModal.tsx`
  - Reason textarea
  - Confirm button

**Step 5.3: Permission Guards**
- [ ] Add permission checks to routes
- [ ] Hide approve/reject buttons if no permission
- [ ] Test with different user roles

### Phase 6: Testing & Polish (Day 7)

**Step 6.1: End-to-End Testing**
- [ ] Test full forgot password flow:
  - User submits request
  - Admin receives notification
  - Admin approves
  - User receives temp password
  - User logs in + forced change
  
- [ ] Test reject flow
- [ ] Test rate limiting
- [ ] Test i18n (switch language mid-flow)
- [ ] Test RTL layout

**Step 6.2: Security Testing**
- [ ] Verify no user existence leakage
- [ ] Test rate limits
- [ ] Test permission-based notification visibility
- [ ] Test token revocation on password change
- [ ] Test temp password expiration

**Step 6.3: UX Polish**
- [ ] Add loading skeletons
- [ ] Add success animations
- [ ] Improve error messages
- [ ] Add tooltips where needed
- [ ] Test accessibility (keyboard navigation)

**Step 6.4: Documentation**
- [ ] Update API_DOCUMENTATION.md
- [ ] Create user guide (how to request password reset)
- [ ] Create admin guide (how to handle requests)

---

## 7️⃣ Key Integration Points

### 7.1 Login Flow with Force Password Change

```
User enters credentials
  ↓
POST /api/auth/login
  ↓
AuthService.login() checks:
  - is temp password?
  - is temp password expired?
  - is temp password already used?
  ↓
If valid temp password:
  - Set must_change_password = true in response
  - Frontend redirects to /change-password
  - Block all other routes
  ↓
User changes password:
  - POST /api/auth/change-password
  - Mark temp password as used
  - Revoke all refresh tokens
  - Set must_change_password = false
  - Redirect to dashboard
```

### 7.2 Forgot Password → Notification → Approval Flow

```
1. User (Login Page):
   - Click "Forgot Password?"
   - Modal opens
   - Enter email + reason
   - Submit
   
2. Backend (POST /api/auth/forgot-password):
   - Check rate limit
   - Create password_reset_request (if user exists)
   - Create notification for admins with 'password_requests.view'
   - Log to audit_logs
   - Return success (always same message)
   
3. Admin (receives notification):
   - Bell icon shows +1
   - Click notification → navigate to password request
   
4. Admin (Password Requests Page):
   - See pending request
   - Click "Approve"
   - Modal shows temp password
   - Admin copies and shares with user
   
5. User (Login Page):
   - Receives temp password via secure channel
   - Logs in
   - Forced to change password
   - Access granted
```

### 7.3 Real-Time Notification Updates

**Option A: Polling (Simple)**
```
Every 30 seconds:
  - GET /api/notifications/unread-count
  - Update badge
  
When dropdown opens:
  - GET /api/notifications?limit=5&unread_only=true
  - Show latest
```

**Option B: WebSocket (Advanced)**
```
On login:
  - Connect to WebSocket
  - Subscribe to user's notification channel
  
Server sends:
  - { type: 'NEW_NOTIFICATION', payload: {...} }
  
Client:
  - Update NotificationContext
  - Show badge
  - Optional: Toast notification
```

---

## 8️⃣ Definitions & Glossary

**Temp Password:** Temporary password generated by admin, expires after 24h, must be changed on first login

**must_change_password:** Flag forcing user to change password before accessing system

**Notification Target:** User or role that should receive notification

**Notification Payload:** JSON data with dynamic values for message interpolation

**i18n Key:** Translation key like `auth.login.title`

**RTL:** Right-to-Left layout for Arabic

**Permission Guard:** Frontend component checking user permissions before rendering

**Audit Log:** Immutable record of security-relevant events

---

## 9️⃣ Success Criteria

- [ ] User can request password reset (no email sent)
- [ ] Request creates notification for admins
- [ ] Admin can approve/reject requests
- [ ] Temp password forces change on first login
- [ ] Notifications show in header bell
- [ ] Unread count updates in real-time
- [ ] All text is bilingual (AR/EN)
- [ ] RTL layout works perfectly
- [ ] No user existence leakage
- [ ] Rate limits enforced
- [ ] All actions logged to audit_logs
- [ ] Permissions properly restrict access

---

## 🔟 Non-Functional Requirements

**Performance:**
- Login: < 500ms
- Notification fetch: < 200ms
- Page load: < 2s

**Scalability:**
- Support 1000+ concurrent users
- Notification polling every 30s

**Accessibility:**
- WCAG 2.1 AA compliance
- Keyboard navigation
- Screen reader support

**Browser Support:**
- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest version)

---

**Ready for Implementation? Let's start with Phase 1.1 (Database Migration)** 🚀
