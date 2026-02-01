# ADR-002: Domain Policy Layer Separation

**Status:** ✅ Accepted  
**Date:** January 31, 2026  
**Deciders:** Development Team, Principal Architect Review  
**Technical Story:** Phase 2.6 Enterprise Polish

---

## Context

During Phase 2 implementation, business logic for item policy validation was embedded directly in HTTP route handlers (`routes/master/items.ts`):
- Policy validation logic mixed with HTTP request/response handling
- 60+ lines of validation code inside PUT endpoint
- Difficult to test without HTTP mocks
- Cannot reuse logic for GraphQL, CLI, or background jobs
- Hard to reason about business rules in isolation

This tight coupling caused:
- Duplication risk (same logic in multiple endpoints)
- Testing complexity (must mock Express req/res)
- Maintenance burden (business logic changes require route changes)
- Poor separation of concerns

---

## Decision

We decided to extract business logic into a **dedicated domain layer** following Domain-Driven Design principles.

### Architecture

```
backend/src/
├── domain/               ← NEW: Business logic layer
│   └── items/
│       ├── itemPolicy.ts       (ItemPolicyGuard, ItemPolicyService)
│       └── itemGroupPolicy.ts  (ItemGroupPolicyGuard, ItemGroupPolicyService)
├── routes/               ← HTTP layer (thin)
│   └── master/
│       ├── items.ts            (Uses ItemPolicyService)
│       └── itemGroups.ts       (Uses ItemGroupPolicyService)
└── types/
    └── errors.ts               (Error contracts)
```

### Domain Layer Components

#### 1. Policy Guards (Low-Level)
```typescript
class ItemPolicyGuard {
  async hasMovement(itemId: number): Promise<boolean>
  async validatePolicyChange(itemId, current, updated): Promise<ValidationResult>
  async validateDeletion(itemId): Promise<ValidationResult>
}
```

#### 2. Policy Services (High-Level)
```typescript
class ItemPolicyService {
  async validateUpdate(itemId, companyId, fields): Promise<void>  // Throws ApiError
  async validateDeletion(itemId): Promise<void>                   // Throws ApiError
  async canModifyPolicies(itemId): Promise<boolean>               // Boolean (no throw)
  async canDelete(itemId): Promise<boolean>                       // Boolean (no throw)
}
```

### Route Layer (Thin)
```typescript
router.put('/:id', async (req, res) => {
  const policyService = new ItemPolicyService(pool);
  
  try {
    await policyService.validateUpdate(itemId, companyId, req.body);
    // Proceed with update
  } catch (error: any) {
    return res.status(409).json(error); // Error already formatted
  }
});
```

---

## Consequences

### Positive
✅ **Separation of Concerns** - Business logic isolated from HTTP  
✅ **Testability** - Can test domain logic without HTTP mocks  
✅ **Reusability** - Same logic for REST, GraphQL, gRPC, CLI, background jobs  
✅ **Maintainability** - Business rules in one place  
✅ **Type Safety** - Domain entities strongly typed  
✅ **Phase 3 Ready** - Approval workflows can use same guards  
✅ **Documentation** - Domain layer self-documents business rules  

### Negative
⚠️ **More Files** - Additional abstraction layer  
⚠️ **Learning Curve** - Team must understand domain patterns  

### Neutral
🔵 **Performance** - Minimal overhead (negligible in practice)  
🔵 **Indirection** - One extra layer (acceptable for clarity)  

---

## Validation

### Unit Tests
`itemPolicies.test.ts` (16 tests) - Tests domain logic in isolation

### Integration Tests
Routes still tested, but now delegate to domain layer

### Performance
No measurable performance impact (< 1ms overhead per request)

---

## Design Principles

### 1. Guard Pattern
- Low-level validation functions
- Returns `ValidationResult` (valid/invalid + error)
- Pure business logic (no HTTP concerns)

### 2. Service Pattern
- High-level orchestration
- Throws `ApiError` for invalid operations
- Convenience methods for boolean checks

### 3. Error Contract Integration
- Domain layer uses `ErrorFactory`
- Errors bubble up with full context
- HTTP layer just serializes to JSON

---

## References

- Implementation: `backend/src/domain/items/`
- Tests: `backend/src/tests/unit/itemPolicies.test.ts`
- Usage: `backend/src/routes/master/items.ts`
- Related ADR: ADR-001 (Error Contract)

---

## Lessons Learned

1. **Start with domain, not infrastructure** - Business rules should drive architecture
2. **Guards + Services pattern scales** - Separates validation from orchestration
3. **Type safety critical** - Domain entities prevent runtime errors
4. **Thin HTTP layer is a feature** - Routes become simple adapters

---

## Future Considerations

### Phase 3 Extensions
- `ApprovalPolicyService` - Reuse `ItemPolicyGuard` for approval logic
- `FinancialLockService` - Extend guards for accounting period locks
- `AuditPolicyService` - Centralized audit logic

### Advanced Patterns
- **Repository Pattern** - Abstract data access (if needed)
- **Domain Events** - Publish events for cross-module communication
- **Aggregate Root** - Model complex entity hierarchies
- **Specification Pattern** - Composable business rules

### Not Recommended (Yet)
- ❌ Microservices - Current scale doesn't justify complexity
- ❌ CQRS - Read/write separation not needed yet
- ❌ Event Sourcing - Overkill for current requirements

---

## Migration Strategy

### Phase 1: Create Domain Layer ✅
- Implement guards and services
- No route changes yet

### Phase 2: Update Routes ✅
- Replace inline logic with service calls
- Maintain backward compatibility

### Phase 3: Remove Old Code ✅
- Delete inline validation logic
- Update tests

### Phase 4: Expand (Future)
- Add more domain services as needed
- Apply pattern to other modules (warehouses, shipments)

---

**Decision Authority:** Principal Architect Approval  
**Review Cycle:** Every 12 months or when adding major domain logic  
**Supersedes:** N/A (First domain layer implementation)  
**Superseded By:** N/A (Currently active)
