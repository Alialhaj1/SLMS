# ADR-001: Standardized Error Contract

**Status:** ✅ Accepted  
**Date:** January 31, 2026  
**Deciders:** Development Team, CTO Review  
**Technical Story:** Phase 2.6 Enterprise Polish

---

## Context

During Phase 2 implementation, we identified inconsistent error responses across different API endpoints:
- Some endpoints returned `{ success: false, error: string }`
- Others returned `{ error: { code, message } }`
- Missing contextual information (entity type, field names, actionable hints)
- Frontend had to parse different error structures for the same business logic

This inconsistency caused:
- Complex error handling in frontend
- Difficulty in logging/monitoring
- Poor UX (no actionable hints for users)
- Fragile API contract (breaking changes without notice)

---

## Decision

We decided to implement a **standardized error contract** across all API endpoints.

### Error Structure
```typescript
{
  "error": {
    "code": string,           // ErrorCode enum (not hardcoded strings)
    "message": string,        // Human-readable error description
    "entity": string,         // Entity type (e.g., "item", "item_group")
    "entity_id": number,      // Entity ID (if applicable)
    "field": string,          // Single field (if applicable)
    "fields": string[],       // Multiple fields (if applicable)
    "hint": string            // Actionable hint for resolution
  }
}
```

### Error Code Registry
Centralized in `backend/src/types/errors.ts`:
- `ITEM_POLICY_LOCKED` - Policy fields locked after movement
- `ITEM_HAS_MOVEMENT` - Cannot delete item with movements
- `GROUP_HAS_CHILDREN` - Cannot modify/delete group with children
- `GROUP_HAS_ITEMS` - Cannot modify/delete group with items
- `VALIDATION_ERROR` - Input validation failure
- `ENTITY_NOT_FOUND` - Resource not found
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Permission denied

### Error Factory Pattern
Created factory functions for type-safe error generation:
```typescript
ErrorFactory.itemPolicyLocked(id, fields)
ErrorFactory.itemHasMovement(id)
ErrorFactory.groupHasChildren(id, count)
ErrorFactory.entityNotFound(entity, id)
```

---

## Consequences

### Positive
✅ **Consistent API Contract** - All endpoints follow same structure  
✅ **Frontend Simplification** - Single error handling logic  
✅ **Better UX** - Actionable hints guide users  
✅ **Improved Logging** - Structured errors for monitoring  
✅ **Type Safety** - ErrorCode enum prevents typos  
✅ **I18n Ready** - Error codes map to translations  
✅ **Third-Party Safe** - Stable API for mobile/partners  

### Negative
⚠️ **Migration Effort** - Existing endpoints need updates  
⚠️ **Governance Required** - Must control new error code additions  

### Neutral
🔵 **More Code** - Factory pattern adds boilerplate (acceptable tradeoff)  
🔵 **Breaking Change** - Old clients need updates (versioned API mitigates)  

---

## Validation

Implemented 15 integration tests in `error-contract.test.ts`:
- All 409 errors have proper structure ✅
- Error codes use enum (not hardcoded strings) ✅
- Hints are actionable ✅
- Entity + entity_id always present ✅

---

## References

- Implementation: `backend/src/types/errors.ts`
- Tests: `backend/src/tests/integration/error-contract.test.ts`
- Updated Routes: `items.ts`, `itemGroups.ts`
- Related ADR: ADR-002 (Domain Policy Layer)

---

## Lessons Learned

1. **Early standardization prevents technical debt** - Retrofitting is harder than building right
2. **Hints matter** - Users need actionable guidance, not just error messages
3. **Enum over strings** - Type safety caught errors during refactoring
4. **Factory pattern scales** - Easy to add new error types without duplication

---

## Future Considerations

- Consider adding `correlation_id` for distributed tracing
- Add `retryable: boolean` for client retry logic
- Consider `error_url` linking to docs/troubleshooting
- Evaluate GraphQL error spec compatibility

---

**Decision Authority:** Development Team Consensus  
**Review Cycle:** Every 6 months or when adding 5+ new error codes  
**Supersedes:** N/A (First error standardization)  
**Superseded By:** N/A (Currently active)
