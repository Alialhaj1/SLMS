# Approval Workflow Engine - SLMS
**Smart Logistics Management System**  
**Version:** 3.0 (Phase 3 Ready)  
**Date:** February 1, 2026  
**Status:** Architecture Design

---

## Overview
This document defines the **Approval Workflow Engine** for SLMS.  
It enables **multi-step approvals** for sensitive operations with **audit trail** and **delegation support**.

---

## Workflow States

```
┌─────────────┐
│   DRAFT     │  User creates record
└──────┬──────┘
       │ submit()
       ▼
┌─────────────┐
│  PENDING    │  Awaiting approval
└──────┬──────┘
       │
       ├─ approve() ──────► ┌─────────────┐
       │                     │  APPROVED   │  Final state
       │                     └─────────────┘
       │
       ├─ reject() ───────► ┌─────────────┐
       │                     │  REJECTED   │  Back to draft
       │                     └─────────────┘
       │
       └─ recall() ───────► ┌─────────────┐
                             │   DRAFT     │  User cancels request
                             └─────────────┘
```

---

## Workflow Triggers

### 1. Item Deletion (With Movement)
**Trigger:** User attempts to delete item with inventory movement  
**Reason:** Prevents accidental data loss, protects accounting integrity

```
User Actions:
┌────────────────────────────────────────────────┐
│ 1. User clicks "Delete Item"                   │
│ 2. System checks: has_movement?                │
│    ├─ NO  → Delete immediately (200)           │
│    └─ YES → Create approval request (202)      │
└────────────────────────────────────────────────┘

Approval Flow:
┌────────────────────────────────────────────────┐
│ 3. Approval request created                    │
│    - State: PENDING                            │
│    - Assignee: Manager                         │
│    - Entity: item (ID: 123)                    │
│    - Action: DELETE                            │
│    - Reason: "Item no longer needed"           │
└────────────────────────────────────────────────┘

Manager Actions:
┌────────────────────────────────────────────────┐
│ 4. Manager reviews request                     │
│    ├─ APPROVE → Soft-delete item               │
│    │            (set deleted_at = NOW())       │
│    │            State: APPROVED                │
│    │                                            │
│    ├─ REJECT  → Keep item active               │
│    │            State: REJECTED                │
│    │            Notify user with reason        │
│    │                                            │
│    └─ COMMENT → Add clarification              │
│                 Request more info              │
└────────────────────────────────────────────────┘

Notifications:
┌────────────────────────────────────────────────┐
│ 5. User notified of decision                   │
│    - Email + In-app notification               │
│    - Approved: "Item deleted successfully"     │
│    - Rejected: "Deletion rejected: [reason]"   │
└────────────────────────────────────────────────┘
```

---

### 2. Expense Approval (Above Threshold)
**Trigger:** Expense amount > $1,000  
**Reason:** Financial control, fraud prevention

```
User Actions:
┌────────────────────────────────────────────────┐
│ 1. User creates expense                        │
│    - Amount: $1,500                            │
│    - Type: Supplier payment                    │
│    - Attachments: Invoice PDF                  │
└────────────────────────────────────────────────┘

System Checks:
┌────────────────────────────────────────────────┐
│ 2. Amount > threshold?                         │
│    ├─ NO  → Auto-approve (200)                 │
│    └─ YES → Create approval request (202)      │
│             - State: PENDING_APPROVAL          │
│             - Requires: 1 manager approval     │
└────────────────────────────────────────────────┘

Manager Actions:
┌────────────────────────────────────────────────┐
│ 3. Manager reviews expense                     │
│    - Check invoice validity                    │
│    - Verify supplier exists                    │
│    - Confirm budget availability               │
│                                                 │
│    ├─ APPROVE → Expense posted to accounting   │
│    │            State: APPROVED_POSTED          │
│    │            Journal entry created           │
│    │                                            │
│    └─ REJECT  → Expense returned to user       │
│                 State: REJECTED                │
│                 User can edit & resubmit       │
└────────────────────────────────────────────────┘
```

---

### 3. Policy Override (Locked Fields)
**Trigger:** Admin attempts to modify locked policy fields  
**Reason:** Accounting integrity, audit compliance

```
Admin Actions:
┌────────────────────────────────────────────────┐
│ 1. Admin edits item with movement              │
│    - Field: base_uom_id (locked)               │
│    - Current: 1 (Piece)                        │
│    - New: 2 (Carton)                           │
└────────────────────────────────────────────────┘

System Response:
┌────────────────────────────────────────────────┐
│ 2. Show modal:                                 │
│    "This field is locked. Override?"           │
│    - Requires: Permission.ITEM_OVERRIDE_POLICY │
│    - Action: Create approval request           │
└────────────────────────────────────────────────┘

Approval Flow (Optional - Company Policy):
┌────────────────────────────────────────────────┐
│ 3. If company requires approval:               │
│    - Create request for CFO/Controller         │
│    - State: PENDING_OVERRIDE                   │
│    - Attach: Business justification           │
│                                                 │
│ 4. If company allows direct override:          │
│    - Apply change immediately                  │
│    - Log to decision_logs table                │
│    - Audit flag: override_used = true          │
└────────────────────────────────────────────────┘
```

