# Event Naming Convention

**Document Type:** Governance Policy  
**Status:** Active  
**Review Cycle:** Every 12 months  
**Owner:** Engineering Team  
**Last Updated:** February 1, 2026  

---

## Purpose

Establish consistent naming convention for domain events in SLMS to ensure:
- Business-oriented language (not technical jargon)
- Clear intent and purpose
- Consistency across all modules
- Easy understanding for non-technical stakeholders

**CTO Requirement:** "Event Naming Convention Doc - Past tense, Business-oriented, No technical words"

---

## Golden Rules

### Rule 1: Past Tense (Always)
Events represent **facts that have already occurred**.

✅ **Correct:**
- `ItemDetailsAmended`
- `ShipmentApproved`
- `ExpenseRejected`
- `InventoryAdjusted`

❌ **Incorrect:**
- `ItemUpdate` (present tense)
- `UpdateItem` (imperative)
- `ItemUpdating` (continuous tense)

---

### Rule 2: Business-Oriented (No Technical Terms)
Events should be understandable by business users (managers, accountants, auditors).

✅ **Correct:**
- `CustomerAddressChanged`
- `OrderCancelled`
- `PaymentReceived`
- `PeriodClosed`

❌ **Incorrect:**
- `RecordUpdated` (too technical)
- `RowInserted` (database-centric)
- `StateModified` (technical jargon)
- `EntityPersisted` (ORM language)

---

### Rule 3: Domain-Specific (Entity + Action)
Format: `<Entity><BusinessAction>` (e.g., `InvoiceIssued`, `ShipmentDispatched`)

✅ **Correct:**
- `ItemCreated`
- `SupplierActivated`
- `WarehouseRelocated`
- `UserPasswordReset`

❌ **Incorrect:**
- `DataChanged` (too generic)
- `Updated` (missing entity)
- `Process123Completed` (technical ID)

---

### Rule 4: Specificity Over Generality
Prefer specific action names over generic ones when they add clarity.

✅ **More Specific (Preferred):**
- `ExpenseApproved` (better than `ExpenseStatusChanged`)
- `OrderDispatched` (better than `OrderUpdated`)
- `InventoryRecounted` (better than `InventoryAdjusted`)

✅ **Generic (Acceptable):**
- `ItemDetailsAmended` (covers name, description, notes)
- `CustomerInformationUpdated` (covers address, phone, email)

---

## Naming Patterns by Module

### Master Data (Items, Groups, Warehouses, Suppliers)

| Event Name | Triggered When | Stakeholders |
|------------|----------------|--------------|
| `ItemCreated` | New item added | Inventory, Accounting |
| `ItemDetailsAmended` | Non-policy fields changed | Operations |
| `ItemPolicyLocked` | First inventory movement recorded | Accounting |
| `ItemDeactivated` | Item set to inactive | Inventory, Sales |
| `GroupHierarchyRestructured` | Parent group changed | Accounting |
| `WarehouseActivated` | New warehouse enabled | Operations |
| `SupplierCreditLimitIncreased` | Credit limit raised | Finance |

### Operations (Shipments, Expenses)

| Event Name | Triggered When | Stakeholders |
|------------|----------------|--------------|
| `ShipmentBooked` | New shipment created | Logistics, Customs |
| `ShipmentApproved` | Manager approves shipment | Finance, Logistics |
| `ShipmentDispatched` | Shipment leaves origin | Tracking, Customer |
| `ShipmentArrived` | Shipment reaches destination | Customs, Warehouse |
| `ExpenseSubmitted` | New expense recorded | Finance |
| `ExpenseApproved` | Manager approves expense | Accounting |
| `ExpenseRejected` | Manager rejects expense | Submitter |

### Accounting (Journals, Periods)

| Event Name | Triggered When | Stakeholders |
|------------|----------------|--------------|
| `JournalEntryPosted` | Manual journal posted | Accounting |
| `PeriodClosed` | Accounting period locked | Finance, Audit |
| `PeriodReopened` | Period unlocked by admin | Accounting |
| `TrialBalanceGenerated` | Report run | Finance |

### System (Users, Roles, Permissions)

