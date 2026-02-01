/**
 * Domain Events (Phase 3 Preparation)
 * Event-Driven Architecture Interfaces
 * 
 * Status: INTERFACES ONLY (No implementation yet)
 * Purpose: Prepare for Phase 3 (Approvals, Accounting, Notifications)
 */

/**
 * Base Domain Event
 * All domain events extend this interface
 */
export interface DomainEvent {
  eventId: string;              // UUID
  eventType: string;            // Event type identifier
  aggregateId: number;          // Entity ID
  aggregateType: string;        // Entity type (e.g., 'item', 'shipment')
  occurredAt: Date;             // When event occurred
  userId?: number;              // Who triggered the event
  companyId?: number;           // Multi-tenant context
  metadata?: Record<string, any>; // Additional context
}

/**
 * Item Domain Events
 */

/**
 * ItemPolicyLocked
 * Fired when item policy fields become locked (first movement recorded)
 * 
 * Use Cases (Phase 3):
 * - Notify warehouse manager
 * - Update dashboard metrics
 * - Lock related entities (BOMs, cost centers)
 */
export interface ItemPolicyLockedEvent extends DomainEvent {
  eventType: 'ItemPolicyLocked';
  aggregateType: 'item';
  aggregateId: number;  // item_id
  payload: {
    itemCode: string;
    lockedFields: string[];  // ['base_uom_id', 'tracking_policy', ...]
    firstMovementDate: Date;
    firstMovementType: string;  // 'receipt', 'issue', 'transfer'
    warehouseId: number;
  };
}

/**
 * ItemDeleted
 * Fired when item is soft-deleted
 * 
 * Use Cases (Phase 3):
 * - Archive related data
 * - Notify users with pending transactions
 * - Update cache/indexes
 */
export interface ItemDeletedEvent extends DomainEvent {
  eventType: 'ItemDeleted';
  aggregateType: 'item';
  aggregateId: number;
  payload: {
    itemCode: string;
    itemName: string;
    deletedBy: number;
    deletedAt: Date;
    reason?: string;
  };
}

/**
 * ItemCreated
 * Fired when new item is created
 * 
 * Use Cases (Phase 3):
 * - Send to accounting system
 * - Create cost center entries
 * - Initialize stock records
 */
export interface ItemCreatedEvent extends DomainEvent {
  eventType: 'ItemCreated';
  aggregateType: 'item';
  aggregateId: number;
  payload: {
    itemCode: string;
    itemName: string;
    itemGroupId?: number;
    trackingPolicy: string;
    valuationMethod: string;
    isComposite: boolean;
    createdBy: number;
  };
}

/**
 * ItemPolicyChangeAttempted
 * Fired when user attempts to change locked policy field
 * 
 * Use Cases (Phase 3):
 * - Trigger approval workflow
 * - Notify supervisor
 * - Log security audit
 */
export interface ItemPolicyChangeAttemptedEvent extends DomainEvent {
  eventType: 'ItemPolicyChangeAttempted';
  aggregateType: 'item';
  aggregateId: number;
  payload: {
    itemCode: string;
    attemptedFields: string[];
    currentValues: Record<string, any>;
    proposedValues: Record<string, any>;
    attemptedBy: number;
    attemptedAt: Date;
    rejectionReason: string;
  };
}

/**
 * Item Group Domain Events
 */

/**
 * GroupHierarchyChanged
 * Fired when group's parent changes
 * 
 * Use Cases (Phase 3):
 * - Update cached hierarchies
 * - Recalculate group-level metrics
 * - Notify affected users
 */
export interface GroupHierarchyChangedEvent extends DomainEvent {
  eventType: 'GroupHierarchyChanged';
  aggregateType: 'item_group';
  aggregateId: number;
  payload: {
    groupCode: string;
    oldParentId: number | null;
    newParentId: number | null;
    changedBy: number;
    reason?: string;
  };
}

/**
 * GroupDeleted
 * Fired when group is soft-deleted
 * 
 * Use Cases (Phase 3):
 * - Reassign orphaned items
 * - Archive group data
 * - Update reports
 */
export interface GroupDeletedEvent extends DomainEvent {
  eventType: 'GroupDeleted';
  aggregateType: 'item_group';
  aggregateId: number;
  payload: {
    groupCode: string;
    groupName: string;
    itemCount: number;
    deletedBy: number;
  };
}

/**
 * Inventory Movement Events (Future)
 */

/**
 * InventoryMovementRecorded
 * Fired when inventory movement is recorded
 * 
 * Use Cases (Phase 3):
 * - Lock item policies (first movement)
 * - Update stock levels
 * - Trigger accounting entries
 * - Send notifications
 */
export interface InventoryMovementRecordedEvent extends DomainEvent {
  eventType: 'InventoryMovementRecorded';
  aggregateType: 'inventory_movement';
  aggregateId: number;
  payload: {
    itemId: number;
    warehouseId: number;
    movementType: string;
    quantity: number;
    referenceNumber: string;
    isFirstMovement: boolean;  // Important for policy locking
  };
}

