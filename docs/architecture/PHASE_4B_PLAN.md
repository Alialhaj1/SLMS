# 🎯 Phase 4B - Advanced User & Role Management
**Enterprise-Grade User Administration**

**Status**: 📋 Planning Phase  
**Priority**: P0 (Critical for Production)  
**Estimated Duration**: 2 weeks  
**Dependencies**: Phase 4A Complete ✅

---

## 📊 Executive Summary

Phase 4B builds upon the solid RBAC foundation from Phase 4A to deliver **enterprise-grade user and role management** capabilities that meet Fortune 500 requirements.

### Why This Phase Matters

**Business Impact**:
- **CTO/CISO Requirement**: "Show me user management before we deploy"
- **Compliance**: SOC 2, ISO 27001 mandate role audit trails
- **Operational**: Reduces admin overhead by 80% (role templates vs manual setup)
- **Security**: Prevents privilege creep, tracks permission changes

**Technical Debt Prevention**:
- No role management = Manual SQL updates = Disaster waiting to happen
- No audit trail = Compliance violation = Failed audits
- No user locking = Deletion = Data integrity issues

---

## 🎯 Goals & Success Criteria

### Primary Goals
1. **Role Management UI** - Create, edit, delete, clone roles with permission matrix
2. **User Management Enhancement** - Disable/enable users, track login activity
3. **Audit Trail** - Comprehensive logging of all role/user changes
4. **Templates** - Pre-built role presets (Admin, Manager, Viewer)

### Success Criteria
- [ ] Admin can create role from template in < 30 seconds
- [ ] All role changes logged with before/after states
- [ ] Disabled users cannot login (soft lock, no deletion)
- [ ] Last login visible in user list
- [ ] Failed login attempts tracked and displayed

---

## 🏗️ Architecture Overview

### Database Changes

#### New Tables
```sql
-- Role templates (predefined configurations)
CREATE TABLE role_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL, -- Array of permission strings
  is_system BOOLEAN DEFAULT false, -- Cannot be modified
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User activity tracking
CREATE TABLE user_activity (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL, -- login, logout, failed_login, password_reset
  ip_address VARCHAR(45),
  user_agent TEXT,
  metadata JSONB, -- Additional context
  created_at TIMESTAMP DEFAULT NOW()
);

-- User status history (soft lock/unlock trail)
CREATE TABLE user_status_history (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  old_status VARCHAR(20), -- active, disabled, locked
  new_status VARCHAR(20),
  reason TEXT,
  changed_by INT REFERENCES users(id),
  changed_at TIMESTAMP DEFAULT NOW()
);
```

#### Modified Tables
```sql
-- Add new columns to users table
ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'active'; -- active, disabled, locked
ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP;
ALTER TABLE users ADD COLUMN last_login_ip VARCHAR(45);
ALTER TABLE users ADD COLUMN failed_login_count INT DEFAULT 0;
ALTER TABLE users ADD COLUMN locked_until TIMESTAMP;
ALTER TABLE users ADD COLUMN disabled_at TIMESTAMP;
ALTER TABLE users ADD COLUMN disabled_by INT REFERENCES users(id);
ALTER TABLE users ADD COLUMN disable_reason TEXT;

-- Add read_only flag to roles table
ALTER TABLE roles ADD COLUMN is_read_only BOOLEAN DEFAULT false;
ALTER TABLE roles ADD COLUMN is_system BOOLEAN DEFAULT false; -- Cannot be deleted
ALTER TABLE roles ADD COLUMN cloned_from INT REFERENCES roles(id); -- Track clones
```

---

## 🛠️ Feature Specifications

### 1️⃣ Role Templates (Pre-built Configurations)