---

### 4. Accounting Period Reopen
**Trigger:** Accountant attempts to reopen closed period  
**Reason:** Prevents backdating, fraud detection

```
Accountant Actions:
┌────────────────────────────────────────────────┐
│ 1. Accountant clicks "Reopen Period"          │
│    - Period: January 2026 (CLOSED)            │
│    - Reason: "Correct expense entry error"     │
└────────────────────────────────────────────────┘

System Checks:
┌────────────────────────────────────────────────┐
│ 2. Period closed?                              │
│    └─ YES → Create approval request            │
│             - State: PENDING_REOPEN            │
│             - Assignee: CFO / Controller       │
│             - Risk: HIGH (audit flag)          │
└────────────────────────────────────────────────┘

CFO Review:
┌────────────────────────────────────────────────┐
│ 3. CFO reviews request                         │
│    - Check: External audit in progress?        │
│    - Verify: Valid business reason?            │
│    - Assess: Materiality of change?            │
│                                                 │
│    ├─ APPROVE → Period reopened                │
│    │            Temporary (24-hour window)     │
│    │            Auto-close after edit          │
│    │                                            │
│    └─ REJECT  → Period stays closed            │
│                 Notify: Use next period        │
└────────────────────────────────────────────────┘
```

---

## Database Schema

### `approval_requests` Table

```sql
CREATE TABLE approval_requests (
  id SERIAL PRIMARY KEY,
  
  -- Request metadata
  request_number VARCHAR(50) UNIQUE NOT NULL,  -- e.g., "APR-2026-001"
  state VARCHAR(20) NOT NULL DEFAULT 'draft',  -- draft, pending, approved, rejected
  
  -- Entity reference
  entity_type VARCHAR(50) NOT NULL,  -- 'item', 'expense', 'shipment', etc.
  entity_id INTEGER NOT NULL,
  action VARCHAR(50) NOT NULL,       -- 'delete', 'override_policy', 'close_period'
  
  -- Requester info
  requester_id INTEGER NOT NULL REFERENCES users(id),
  requester_reason TEXT,
  
  -- Approver info
  approver_id INTEGER REFERENCES users(id),
  approver_role VARCHAR(50),         -- 'manager', 'cfo', 'controller'
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  
  -- Change tracking
  before_data JSONB,                 -- Snapshot before change
  after_data JSONB,                  -- Proposed change
  
  -- Workflow metadata
  priority VARCHAR(20) DEFAULT 'normal',  -- low, normal, high, urgent
  expires_at TIMESTAMP,              -- Auto-reject after expiry
  
  -- Audit trail
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Soft delete
  deleted_at TIMESTAMP,
  
  -- Indexes
  CONSTRAINT valid_state CHECK (state IN ('draft', 'pending', 'approved', 'rejected', 'recalled'))
);

CREATE INDEX idx_approval_requests_state ON approval_requests(state, created_at DESC);
CREATE INDEX idx_approval_requests_assignee ON approval_requests(approver_id, state);
CREATE INDEX idx_approval_requests_entity ON approval_requests(entity_type, entity_id);
```

### `approval_comments` Table

```sql
CREATE TABLE approval_comments (
  id SERIAL PRIMARY KEY,
  approval_request_id INTEGER NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
  
  user_id INTEGER NOT NULL REFERENCES users(id),
  comment TEXT NOT NULL,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_approval_comments_request ON approval_comments(approval_request_id, created_at);
```

---

## API Endpoints

### 1. Create Approval Request
```http
POST /api/approvals
Authorization: Bearer <token>
Content-Type: application/json

{
  "entity_type": "item",
  "entity_id": 123,
  "action": "delete",
  "reason": "Item no longer in use",
  "priority": "normal"
}

Response (202 Accepted):
{
  "approval_request": {
    "id": 1,
    "request_number": "APR-2026-001",
    "state": "pending",
    "entity_type": "item",
    "entity_id": 123,
    "action": "delete",
    "requester_id": 5,
    "approver_role": "manager",
    "created_at": "2026-02-01T10:00:00Z"
  }
}
```

### 2. List Pending Approvals (Manager)
```http
GET /api/approvals?state=pending&role=manager
Authorization: Bearer <token>

Response (200 OK):
{
  "data": [
    {
      "id": 1,
      "request_number": "APR-2026-001",
      "entity_type": "item",
      "entity_id": 123,
      "action": "delete",
      "requester_name": "John Doe",
      "reason": "Item no longer in use",
      "created_at": "2026-02-01T10:00:00Z",
      "priority": "normal"
    }
  ],
  "total": 1
}
```

