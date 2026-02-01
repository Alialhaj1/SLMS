# SLMS Backend APIs - System Administration

## 🔐 Authentication
All endpoints require Bearer token authentication:
```
Authorization: Bearer <your_jwt_token>
```

## 🏢 Companies API

### GET /api/companies
List all companies (soft-deleted excluded by default)

**Permissions Required:** `companies:view`

**Query Parameters:**
- `search` - Search by name, code, or email
- `is_active` - Filter by active status (true/false)
- `include_deleted` - Include soft-deleted records (true/false)

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "code": "COMP001",
      "name": "Al-Haj Trading Company",
      "name_ar": "شركة الحاج التجارية",
      "legal_name": "Al-Haj Trading Co. LLC",
      "tax_number": "123456789",
      "registration_number": "CR-001",
      "country": "Saudi Arabia",
      "city": "Riyadh",
      "address": "King Fahd Road",
      "phone": "+966 11 1234567",
      "email": "info@alhajco.com",
      "website": "https://alhajco.com",
      "currency": "SAR",
      "is_active": true,
      "is_default": true,
      "branches_count": 5,
      "created_by": 1,
      "created_by_name": "Ali Admin",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 1
}
```

### GET /api/companies/:id
Get single company details

**Permissions Required:** `companies:view`

### POST /api/companies
Create new company

**Permissions Required:** `companies:create`

**Request Body:**
```json
{
  "code": "COMP002",
  "name": "New Trading Company",
  "name_ar": "شركة التجارة الجديدة",
  "legal_name": "New Trading Co. LLC",
  "tax_number": "987654321",
  "country": "UAE",
  "city": "Dubai",
  "phone": "+971 4 1234567",
  "email": "info@newcompany.com",
  "currency": "AED",
  "is_active": true
}
```

**Validation Rules:**
- ✅ `code` - Required, unique, max 50 chars
- ✅ `name` - Required, max 255 chars
- ✅ `email` - Must be valid email format
- ✅ `website` - Must be valid URL or empty
- ✅ First company is automatically set as default

### PUT /api/companies/:id
Update existing company

**Permissions Required:** `companies:edit`

**Request Body:** (all fields optional)
```json
{
  "name": "Updated Company Name",
  "is_active": false
}
```

**Audit Logging:** Captures before/after state automatically

### DELETE /api/companies/:id
Soft delete company (sets deleted_at timestamp)

**Permissions Required:** `companies:delete`

**Validation Rules:**
- ❌ Cannot delete default company
- ❌ Cannot delete company with active branches

---

## 🏪 Branches API

### GET /api/branches
List all branches

**Permissions Required:** `branches:view`

**Query Parameters:**
- `company_id` - Filter by company
- `search` - Search by name, code, or city
- `is_active` - Filter by active status

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "company_id": 1,
      "company_name": "Al-Haj Trading Company",
      "code": "BR001",
      "name": "Riyadh Headquarters",
      "name_ar": "المقر الرئيسي - الرياض",
      "country": "Saudi Arabia",
      "city": "Riyadh",
      "address": "King Fahd Road, Building 5",
      "phone": "+966 11 1234567",
      "email": "riyadh@alhajco.com",
      "manager_name": "Ahmed Manager",
      "is_active": true,
      "is_headquarters": true,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 1
}
```

### POST /api/branches
Create new branch

**Permissions Required:** `branches:create`

**Request Body:**
```json
{
  "company_id": 1,
  "code": "BR002",
  "name": "Jeddah Branch",
  "name_ar": "فرع جدة",
  "country": "Saudi Arabia",
  "city": "Jeddah",
  "phone": "+966 12 1234567",
  "manager_name": "Mohammed Manager",
  "is_active": true,
  "is_headquarters": false
}
```

**Validation Rules:**
- ✅ `company_id` - Must reference existing company
- ✅ `code` - Unique within company
- ✅ Setting `is_headquarters=true` unsets other headquarters

### PUT /api/branches/:id
Update branch

**Permissions Required:** `branches:edit`

### DELETE /api/branches/:id
Soft delete branch

**Permissions Required:** `branches:delete`

**Validation Rules:**
- ❌ Cannot delete last branch of a company

---

## ⚙️ System Settings API

### GET /api/settings
Get all system settings (grouped by category)

**Permissions Required:** `system_settings:view`

**Response:**
```json
{
  "security": [
    {
      "id": 1,
      "key": "session_timeout",
      "value": 30,
      "data_type": "number",
      "category": "security",
      "description": "Session timeout in minutes",
      "is_public": false,
      "updated_at": "2024-01-01T00:00:00Z"
    },
    {
      "key": "password_min_length",
      "value": 8,
      "data_type": "number"
    }
  ],
  "general": [
    {
      "key": "default_language",
      "value": "en",
      "data_type": "string",
      "is_public": true
    }
  ]
}
```