#### System Templates (Immutable)
```typescript
const ROLE_TEMPLATES = [
  {
    name: 'System Administrator',
    description: 'Full system access (all permissions)',
    permissions: ['*:*'], // Wildcard
    icon: '🔧',
    isSystem: true
  },
  {
    name: 'Operations Manager',
    description: 'Manage shipments, expenses, suppliers',
    permissions: [
      'shipments:*',
      'expenses:*',
      'suppliers:*',
      'products:*',
      'branches:view',
      'users:view'
    ],
    icon: '📦',
    isSystem: true
  },
  {
    name: 'Accountant',
    description: 'Financial operations and reporting',
    permissions: [
      'expenses:*',
      'shipments:view',
      'suppliers:view',
      'audit_logs:view',
      'settings:view'
    ],
    icon: '💰',
    isSystem: true
  },
  {
    name: 'Warehouse Staff',
    description: 'View and update shipments only',
    permissions: [
      'shipments:view',
      'shipments:edit',
      'products:view'
    ],
    icon: '📋',
    isSystem: true
  },
  {
    name: 'Read-Only Viewer',
    description: 'View-only access to all modules',
    permissions: [
      'shipments:view',
      'expenses:view',
      'suppliers:view',
      'products:view',
      'branches:view',
      'companies:view',
      'users:view',
      'audit_logs:view'
    ],
    icon: '👁️',
    isSystem: true,
    isReadOnly: true
  }
];
```

#### UI: Role Template Selection
```tsx
// /admin/roles/create
<RoleTemplateSelector>
  {/* Grid of template cards */}
  <TemplateCard
    icon="🔧"
    name="System Administrator"
    description="Full system access"
    onClick={() => createFromTemplate('system_admin')}
  />
  
  <TemplateCard
    icon="💰"
    name="Accountant"
    description="Financial operations"
    onClick={() => createFromTemplate('accountant')}
  />
  
  {/* Or custom from scratch */}
  <TemplateCard
    icon="➕"
    name="Custom Role"
    description="Build from scratch"
    onClick={() => setMode('custom')}
  />
</RoleTemplateSelector>
```

---

### 2️⃣ Clone Role (Duplicate & Modify)

#### Backend API
```typescript
// POST /api/roles/:id/clone
router.post('/:id/clone', authenticate, requirePermission('roles:create'), 
  async (req, res) => {
    const { id } = req.params;
    const { newName, newDescription } = req.body;
    
    // 1. Fetch original role
    const original = await pool.query('SELECT * FROM roles WHERE id = $1', [id]);
    
    if (!original.rows[0]) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    // 2. Get permissions
    const perms = await pool.query(
      `SELECT resource, action FROM role_permissions WHERE role_id = $1`,
      [id]
    );
    
    // 3. Create new role
    const newRole = await pool.query(
      `INSERT INTO roles (name, description, cloned_from, created_at) 
       VALUES ($1, $2, $3, NOW()) RETURNING *`,
      [newName || `${original.rows[0].name} (Copy)`, newDescription, id]
    );
    
    // 4. Copy permissions
    for (const perm of perms.rows) {
      await pool.query(
        `INSERT INTO role_permissions (role_id, resource, action) 
         VALUES ($1, $2, $3)`,
        [newRole.rows[0].id, perm.resource, perm.action]
      );
    }
    
    // 5. Audit log
    await logAudit({
      action: 'clone',
      resource: 'role',
      resourceId: newRole.rows[0].id,
      afterData: { ...newRole.rows[0], clonedFrom: id }
    });
    
    res.json(newRole.rows[0]);
  }
);
```

#### Frontend UI
```tsx
// In role list or detail view
<Button
  icon={<DocumentDuplicateIcon />}
  onClick={() => setCloneModal(role.id)}
>
  Clone Role
</Button>

{/* Clone Modal */}
<ConfirmDialog
  title="Clone Role"
  open={cloneModal === role.id}
  onConfirm={async () => {
    await api.post(`/api/roles/${role.id}/clone`, {
      newName: `${role.name} (Copy)`,
      newDescription: role.description
    });
    toast.success('Role cloned successfully');
  }}
>
  <p>Create a copy of <strong>{role.name}</strong> with all permissions?</p>
  <Input 
    label="New Role Name" 
    value={newRoleName}
    onChange={(e) => setNewRoleName(e.target.value)}
  />
</ConfirmDialog>
```

---

### 3️⃣ Read-Only Roles

#### Implementation
```typescript
// Add is_read_only flag to roles table
// Frontend: Show badge
{role.is_read_only && (
  <Badge variant="gray">
    <EyeIcon className="w-4 h-4" />
    Read-Only
  </Badge>
)}

// Backend: Enforce read-only
// In role_permissions table, only allow :view actions
const readOnlyPermissions = permissions.filter(p => p.endsWith(':view'));
```

