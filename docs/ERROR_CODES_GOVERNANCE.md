# Error Codes Governance

**Owner:** Technical Leadership  
**Status:** Active Policy  
**Effective Date:** January 31, 2026  
**Review Cycle:** Every 6 months

---

## Purpose

This document establishes **strict governance** for error code management in the SLMS system. Without governance, error codes proliferate uncontrollably, leading to:
- Duplicate error codes for same scenario
- Inconsistent error handling across codebase
- Breaking changes for API consumers
- Poor UX (confusing error messages)

---

## Error Code Registry

**Source of Truth:** `backend/src/types/errors.ts` → `ErrorCode` enum

### Current Error Codes (Phase 2.6)

| Code | HTTP Status | Entity | Scenario | Owner |
|------|-------------|--------|----------|-------|
| `ITEM_POLICY_LOCKED` | 409 | Item | Policy fields locked after movement | Items Module |
| `ITEM_HAS_MOVEMENT` | 409 | Item | Cannot delete item with movements | Items Module |
| `GROUP_HAS_CHILDREN` | 409 | ItemGroup | Cannot modify/delete group with children | Items Module |
| `GROUP_HAS_ITEMS` | 409 | ItemGroup | Cannot modify/delete group with items | Items Module |
| `VALIDATION_ERROR` | 400 | Generic | Input validation failure | Global |
| `DUPLICATE_CODE` | 409 | Generic | Unique constraint violation | Global |
| `INVALID_REFERENCE` | 400 | Generic | Foreign key violation | Global |
| `ENTITY_NOT_FOUND` | 404 | Generic | Resource not found | Global |
| `UNAUTHORIZED` | 401 | Auth | Missing/invalid authentication | Auth Module |
| `FORBIDDEN` | 403 | Auth | Insufficient permissions | Auth Module |
| `INVALID_TOKEN` | 401 | Auth | JWT token invalid/expired | Auth Module |
| `OPERATION_NOT_ALLOWED` | 409 | Generic | Business rule violation | Global |
| `CONCURRENT_MODIFICATION` | 409 | Generic | Optimistic lock failure | Global |

**Total:** 13 error codes (as of January 31, 2026)

---

## Governance Rules

### Rule 1: Reuse Before Creating ✅

**Before adding a new error code, check if existing code fits:**

```typescript
// ❌ DON'T: Create new code for similar scenario
WAREHOUSE_HAS_ITEMS  // Already covered by GROUP_HAS_ITEMS pattern

// ✅ DO: Reuse existing code with different entity
ErrorFactory.entityHasRelations('warehouse', warehouseId, 'items', count)
```

**When to reuse:**
- Same business logic (e.g., "cannot delete due to relations")
- Same HTTP status code
- Same user action required

**When to create new:**
- Fundamentally different business rule
- Different resolution path
- Different HTTP status code

---

### Rule 2: Naming Convention ✅

**Pattern:** `<ENTITY>_<ACTION>_<REASON>`

**Good Examples:**
- `ITEM_POLICY_LOCKED` (Item, modify policy, locked reason)
- `GROUP_HAS_CHILDREN` (Group, delete, has children reason)
- `SHIPMENT_ALREADY_DELIVERED` (Shipment, cancel, already delivered)

**Bad Examples:**
- ❌ `ERROR_1` (meaningless)
- ❌ `CANT_DO_THIS` (vague)
- ❌ `ItemLockedError` (not SCREAMING_SNAKE_CASE)

---

### Rule 3: Generic vs Specific ✅

**Generic Codes** (Reusable across modules):
- `VALIDATION_ERROR`
- `ENTITY_NOT_FOUND`
- `DUPLICATE_CODE`
- `OPERATION_NOT_ALLOWED`

**Specific Codes** (Module-specific):
- `ITEM_POLICY_LOCKED` (Items module only)
- `SHIPMENT_ALREADY_DELIVERED` (Shipments module only)

**Decision Matrix:**

| Question | Answer | Use |
|----------|--------|-----|
| Applies to 3+ modules? | Yes | Generic |
| Unique to 1 module? | Yes | Specific |
| Unclear? | Ask Tech Lead | Wait |

---

### Rule 4: Approval Process ✅

**Adding New Error Code:**

1. **Propose** - Create PR with:
   - Error code name
   - Scenario description
   - HTTP status code
   - Example usage
   - Why existing codes don't fit

2. **Review** - Tech Lead checks:
   - Can existing code be reused?
   - Naming follows convention?
   - Documentation complete?

3. **Approve** - Requires:
   - ✅ Tech Lead approval
   - ✅ Update `ErrorCode` enum
   - ✅ Add to `ErrorFactory`
   - ✅ Add to this governance doc
   - ✅ Add integration test

4. **Reject If:**
   - ❌ Duplicates existing code
   - ❌ Poor naming
   - ❌ Missing documentation
   - ❌ No tests

---

### Rule 5: Breaking Changes ✅

**Changing Error Code (Breaking Change):**

⚠️ **Requires Major Version Bump** (e.g., v2.0.0 → v3.0.0)