### 3. Approve Request
```http
POST /api/approvals/:id/approve
Authorization: Bearer <token>
Content-Type: application/json

{
  "comment": "Approved. Item replaced by new SKU."
}

Response (200 OK):
{
  "approval_request": {
    "id": 1,
    "state": "approved",
    "approved_at": "2026-02-01T11:00:00Z",
    "approver_id": 3
  }
}
```

### 4. Reject Request
```http
POST /api/approvals/:id/reject
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Item still has pending orders. Please verify."
}

Response (200 OK):
{
  "approval_request": {
    "id": 1,
    "state": "rejected",
    "rejection_reason": "Item still has pending orders. Please verify.",
    "rejected_at": "2026-02-01T11:00:00Z"
  }
}
```

---

## Notification System

### Channels
1. **In-app notifications** (real-time)
2. **Email notifications** (async)
3. **Push notifications** (mobile - future)

### Templates

#### Request Created
```
To: Manager
Subject: New Approval Request - Item Deletion

Hello [Manager Name],

A new approval request requires your attention:

Request: APR-2026-001
Type: Item Deletion
Item: [Item Code] - [Item Name]
Requester: [User Name]
Reason: [Requester Reason]
Priority: Normal

[View Request] [Approve] [Reject]

---
SLMS - Smart Logistics Management System
```

#### Request Approved
```
To: Requester
Subject: Approval Request Approved

Hello [User Name],

Your approval request has been approved:

Request: APR-2026-001
Type: Item Deletion
Approved by: [Manager Name]
Approved at: 2026-02-01 11:00 AM
Comment: [Approver Comment]

The action has been executed successfully.

---
SLMS
```

#### Request Rejected
```
To: Requester
Subject: Approval Request Rejected

Hello [User Name],

Your approval request has been rejected:

Request: APR-2026-001
Type: Item Deletion
Rejected by: [Manager Name]
Reason: [Rejection Reason]

You can edit your request and resubmit.

[Edit Request]

---
SLMS
```

---

## Frontend Components

### 1. Approval Request Modal
```tsx
<ApprovalRequestModal
  isOpen={showModal}
  entityType="item"
  entityId={itemId}
  action="delete"
  onSubmit={handleCreateRequest}
  onClose={() => setShowModal(false)}
/>
```

### 2. Pending Approvals List
```tsx
<ApprovalsList
  state="pending"
  role={user.role}
  onApprove={handleApprove}
  onReject={handleReject}
  onComment={handleComment}
/>
```

### 3. Approval Status Badge
```tsx
<ApprovalStatusBadge state={approval.state} />
// Output: 🟡 Pending / ✅ Approved / ❌ Rejected
```

---

## Business Rules

### Auto-Approval Rules
1. **Expense < $1,000** → Auto-approve
2. **User edits own draft** → No approval needed
3. **Admin with override permission** → Optional approval (company policy)

### Escalation Rules
1. **No response after 48 hours** → Escalate to senior manager
2. **Urgent priority** → Notify approver via SMS
3. **High-value expense** → Require 2 approvals (manager + CFO)

### Delegation Rules
1. **Manager on leave** → Auto-delegate to backup manager
2. **Approver unavailable** → Allow peer approval (same role)

---

## Testing Strategy

### Unit Tests
```typescript
describe('Approval Workflow', () => {
  it('should create approval request for item deletion', async () => {
    const result = await createApprovalRequest({
      entity_type: 'item',
      entity_id: 123,
      action: 'delete',
      reason: 'Test reason',
    });

    expect(result.state).toBe('pending');
    expect(result.request_number).toMatch(/APR-2026-\d+/);
  });

  it('should approve request and execute action', async () => {
    const approval = await approveRequest(1, managerId, 'Approved');

    expect(approval.state).toBe('approved');
    expect(approval.approver_id).toBe(managerId);

    // Verify action executed (item soft-deleted)
    const item = await getItem(123);
    expect(item.deleted_at).not.toBeNull();
  });
});
```

### Integration Tests
- Test full workflow (create → approve → execute)
- Test rejection flow (create → reject → notify)
- Test expiry (create → wait → auto-reject)
- Test escalation (create → no response → escalate)

---

## Performance Considerations

### Caching
- Cache pending approval count per user (Redis)
- Invalidate on approve/reject

### Indexing
- Index `state + created_at` (fast pending list)
- Index `approver_id + state` (manager dashboard)

### Async Processing
- Execute actions asynchronously (queue)
- Send notifications via background job

---

## Migration Path

### Phase 3.3: Approval Engine (Week 3)
1. Day 1-2: Create database tables + indexes
2. Day 3-4: Implement API endpoints
3. Day 5: Build frontend components
4. Day 6-7: Testing + documentation

---

**Document Owner:** CTO  
**Last Updated:** February 1, 2026  
**Implementation Target:** Phase 3.3 (Week 3)