#### Permission Matrix UI
```tsx
<PermissionMatrix>
  {resources.map(resource => (
    <PermissionRow key={resource}>
      <ResourceName>{resource}</ResourceName>
      <Checkbox checked={hasPermission(`${resource}:view`)} label="View" />
      <Checkbox 
        checked={hasPermission(`${resource}:create`)} 
        label="Create"
        disabled={role.is_read_only} // Grayed out
      />
      <Checkbox 
        checked={hasPermission(`${resource}:edit`)} 
        label="Edit"
        disabled={role.is_read_only}
      />
      <Checkbox 
        checked={hasPermission(`${resource}:delete`)} 
        label="Delete"
        disabled={role.is_read_only}
      />
    </PermissionRow>
  ))}
</PermissionMatrix>
```

---

### 4️⃣ Audit Role Changes (Detailed Tracking)

#### What to Log
```typescript
interface RoleAuditLog {
  action: 'create' | 'update' | 'delete' | 'clone';
  roleId: number;
  roleName: string;
  before: {
    name?: string;
    description?: string;
    permissions?: string[]; // Array of 'resource:action'
  };
  after: {
    name?: string;
    description?: string;
    permissions?: string[];
  };
  diff: {
    added: string[]; // New permissions
    removed: string[]; // Revoked permissions
    modified: { field: string; old: any; new: any }[];
  };
  performedBy: number;
  performedAt: Date;
  ipAddress: string;
  userAgent: string;
}
```

#### Permission Diff Calculation
```typescript
function calculatePermissionDiff(
  before: string[], 
  after: string[]
): { added: string[]; removed: string[] } {
  const added = after.filter(p => !before.includes(p));
  const removed = before.filter(p => !after.includes(p));
  return { added, removed };
}

// Example
// Before: ['users:view', 'users:create']
// After:  ['users:view', 'users:edit']
// Diff:   { added: ['users:edit'], removed: ['users:create'] }
```

#### UI: Role Change History
```tsx
// /admin/roles/:id/history
<AuditTimeline>
  {history.map(entry => (
    <TimelineEntry key={entry.id}>
      <TimelineIcon action={entry.action} />
      <TimelineContent>
        <strong>{entry.performedBy.name}</strong> {entry.action}d role
        <TimelineMeta>
          {formatDate(entry.performedAt)} from {entry.ipAddress}
        </TimelineMeta>
        
        {/* Permission Changes */}
        {entry.diff.added.length > 0 && (
          <PermissionChanges variant="added">
            <PlusIcon /> Added: {entry.diff.added.join(', ')}
          </PermissionChanges>
        )}
        {entry.diff.removed.length > 0 && (
          <PermissionChanges variant="removed">
            <MinusIcon /> Removed: {entry.diff.removed.join(', ')}
          </PermissionChanges>
        )}
      </TimelineContent>
    </TimelineEntry>
  ))}
</AuditTimeline>
```

---

### 5️⃣ User Disable/Lock (Soft Disable)

#### Status Enum
```typescript
enum UserStatus {
  ACTIVE = 'active',       // Normal operation
  DISABLED = 'disabled',   // Admin disabled (manual)
  LOCKED = 'locked'        // Auto-locked (5+ failed logins)
}
```

#### Backend: Block Disabled/Locked Users
```typescript
// In auth middleware
export async function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  
  const payload = jwt.verify(token, JWT_SECRET);
  
  // Check user status
  const user = await pool.query(
    'SELECT id, email, status, locked_until FROM users WHERE id = $1',
    [payload.sub]
  );
  
  if (!user.rows[0]) {
    return res.status(401).json({ error: 'User not found' });
  }
  
  const u = user.rows[0];
  
  // Check if disabled
  if (u.status === 'disabled') {
    return res.status(403).json({ 
      error: 'Account disabled', 
      reason: 'Contact administrator' 
    });
  }
  
  // Check if locked (temporary)
  if (u.status === 'locked') {
    if (u.locked_until && new Date(u.locked_until) > new Date()) {
      return res.status(403).json({ 
        error: 'Account locked', 
        reason: `Try again after ${u.locked_until}` 
      });
    } else {
      // Auto-unlock if lock period expired
      await pool.query(
        'UPDATE users SET status = $1, locked_until = NULL WHERE id = $2',
        ['active', u.id]
      );
    }
  }
  
  req.user = u;
  next();
}
```