| Event Name | Triggered When | Stakeholders |
|------------|----------------|--------------|
| `UserInvited` | New user invited | Admin |
| `UserActivated` | User account enabled | IT, Manager |
| `UserDeactivated` | User account disabled | IT, Manager |
| `RoleAssigned` | User given new role | Admin, Manager |
| `PermissionGranted` | User given permission | Admin |
| `PasswordChanged` | User updates password | Security |

---

## Anti-Patterns (Avoid These)

### ❌ Database-Centric Names
- `RowInserted` → ✅ `CustomerCreated`
- `RecordDeleted` → ✅ `OrderCancelled`
- `TableUpdated` → ✅ `InventoryAdjusted`

### ❌ Technical Jargon
- `StateMutated` → ✅ `StatusChanged`
- `EntityPersisted` → ✅ `DataSaved`
- `TransactionCommitted` → ✅ `PaymentCompleted`

### ❌ Ambiguous Actions
- `DataChanged` → ✅ `CustomerAddressUpdated`
- `ProcessCompleted` → ✅ `ApprovalWorkflowFinished`
- `OperationPerformed` → ✅ `InventoryRecounted`

### ❌ Present/Future Tense
- `Updating` → ✅ `Updated`
- `WillCreate` → ✅ `Created`
- `IsProcessing` → ✅ `Processed`

---

## Event Payload Guidelines

### Minimum Required Fields
All events MUST include:
```typescript
{
  eventId: string;           // Unique identifier (UUID)
  eventType: string;         // Event name (e.g., "ItemCreated")
  aggregateId: number;       // Entity ID
  aggregateType: string;     // Entity type (e.g., "item")
  occurredAt: Date;          // Timestamp
  userId: number;            // Who triggered
  companyId: number;         // Multi-tenant isolation
}
```

### Optional Contextual Fields
```typescript
{
  metadata: {
    reason?: string;         // Why (e.g., "Annual inventory recount")
    previousValue?: any;     // Before state (for audit)
    newValue?: any;          // After state (for audit)
    ipAddress?: string;      // Source IP
    userAgent?: string;      // Client info
  }
}
```

---

## Approval Process

### For New Events
1. **Propose:** Create event name following conventions
2. **Review:** Tech Lead reviews for consistency
3. **Document:** Add to this registry
4. **Implement:** Create TypeScript interface

### For Breaking Changes
1. **Deprecate:** Mark old event as deprecated (6 months notice)
2. **Dual Emit:** Emit both old and new events during transition
3. **Remove:** Delete old event after deprecation period

---

## Examples by Category

### State Transitions
- ✅ `OrderDrafted` → `OrderSubmitted` → `OrderApproved` → `OrderDispatched` → `OrderDelivered`
- ✅ `ExpenseRecorded` → `ExpenseApproved` → `ExpensePosted`
- ✅ `UserInvited` → `UserActivated` → `UserSuspended` → `UserDeactivated`

### Data Changes
- ✅ `CustomerAddressUpdated`
- ✅ `SupplierContactChanged`
- ✅ `ItemDescriptionAmended`

### Business Actions
- ✅ `InventoryRecounted`
- ✅ `PriceListRevised`
- ✅ `DiscountApplied`

---

## Phase 3 Implementation Checklist

When implementing domain events:

- [ ] Event name follows past tense rule
- [ ] Event name is business-oriented (no technical jargon)
- [ ] Event name is specific (not generic)
- [ ] Event interface includes all required fields
- [ ] Event documented in this registry
- [ ] Event handlers registered in event bus
- [ ] Integration tests written
- [ ] Business stakeholders understand the event name

---

## References

- Domain Events Pattern: Martin Fowler (https://martinfowler.com/eaaDev/DomainEvent.html)
- Event Sourcing: Greg Young
- SLMS Domain Events Interfaces: `backend/src/domain/events/domainEvents.ts`

---

## Lessons Learned

**Why Past Tense?**
- Events are **historical facts**, not commands or requests
- Past tense makes it clear the action already happened
- Consistency with event sourcing patterns

**Why Business-Oriented?**
- Non-technical stakeholders need to understand events for audit trails
- Accountants, managers, and auditors review event logs
- Business language bridges technical and business domains

**Why Specificity?**
- Generic names like "Updated" hide important context
- Specific names make logs more useful for troubleshooting
- Better monitoring and alerting (e.g., "alert on all OrderCancelled events")

---

**Review Date:** August 1, 2026  
**Next Steps:** Phase 3 implementation (event bus, handlers, persistent store)