### GET /api/settings/public
Get public settings (no authentication required)

**Response:**
```json
{
  "default_language": "en",
  "default_theme": "light",
  "date_format": "YYYY-MM-DD",
  "currency_symbol": "$"
}
```

### PUT /api/settings
Bulk update multiple settings

**Permissions Required:** `system_settings:edit`

**Request Body:**
```json
{
  "session_timeout": 60,
  "default_language": "ar",
  "password_min_length": 10
}
```

**Auto-Audit:** All changes are logged automatically

### PUT /api/settings/:key
Update single setting

**Permissions Required:** `system_settings:edit`

**Request Body:**
```json
{
  "value": 60
}
```

**Data Type Validation:**
- `number` - Must be valid number
- `boolean` - Must be true/false
- `json` - Must be valid JSON
- `string` - Any string value

---

## 📋 Audit Logs API

### GET /api/audit-logs
List audit logs with pagination

**Permissions Required:** `audit_logs:view`

**Query Parameters:**
- `user_id` - Filter by user
- `resource` - Filter by resource (companies, branches, etc.)
- `action` - Filter by action (create, update, delete, etc.)
- `date_from` - Start date (YYYY-MM-DD)
- `date_to` - End date (YYYY-MM-DD)
- `page` - Page number (default: 1)
- `limit` - Records per page (default: 50)

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "user_id": 4,
      "user_name": "Ali",
      "user_email": "ali@alhajco.com",
      "action": "create",
      "resource": "companies",
      "resource_id": 1,
      "before_data": null,
      "after_data": {
        "id": 1,
        "code": "COMP001",
        "name": "Al-Haj Trading Company"
      },
      "ip_address": "192.168.1.100",
      "user_agent": "Mozilla/5.0...",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 156,
    "totalPages": 4
  }
}
```

### GET /api/audit-logs/resources
Get list of unique resources (for filter dropdown)

**Response:**
```json
["companies", "branches", "users", "roles"]
```

### GET /api/audit-logs/actions
Get list of unique actions (for filter dropdown)

**Response:**
```json
["create", "update", "delete", "view"]
```

### GET /api/audit-logs/:id
Get single audit log entry with full details

### GET /api/audit-logs/stats/summary
Get audit logs statistics

**Query Parameters:**
- `date_from` - Start date
- `date_to` - End date

**Response:**
```json
{
  "actions": [
    { "action": "view", "count": 1250 },
    { "action": "create", "count": 45 },
    { "action": "update", "count": 89 }
  ],
  "resources": [
    { "resource": "companies", "count": 234 },
    { "resource": "branches", "count": 156 }
  ],
  "topUsers": [
    {
      "full_name": "Ali",
      "email": "ali@alhajco.com",
      "action_count": 456
    }
  ]
}
```

---

## 🛡️ Security Features

### RBAC (Role-Based Access Control)
- Every endpoint checks permissions before execution
- Super admin bypasses all permission checks
- Granular permissions: `resource:action` format
- Example: `companies:create`, `branches:delete`

### Audit Logging
- Automatic logging on all CREATE, UPDATE, DELETE operations
- Captures before/after state for updates
- Logs IP address and user agent
- Immutable audit trail

### Soft Delete
- All deletions are soft (sets `deleted_at` timestamp)
- Data remains in database for compliance
- Can be restored if needed
- Excluded from queries by default

### Input Validation
- Zod schema validation on all inputs
- Type safety enforced
- Duplicate checks (unique constraints)
- Foreign key validation

### Multi-tenant Ready
- Company isolation logic in place
- Branch-level access control foundation
- User-company assignment support

---

## 🧪 Testing with curl

### Login
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ali@alhajco.com",
    "password": "A11A22A33"
  }'
```

### Create Company
```bash
curl -X POST http://localhost:4000/api/companies \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "code": "COMP001",
    "name": "Test Company",
    "currency": "SAR"
  }'
```

### Get Companies
```bash
curl http://localhost:4000/api/companies \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Update Company
```bash
curl -X PUT http://localhost:4000/api/companies/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Updated Company Name"
  }'
```

### Delete Company
```bash
curl -X DELETE http://localhost:4000/api/companies/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📊 Database Schema

```sql
-- Run migration:
docker exec -i slms-postgres psql -U slms -d slms_db < backend/migrations/003_system_admin_tables.sql
```

---

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Run migration:**
   ```bash
   # Double-click: REBUILD-BACKEND.bat
   # Or manually:
   docker-compose up -d postgres
   docker exec -i slms-postgres psql -U slms -d slms_db < backend/migrations/003_system_admin_tables.sql
   ```

3. **Rebuild backend:**
   ```bash
   docker-compose build backend
   docker-compose up -d backend
   ```

4. **Test endpoints:**
   ```bash
   curl http://localhost:4000/api/health
   ```