#### UI: Disable User
```tsx
// /admin/users
<UserRow>
  <UserInfo>
    <Avatar src={user.avatar} />
    <div>
      <UserName>{user.name}</UserName>
      <UserEmail>{user.email}</UserEmail>
    </div>
    {user.status === 'disabled' && (
      <Badge variant="red">Disabled</Badge>
    )}
    {user.status === 'locked' && (
      <Badge variant="yellow">Locked</Badge>
    )}
  </UserInfo>
  
  <Actions>
    {user.status === 'active' ? (
      <Button 
        variant="danger" 
        onClick={() => openDisableDialog(user.id)}
      >
        <LockClosedIcon /> Disable
      </Button>
    ) : (
      <Button 
        variant="success" 
        onClick={() => enableUser(user.id)}
      >
        <LockOpenIcon /> Enable
      </Button>
    )}
  </Actions>
</UserRow>

{/* Disable Dialog */}
<ConfirmDialog
  title="Disable User"
  open={disableDialog === user.id}
  variant="danger"
  onConfirm={async () => {
    await api.put(`/api/users/${user.id}/disable`, {
      reason: disableReason
    });
    toast.success('User disabled');
  }}
>
  <p>Disable <strong>{user.name}</strong>? They will not be able to login.</p>
  <Textarea
    label="Reason (required)"
    value={disableReason}
    onChange={(e) => setDisableReason(e.target.value)}
    placeholder="e.g., Employee terminated, security breach, etc."
  />
</ConfirmDialog>
```

---

### 6️⃣ Login Tracking & Failed Attempts UI

#### Backend: Track Login Activity
```typescript
// In /api/auth/login (successful login)
await pool.query(
  `UPDATE users 
   SET last_login_at = NOW(), 
       last_login_ip = $1, 
       failed_login_count = 0 
   WHERE id = $2`,
  [req.ip, user.id]
);

await pool.query(
  `INSERT INTO user_activity (user_id, activity_type, ip_address, user_agent) 
   VALUES ($1, $2, $3, $4)`,
  [user.id, 'login', req.ip, req.get('user-agent')]
);

// In /api/auth/login (failed login)
const failedCount = await pool.query(
  `UPDATE users 
   SET failed_login_count = failed_login_count + 1 
   WHERE id = $1 
   RETURNING failed_login_count`,
  [user.id]
);

// Auto-lock after 5 failures
if (failedCount.rows[0].failed_login_count >= 5) {
  await pool.query(
    `UPDATE users 
     SET status = 'locked', locked_until = NOW() + INTERVAL '15 minutes' 
     WHERE id = $1`,
    [user.id]
  );
  
  await logAudit({
    action: 'auto_lock',
    resource: 'user',
    resourceId: user.id,
    afterData: { reason: '5 failed login attempts' }
  });
}

await pool.query(
  `INSERT INTO user_activity (user_id, activity_type, ip_address, user_agent, metadata) 
   VALUES ($1, $2, $3, $4, $5)`,
  [user.id, 'failed_login', req.ip, req.get('user-agent'), 
   JSON.stringify({ attempts: failedCount.rows[0].failed_login_count })]
);
```