/**
 * Domain Event Handler (Interface Only)
 * Phase 3 will implement handlers
 */
export interface DomainEventHandler<T extends DomainEvent> {
  eventType: string;
  handle(event: T): Promise<void>;
}

/**
 * Domain Event Publisher (Interface Only)
 * Phase 3 will implement publisher
 */
export interface DomainEventPublisher {
  publish<T extends DomainEvent>(event: T): Promise<void>;
  subscribe<T extends DomainEvent>(eventType: string, handler: DomainEventHandler<T>): void;
}

/**
 * Event Store (Interface Only)
 * Phase 3 will implement persistent event log
 */
export interface DomainEventStore {
  append<T extends DomainEvent>(event: T): Promise<void>;
  getByAggregateId(aggregateType: string, aggregateId: number): Promise<DomainEvent[]>;
  getByEventType(eventType: string, limit?: number): Promise<DomainEvent[]>;
  getAll(limit?: number, offset?: number): Promise<DomainEvent[]>;
}

/**
 * Usage Examples (Phase 3):
 * 
 * Example 1: Publish ItemPolicyLocked event
 * ==========================================
 * const event: ItemPolicyLockedEvent = {
 *   eventId: uuid(),
 *   eventType: 'ItemPolicyLocked',
 *   aggregateType: 'item',
 *   aggregateId: itemId,
 *   occurredAt: new Date(),
 *   userId: req.user.id,
 *   companyId: req.companyContext.companyId,
 *   payload: {
 *     itemCode: item.code,
 *     lockedFields: ['base_uom_id', 'tracking_policy', 'valuation_method'],
 *     firstMovementDate: movement.movement_date,
 *     firstMovementType: movement.movement_type,
 *     warehouseId: movement.warehouse_id,
 *   },
 * };
 * 
 * await eventPublisher.publish(event);
 * 
 * Example 2: Handle ItemPolicyLocked event
 * =========================================
 * class NotifyWarehouseManagerHandler implements DomainEventHandler<ItemPolicyLockedEvent> {
 *   eventType = 'ItemPolicyLocked';
 *   
 *   async handle(event: ItemPolicyLockedEvent): Promise<void> {
 *     const warehouseManager = await getWarehouseManager(event.payload.warehouseId);
 *     
 *     await sendEmail(warehouseManager.email, {
 *       subject: 'Item Policy Locked',
 *       body: `Item ${event.payload.itemCode} is now locked due to first movement.`,
 *     });
 *   }
 * }
 * 
 * eventPublisher.subscribe('ItemPolicyLocked', new NotifyWarehouseManagerHandler());
 * 
 * Example 3: Trigger approval workflow
 * ====================================
 * class TriggerApprovalWorkflowHandler implements DomainEventHandler<ItemPolicyChangeAttemptedEvent> {
 *   eventType = 'ItemPolicyChangeAttempted';
 *   
 *   async handle(event: ItemPolicyChangeAttemptedEvent): Promise<void> {
 *     const approvalRequest = {
 *       requestType: 'item_policy_change',
 *       entityType: 'item',
 *       entityId: event.aggregateId,
 *       requestedBy: event.payload.attemptedBy,
 *       currentState: event.payload.currentValues,
 *       proposedState: event.payload.proposedValues,
 *       status: 'pending',
 *     };
 *     
 *     await createApprovalRequest(approvalRequest);
 *     await notifySupervisor(event.payload.attemptedBy);
 *   }
 * }
 * 
 * Example 4: Update accounting system
 * ====================================
 * class SyncToAccountingHandler implements DomainEventHandler<ItemCreatedEvent> {
 *   eventType = 'ItemCreated';
 *   
 *   async handle(event: ItemCreatedEvent): Promise<void> {
 *     const accountingItem = {
 *       code: event.payload.itemCode,
 *       name: event.payload.itemName,
 *       valuation_method: event.payload.valuationMethod,
 *       company_id: event.companyId,
 *     };
 *     
 *     await accountingSystem.createInventoryAccount(accountingItem);
 *   }
 * }
 * 
 * Example 5: Event sourcing (future)
 * ===================================
 * // Reconstruct item state from events
 * const events = await eventStore.getByAggregateId('item', itemId);
 * const item = events.reduce((state, event) => applyEvent(state, event), initialState);
 */

/**
 * TODO Phase 3:
 * 1. Implement in-memory event bus (simple)
 * 2. Add persistent event store (PostgreSQL table)
 * 3. Create handler registry
 * 4. Add retry logic for failed handlers
 * 5. Add event versioning (for schema evolution)
 * 6. Add event replay capability (debugging)
 * 7. Consider external event bus (RabbitMQ, Kafka) for microservices
 */