**Deprecation Process:**
1. Mark old code as `@deprecated` in enum
2. Add new code alongside
3. Support both for 2 releases
4. Remove old code in major version

**Example:**
```typescript
export enum ErrorCode {
  /** @deprecated Use ITEM_POLICY_LOCKED instead */
  POLICY_LOCKED = 'POLICY_LOCKED',
  
  ITEM_POLICY_LOCKED = 'ITEM_POLICY_LOCKED',  // New
}
```

---

### Rule 6: Documentation Requirements ✅

**Every Error Code Must Have:**

1. **Code Comment:**
```typescript
/**
 * Item policy fields locked after inventory movement
 * HTTP 409 - Conflict
 * Resolution: Create new item or revert movement
 */
ITEM_POLICY_LOCKED = 'ITEM_POLICY_LOCKED',
```

2. **Factory Function:**
```typescript
static itemPolicyLocked(
  entityId: number,
  lockedFields: string[]
): ApiError { ... }
```

3. **Integration Test:**
```typescript
it('should return ITEM_POLICY_LOCKED when modifying locked field', async () => {
  // ...
});
```

4. **This Registry Entry** (table above)

---

## Error Code Metrics

**Target Metrics:**
- **Total Codes:** < 50 (keep lean)
- **Generic Codes:** 30-40% (reusable)
- **Specific Codes:** 60-70% (module-specific)
- **Deprecated Codes:** < 10% (clean up regularly)

**Red Flags:**
- 🚨 10+ codes added in 1 month → Review patterns
- 🚨 5+ codes with similar names → Consolidate
- 🚨 Deprecated codes > 10% → Clean up debt

---

## Frontend Error Mapping

**Every error code MUST have frontend mapping:**

File: `frontend-next/utils/errorUiMap.ts`

```typescript
export const errorUiMap = {
  [ErrorCode.ITEM_POLICY_LOCKED]: {
    message_en: 'Cannot modify locked fields after inventory movement',
    message_ar: 'لا يمكن تعديل الحقول المقفلة بعد حركة المخزون',
    action: 'lock',      // UI behavior
    severity: 'error',
    toast: true,
    fieldHighlight: true,
  },
  // ...
};
```

**Missing frontend mapping = Reject PR**

---

## Review Process

### Monthly Review (First Monday of Month)
- Count new error codes added
- Check for duplicates
- Verify frontend mappings exist
- Update metrics

### Quarterly Review (First Monday of Quarter)
- Audit all error codes
- Identify consolidation opportunities
- Update deprecation timeline
- Review governance effectiveness

---

## Anti-Patterns (Don't Do This)

### ❌ Anti-Pattern 1: Generic Error Spam
```typescript
// BAD: Everything is OPERATION_NOT_ALLOWED
if (itemHasMovement) return OPERATION_NOT_ALLOWED;
if (groupHasChildren) return OPERATION_NOT_ALLOWED;
if (userLacksPermission) return OPERATION_NOT_ALLOWED;

// GOOD: Specific error codes
if (itemHasMovement) return ErrorCode.ITEM_HAS_MOVEMENT;
if (groupHasChildren) return ErrorCode.GROUP_HAS_CHILDREN;
if (userLacksPermission) return ErrorCode.FORBIDDEN;
```

### ❌ Anti-Pattern 2: Hardcoded Strings
```typescript
// BAD: Hardcoded string (not enum)
return { error: { code: 'ITEM_LOCKED', ... } };

// GOOD: Use ErrorCode enum
return { error: { code: ErrorCode.ITEM_POLICY_LOCKED, ... } };
```

### ❌ Anti-Pattern 3: No Factory Function
```typescript
// BAD: Manual error construction (inconsistent)
return {
  error: {
    code: ErrorCode.ITEM_POLICY_LOCKED,
    message: 'Item locked',  // Inconsistent message
    // Missing entity, entity_id, hint
  }
};

// GOOD: Use ErrorFactory (consistent)
return ErrorFactory.itemPolicyLocked(itemId, lockedFields);
```

---

## Escalation

### When in Doubt:
1. **Check this document** - Is there a rule?
2. **Check existing codes** - Can you reuse?
3. **Ask Tech Lead** - In #engineering-help Slack
4. **Propose in PR** - Let reviewers decide

### Decision Authority:
- **Tech Lead** - Day-to-day approvals
- **Principal Architect** - Policy changes
- **CTO** - Breaking changes, major refactors

---

## Success Criteria

**This governance is working if:**
- ✅ < 5 new codes per quarter (lean growth)
- ✅ No duplicate codes in registry
- ✅ 100% frontend mappings exist
- ✅ < 2 breaking changes per year
- ✅ Developers know process (< 1 hour to learn)

---

## References

- Error Contract: `backend/src/types/errors.ts`
- Frontend Mapping: `frontend-next/utils/errorUiMap.ts`
- Tests: `backend/src/tests/integration/error-contract.test.ts`
- ADR: `docs/adr/ADR-001-error-contract.md`

---

**Document Owner:** CTO / Principal Architect  
**Approved By:** Technical Leadership  
**Next Review:** July 31, 2026