#### UI: User Activity Dashboard
```tsx
// /admin/users/:id/activity
<UserActivityPage>
  <StatCards>
    <StatCard>
      <StatLabel>Last Login</StatLabel>
      <StatValue>{formatDateTime(user.last_login_at)}</StatValue>
      <StatMeta>From {user.last_login_ip}</StatMeta>
    </StatCard>
    
    <StatCard variant={user.failed_login_count > 0 ? 'warning' : 'success'}>
      <StatLabel>Failed Login Attempts</StatLabel>
      <StatValue>{user.failed_login_count}</StatValue>
      <StatMeta>Since last successful login</StatMeta>
    </StatCard>
    
    <StatCard>
      <StatLabel>Total Logins</StatLabel>
      <StatValue>{activity.filter(a => a.type === 'login').length}</StatValue>
      <StatMeta>Last 30 days</StatMeta>
    </StatCard>
  </StatCards>
  
  <ActivityTimeline>
    <TimelineTitle>Recent Activity</TimelineTitle>
    {activity.map(entry => (
      <TimelineEntry key={entry.id}>
        <TimelineIcon 
          type={entry.activity_type} 
          variant={entry.activity_type === 'failed_login' ? 'danger' : 'success'}
        />
        <TimelineContent>
          <ActivityType>{formatActivityType(entry.activity_type)}</ActivityType>
          <ActivityMeta>
            {formatDateTime(entry.created_at)} from {entry.ip_address}
          </ActivityMeta>
          <ActivityDetails>
            User-Agent: {entry.user_agent}
          </ActivityDetails>
        </TimelineContent>
      </TimelineEntry>
    ))}
  </ActivityTimeline>
</UserActivityPage>
```

---

## 📋 Implementation Checklist

### Week 1: Database & Backend

#### Database Migrations
- [ ] Create `role_templates` table
- [ ] Create `user_activity` table
- [ ] Create `user_status_history` table
- [ ] Add `status`, `last_login_at`, `last_login_ip` to `users`
- [ ] Add `failed_login_count`, `locked_until` to `users`
- [ ] Add `disabled_at`, `disabled_by`, `disable_reason` to `users`
- [ ] Add `is_read_only`, `is_system`, `cloned_from` to `roles`
- [ ] Seed role templates (5 presets)

#### Backend APIs
- [ ] `GET /api/roles/templates` - List templates
- [ ] `POST /api/roles/from-template` - Create role from template
- [ ] `POST /api/roles/:id/clone` - Clone existing role
- [ ] `GET /api/roles/:id/history` - Role change audit trail
- [ ] `PUT /api/users/:id/disable` - Disable user (with reason)
- [ ] `PUT /api/users/:id/enable` - Enable user
- [ ] `GET /api/users/:id/activity` - Login activity
- [ ] Update `/api/auth/login` - Track login attempts, auto-lock
- [ ] Update auth middleware - Block disabled/locked users

#### Security
- [ ] Validate disable reason (min 10 chars)
- [ ] Log all role permission changes
- [ ] Log all user status changes
- [ ] Rate limit user enable/disable endpoints

---

### Week 2: Frontend & Testing

#### Frontend Pages
- [ ] `/admin/roles/templates` - Template selection page
- [ ] `/admin/roles/:id/clone` - Clone role modal
- [ ] `/admin/roles/:id/history` - Role audit trail
- [ ] `/admin/users/:id/activity` - User activity dashboard
- [ ] Update `/admin/users` - Add disable/enable actions
- [ ] Update `/admin/users` - Show last login, failed attempts

#### Components
- [ ] `<RoleTemplateSelector />` - Grid of template cards
- [ ] `<PermissionMatrix />` - Checkbox grid for permissions
- [ ] `<PermissionDiff />` - Show added/removed permissions
- [ ] `<UserStatusBadge />` - Active/Disabled/Locked indicator
- [ ] `<DisableUserDialog />` - Reason input + confirmation
- [ ] `<ActivityTimeline />` - Login history timeline

#### Testing
- [ ] Test role template creation (5 templates)
- [ ] Test role cloning (permissions copied correctly)
- [ ] Test read-only role (cannot add write permissions)
- [ ] Test user disable (cannot login after disable)
- [ ] Test auto-lock (5 failed attempts → 15 min lock)
- [ ] Test user enable (can login after enable)
- [ ] Test activity tracking (last login displayed)
- [ ] Test role audit trail (permission diffs shown)

---

## 🎨 UI/UX Mockups

### Role Templates Page
```
┌─────────────────────────────────────────────────────┐
│  Create Role                                     [X] │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Choose a template to get started:                  │
│                                                      │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐      │
│  │    🔧     │  │    📦     │  │    💰     │      │
│  │  System   │  │Operations │  │Accountant │      │
│  │   Admin   │  │  Manager  │  │           │      │
│  │           │  │           │  │           │      │
│  │ All perms │  │ Shipments │  │ Financial │      │
│  │           │  │ Expenses  │  │  reports  │      │
│  └───────────┘  └───────────┘  └───────────┘      │
│                                                      │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐      │
│  │    📋     │  │    👁️     │  │    ➕     │      │
│  │ Warehouse │  │ Read-Only │  │  Custom   │      │
│  │   Staff   │  │  Viewer   │  │   Role    │      │
│  │           │  │           │  │           │      │
│  │View/Edit  │  │ View all  │  │Build from │      │
│  │shipments  │  │ modules   │  │  scratch  │      │
│  └───────────┘  └───────────┘  └───────────┘      │
│                                                      │
│                           [Cancel] [Continue] →     │
└─────────────────────────────────────────────────────┘
```

### User List with Status
```
┌─────────────────────────────────────────────────────┐
│  Users                          [+ Create User]      │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Name              Role        Last Login   Status  │
│  ────────────────────────────────────────────────  │
│  👤 John Doe      Admin        2 hours ago  🟢      │
│     john@slms.com                          Active   │
│                                          [Edit] [...] │
│                                                      │
│  👤 Jane Smith    Accountant   1 day ago   🔴      │
│     jane@slms.com                        Disabled   │
│                                      [Enable] [...]  │
│                                                      │
│  👤 Bob Johnson   Warehouse    Never       🟡      │
│     bob@slms.com                          Locked    │
│                              (Until 15 min from now) │
│                                      [Unlock] [...]  │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### User Activity Timeline
```
┌─────────────────────────────────────────────────────┐
│  User Activity - John Doe                           │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌────────┐  ┌────────┐  ┌────────┐               │
│  │ Last   │  │ Failed │  │ Total  │               │
│  │ Login  │  │ Logins │  │ Logins │               │
│  │        │  │        │  │        │               │
│  │2 hrs   │  │   0    │  │  127   │               │
│  │ago     │  │        │  │(30 days)               │
│  └────────┘  └────────┘  └────────┘               │
│                                                      │
│  Recent Activity:                                   │
│                                                      │
│  ✅ Login                                           │
│     Dec 17, 2025 10:30 AM from 192.168.1.100      │
│     Chrome 120 on Windows 11                       │
│                                                      │
│  ❌ Failed Login Attempt                           │
│     Dec 17, 2025 09:15 AM from 10.0.0.50          │
│     Firefox 121 on macOS                           │
│                                                      │
│  ✅ Login                                           │
│     Dec 16, 2025 08:00 AM from 192.168.1.100      │
│     Chrome 120 on Windows 11                       │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## 🔍 Testing Strategy

### Unit Tests (Backend)
```typescript
describe('Role Management', () => {
  it('should create role from template', async () => {
    const res = await request(app)
      .post('/api/roles/from-template')
      .send({ templateId: 'accountant', name: 'Junior Accountant' })
      .expect(200);
    
    expect(res.body.permissions).toContain('expenses:view');
    expect(res.body.permissions).toContain('expenses:create');
  });
  
  it('should clone role with all permissions', async () => {
    const res = await request(app)
      .post('/api/roles/1/clone')
      .send({ newName: 'Admin (Copy)' })
      .expect(200);
    
    const originalPerms = await getRolePermissions(1);
    const clonedPerms = await getRolePermissions(res.body.id);
    expect(clonedPerms).toEqual(originalPerms);
  });
  
  it('should disable user and block login', async () => {
    await request(app)
      .put('/api/users/1/disable')
      .send({ reason: 'Security breach' })
      .expect(200);
    
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user1@test.com', password: 'correct' })
      .expect(403);
    
    expect(loginRes.body.error).toBe('Account disabled');
  });
  
  it('should auto-lock after 5 failed attempts', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@test.com', password: 'wrong' });
    }
    
    const user = await getUser('user@test.com');
    expect(user.status).toBe('locked');
    expect(user.locked_until).toBeDefined();
  });
});
```

### Integration Tests (Frontend)
```typescript
describe('User Management UI', () => {
  it('should show disable button for active users', () => {
    render(<UserList users={mockUsers} />);
    const activeUser = screen.getByText('John Doe');
    expect(within(activeUser).getByText('Disable')).toBeInTheDocument();
  });
  
  it('should show enable button for disabled users', () => {
    render(<UserList users={mockDisabledUsers} />);
    const disabledUser = screen.getByText('Jane Smith');
    expect(within(disabledUser).getByText('Enable')).toBeInTheDocument();
  });
  
  it('should display last login time', () => {
    render(<UserList users={mockUsers} />);
    expect(screen.getByText('2 hours ago')).toBeInTheDocument();
  });
});
```

---

## 📈 Success Metrics

### Pre-Implementation Metrics (Baseline)
- **Role Creation Time**: 10-15 minutes (manual SQL)
- **Permission Errors**: 2-3 per week (incorrect permissions)
- **User Disable Process**: Delete user (data loss)
- **Audit Trail**: Incomplete (no role changes logged)

### Post-Implementation Metrics (Goals)
- **Role Creation Time**: < 30 seconds (templates)
- **Permission Errors**: 0 (UI validation)
- **User Disable Process**: Soft disable (data preserved)
- **Audit Trail**: 100% coverage (all changes logged)

### KPIs to Track
- **Time to create role** (from template vs custom)
- **Number of role clones** (measure template reuse)
- **Failed login attempts per user** (security monitoring)
- **User disable rate** (operational metric)
- **Audit log queries** (compliance usage)

---

## 🚀 Deployment Plan

### Pre-Deployment
1. **Database Backup** (full backup before migrations)
2. **Staging Testing** (all features tested in staging)
3. **User Acceptance Testing** (admin team approves UI)
4. **Documentation** (admin guide for role management)

### Deployment Steps
```bash
# 1. Database migrations
cd backend
npm run migrate

# 2. Seed role templates
psql -U slms -d slms_db -f migrations/seed_role_templates.sql

# 3. Rebuild and restart
docker-compose down
docker-compose up --build

# 4. Verify templates loaded
curl http://localhost:4000/api/roles/templates

# 5. Test user disable
# (use admin UI to disable test user, verify login blocked)
```

### Rollback Plan
```sql
-- If issues found, rollback migrations:
-- 1. Remove new columns
ALTER TABLE users DROP COLUMN status;
ALTER TABLE users DROP COLUMN last_login_at;
ALTER TABLE roles DROP COLUMN is_read_only;

-- 2. Drop new tables
DROP TABLE user_activity;
DROP TABLE user_status_history;
DROP TABLE role_templates;

-- 3. Restore from backup
psql -U slms -d slms_db < backup_pre_phase4b.sql
```

---

## 📚 Documentation Requirements

### For Administrators
- **Role Templates Guide** - How to use pre-built templates
- **Clone Role Tutorial** - Step-by-step cloning process
- **User Disable Workflow** - When and how to disable users
- **Activity Monitoring** - Reading user activity logs

### For Developers
- **API Reference** - New endpoints and payloads
- **Database Schema** - New tables and columns
- **Permission Model** - How read-only roles work
- **Testing Guide** - Unit and integration tests

---

## 🎯 Next Steps After Phase 4B

### Phase 5: Dashboard KPIs
- Real-time statistics
- Charts and graphs
- Export functionality

### Phase 6: Advanced Features
- MFA (Two-Factor Authentication)
- SSO (Single Sign-On) integration
- API keys for third-party integrations
- Webhook notifications

---

## ✅ Definition of Done

Phase 4B is **COMPLETE** when:

- [ ] All 5 role templates created and seedable
- [ ] Clone role functionality tested (permissions match)
- [ ] Read-only roles enforced (cannot add write permissions)
- [ ] User disable/enable working (with reason required)
- [ ] Auto-lock after 5 failed attempts (15 min lock)
- [ ] Last login displayed in user list
- [ ] Failed login count visible
- [ ] Activity timeline shows recent logins
- [ ] Role change audit trail complete (permission diffs)
- [ ] All unit tests passing
- [ ] Manual testing checklist completed
- [ ] Documentation updated (admin + developer)
- [ ] Demo ready for stakeholders

---

**Status**: 📋 Planning Complete  
**Ready to Start**: Awaiting approval  
**Estimated Effort**: 80 hours (2 weeks, 1 developer)  
**Next Action**: Review plan, approve, begin Week 1 (Database & Backend)

---

**Document Version**: 1.0  
**Last Updated**: December 17, 2025  
**Author**: Development Team  
**Reviewed By**: (Pending)
