/**
 * 🔒 DOCUMENT STATE MACHINE
 * ==========================
 * Unified state policy layer for all procurement documents
 * 
 * Prevents silent side effects by enforcing:
 * ✅ No edit/delete after posting or approval
 * ✅ Centralized state transition rules
 * ✅ Document-specific policies
 * 
 * Usage:
 * ```typescript
 * import { DocumentStateMachine } from '../utils/documentStateMachine';
 * 
 * const policy = DocumentStateMachine.getPolicy('purchase_invoice');
 * if (!policy.canEdit(document.status, document.is_posted)) {
 *   throw new Error('Cannot edit posted document');
 * }
 * ```
 */

// Document types supported by the state machine
export type DocumentType = 
  | 'purchase_order'
  | 'purchase_invoice'
  | 'purchase_return'
  | 'goods_receipt'
  | 'vendor_contract'
  | 'vendor_quotation';

// Status codes used across documents
export type DocumentStatus = 
  | 'draft'
  | 'pending'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'posted'
  | 'reversed'
  | 'cancelled'
  | 'closed'
  | 'partially_received'
  | 'fully_received'
  | 'active'
  | 'expired'
  | 'terminated';

// Document state for policy checks
export interface DocumentState {
  status: string;
  is_posted?: boolean;
  is_approved?: boolean;
  is_reversed?: boolean;
  is_cancelled?: boolean;
  is_locked?: boolean;
}

// Policy check result with reason
export interface PolicyResult {
  allowed: boolean;
  reason?: string;
  reason_ar?: string;
  requires_reversal?: boolean;
  warning?: string;
  warning_ar?: string;
}

// Side effects that will occur
export interface SideEffects {
  updates_inventory: boolean;
  updates_vendor_balance: boolean;
  creates_journal_entry: boolean;
  updates_po_status?: boolean;
  locks_document: boolean;
  description: string;
  description_ar: string;
}

// Document policy interface
export interface DocumentPolicy {
  documentType: DocumentType;
  
  // Permission checks
  canCreate(userPermissions: string[]): PolicyResult;
  canView(userPermissions: string[]): PolicyResult;
  canEdit(state: DocumentState, userPermissions: string[]): PolicyResult;
  canDelete(state: DocumentState, userPermissions: string[]): PolicyResult;
  canApprove(state: DocumentState, userPermissions: string[]): PolicyResult;
  canPost(state: DocumentState, userPermissions: string[]): PolicyResult;
  canReverse(state: DocumentState, userPermissions: string[]): PolicyResult;
  canOverridePrice(userPermissions: string[]): PolicyResult;
  canOverrideQty(userPermissions: string[]): PolicyResult;
  
  // Side effects
  getPostSideEffects(): SideEffects;
  getReverseSideEffects(): SideEffects;
  
  // State transitions
  getNextStatus(currentStatus: string, action: 'approve' | 'reject' | 'post' | 'reverse' | 'cancel'): string | null;
}

// Base policy with common logic
abstract class BaseDocumentPolicy implements DocumentPolicy {
  abstract documentType: DocumentType;
  
  protected permissionPrefix: string = '';
  
  canCreate(userPermissions: string[]): PolicyResult {
    const required = `${this.permissionPrefix}:create`;
    if (userPermissions.includes(required) || userPermissions.includes('super_admin')) {
      return { allowed: true };
    }
    return { 
      allowed: false, 
      reason: `Missing permission: ${required}`,
      reason_ar: `صلاحية مفقودة: ${required}`
    };
  }
  
  canView(userPermissions: string[]): PolicyResult {
    const required = `${this.permissionPrefix}:view`;
    if (userPermissions.includes(required) || userPermissions.includes('super_admin')) {
      return { allowed: true };
    }
    return { 
      allowed: false, 
      reason: `Missing permission: ${required}`,
      reason_ar: `صلاحية مفقودة: ${required}`
    };
  }
  
  canEdit(state: DocumentState, userPermissions: string[]): PolicyResult {
    // Check permission first
    const required = `${this.permissionPrefix}:update`;
    if (!userPermissions.includes(required) && !userPermissions.includes('super_admin')) {
      return { 
        allowed: false, 
        reason: `Missing permission: ${required}`,
        reason_ar: `صلاحية مفقودة: ${required}`
      };
    }
    
    // Check if document is locked
    if (state.is_locked) {
      return { 
        allowed: false, 
        reason: 'Document is locked and cannot be edited',
        reason_ar: 'المستند مقفل ولا يمكن تعديله'
      };
    }
    
    // Check if posted
    if (state.is_posted) {
      return { 
        allowed: false, 
        reason: 'Cannot edit posted document. Create a reversal or adjustment instead.',
        reason_ar: 'لا يمكن تعديل مستند مرحّل. قم بإنشاء عكس أو تعديل بدلاً من ذلك.',
        requires_reversal: true
      };
    }
    
    // Check if approved (for documents that use approval)
    if (state.is_approved) {
      return { 
        allowed: false, 
        reason: 'Cannot edit approved document. Request reversal first.',
        reason_ar: 'لا يمكن تعديل مستند معتمد. اطلب العكس أولاً.',
        requires_reversal: true
      };
    }
    
    // Check if reversed
    if (state.is_reversed) {
      return { 
        allowed: false, 
        reason: 'Cannot edit reversed document',
        reason_ar: 'لا يمكن تعديل مستند معكوس'
      };
    }
    
    // Check if cancelled
    if (state.is_cancelled || state.status === 'cancelled') {
      return { 
        allowed: false, 
        reason: 'Cannot edit cancelled document',
        reason_ar: 'لا يمكن تعديل مستند ملغي'
      };
    }
    
    return { allowed: true };
  }
  
  canDelete(state: DocumentState, userPermissions: string[]): PolicyResult {
    // Check permission first
    const required = `${this.permissionPrefix}:delete`;
    if (!userPermissions.includes(required) && !userPermissions.includes('super_admin')) {
      return { 
        allowed: false, 
        reason: `Missing permission: ${required}`,
        reason_ar: `صلاحية مفقودة: ${required}`
      };
    }
    
    // Same rules as edit - cannot delete posted/approved documents
    if (state.is_posted) {
      return { 
        allowed: false, 
        reason: 'Cannot delete posted document. Create a reversal instead.',
        reason_ar: 'لا يمكن حذف مستند مرحّل. قم بإنشاء عكس بدلاً من ذلك.',
        requires_reversal: true
      };
    }
    
    if (state.is_approved) {
      return { 
        allowed: false, 
        reason: 'Cannot delete approved document. Request reversal first.',
        reason_ar: 'لا يمكن حذف مستند معتمد. اطلب العكس أولاً.',
        requires_reversal: true
      };
    }
    
    if (state.is_reversed) {
      return { 
        allowed: false, 
        reason: 'Cannot delete reversed document',
        reason_ar: 'لا يمكن حذف مستند معكوس'
      };
    }
    
    return { allowed: true };
  }
  
  canApprove(state: DocumentState, userPermissions: string[]): PolicyResult {
    const required = `${this.permissionPrefix}:approve`;
    if (!userPermissions.includes(required) && !userPermissions.includes('super_admin')) {
      return { 
        allowed: false, 
        reason: `Missing permission: ${required}`,
        reason_ar: `صلاحية مفقودة: ${required}`
      };
    }
    
    if (state.is_approved) {
      return { 
        allowed: false, 
        reason: 'Document is already approved',
        reason_ar: 'المستند معتمد بالفعل'
      };
    }
    
    if (state.status !== 'pending' && state.status !== 'pending_approval' && state.status !== 'draft') {
      return { 
        allowed: false, 
        reason: 'Document must be in pending or draft status to approve',
        reason_ar: 'يجب أن يكون المستند في حالة انتظار أو مسودة للاعتماد'
      };
    }
    
    return { allowed: true };
  }
  
  canPost(state: DocumentState, userPermissions: string[]): PolicyResult {
    const required = `${this.permissionPrefix}:post`;
    if (!userPermissions.includes(required) && !userPermissions.includes('super_admin')) {
      return { 
        allowed: false, 
        reason: `Missing permission: ${required}`,
        reason_ar: `صلاحية مفقودة: ${required}`
      };
    }
    
    if (state.is_posted) {
      return { 
        allowed: false, 
        reason: 'Document is already posted',
        reason_ar: 'المستند مرحّل بالفعل'
      };
    }
    
    if (state.is_reversed) {
      return { 
        allowed: false, 
        reason: 'Cannot post reversed document',
        reason_ar: 'لا يمكن ترحيل مستند معكوس'
      };
    }
    
    if (state.is_cancelled || state.status === 'cancelled') {
      return { 
        allowed: false, 
        reason: 'Cannot post cancelled document',
        reason_ar: 'لا يمكن ترحيل مستند ملغي'
      };
    }
    
    return { allowed: true };
  }
  
  canReverse(state: DocumentState, userPermissions: string[]): PolicyResult {
    const required = `${this.permissionPrefix}:reverse`;
    if (!userPermissions.includes(required) && !userPermissions.includes('super_admin')) {
      return { 
        allowed: false, 
        reason: `Missing permission: ${required}`,
        reason_ar: `صلاحية مفقودة: ${required}`
      };
    }
    
    if (!state.is_posted) {
      return { 
        allowed: false, 
        reason: 'Only posted documents can be reversed',
        reason_ar: 'يمكن عكس المستندات المرحّلة فقط'
      };
    }
    
    if (state.is_reversed) {
      return { 
        allowed: false, 
        reason: 'Document is already reversed',
        reason_ar: 'المستند معكوس بالفعل'
      };
    }
    
    return { 
      allowed: true,
      warning: 'Reversing this document will create a reversal entry and undo all effects',
      warning_ar: 'عكس هذا المستند سيُنشئ قيد عكسي ويلغي جميع التأثيرات'
    };
  }
  
  canOverridePrice(userPermissions: string[]): PolicyResult {
    const required = `${this.permissionPrefix}:override_price`;
    if (userPermissions.includes(required) || userPermissions.includes('super_admin')) {
      return { allowed: true };
    }
    return { 
      allowed: false, 
      reason: 'Price override not allowed',
      reason_ar: 'تجاوز السعر غير مسموح'
    };
  }
  
  canOverrideQty(userPermissions: string[]): PolicyResult {
    const required = `${this.permissionPrefix}:override_qty`;
    if (userPermissions.includes(required) || userPermissions.includes('super_admin')) {
      return { allowed: true };
    }
    return { 
      allowed: false, 
      reason: 'Quantity override not allowed',
      reason_ar: 'تجاوز الكمية غير مسموح'
    };
  }
  
  abstract getPostSideEffects(): SideEffects;
  abstract getReverseSideEffects(): SideEffects;
  abstract getNextStatus(currentStatus: string, action: 'approve' | 'reject' | 'post' | 'reverse' | 'cancel'): string | null;
}

// Purchase Order Policy
class PurchaseOrderPolicy extends BaseDocumentPolicy {
  documentType: DocumentType = 'purchase_order';
  protected permissionPrefix = 'purchase_orders';
  
  getPostSideEffects(): SideEffects {
    return {
      updates_inventory: false,
      updates_vendor_balance: false,
      creates_journal_entry: false,
      locks_document: true,
      description: 'Document will be locked for editing. No accounting entry created.',
      description_ar: 'سيتم قفل المستند للتعديل. لن يتم إنشاء قيد محاسبي.'
    };
  }
  
  getReverseSideEffects(): SideEffects {
    return {
      updates_inventory: false,
      updates_vendor_balance: false,
      creates_journal_entry: false,
      locks_document: true,
      description: 'Order will be marked as cancelled. Linked documents may be affected.',
      description_ar: 'سيتم تحديد الطلب كملغي. قد تتأثر المستندات المرتبطة.'
    };
  }
  
  getNextStatus(currentStatus: string, action: 'approve' | 'reject' | 'post' | 'reverse' | 'cancel'): string | null {
    const transitions: Record<string, Record<string, string>> = {
      'draft': { 'approve': 'approved', 'cancel': 'cancelled' },
      'pending': { 'approve': 'approved', 'reject': 'rejected', 'cancel': 'cancelled' },
      'pending_approval': { 'approve': 'approved', 'reject': 'rejected', 'cancel': 'cancelled' },
      'approved': { 'cancel': 'cancelled', 'reverse': 'cancelled' },
      'partially_received': { 'cancel': 'cancelled' },
      'fully_received': { }
    };
    return transitions[currentStatus]?.[action] || null;
  }
}

// Purchase Invoice Policy
class PurchaseInvoicePolicy extends BaseDocumentPolicy {
  documentType: DocumentType = 'purchase_invoice';
  protected permissionPrefix = 'purchase_invoices';
  
  getPostSideEffects(): SideEffects {
    return {
      updates_inventory: false,
      updates_vendor_balance: true,
      creates_journal_entry: true,
      locks_document: true,
      description: 'Vendor balance will be updated. A journal entry will be created: Dr Inventory/Expense, Cr Accounts Payable.',
      description_ar: 'سيتم تحديث رصيد المورد. سيتم إنشاء قيد محاسبي: مدين المخزون/المصروفات، دائن الذمم الدائنة.'
    };
  }
  
  getReverseSideEffects(): SideEffects {
    return {
      updates_inventory: false,
      updates_vendor_balance: true,
      creates_journal_entry: true,
      locks_document: true,
      description: 'Vendor balance will be reversed. A reversal journal entry will be created: Dr Accounts Payable, Cr Inventory/Expense.',
      description_ar: 'سيتم عكس رصيد المورد. سيتم إنشاء قيد عكسي: مدين الذمم الدائنة، دائن المخزون/المصروفات.'
    };
  }
  
  getNextStatus(currentStatus: string, action: 'approve' | 'reject' | 'post' | 'reverse' | 'cancel'): string | null {
    const transitions: Record<string, Record<string, string>> = {
      'draft': { 'post': 'posted', 'cancel': 'cancelled' },
      'pending': { 'post': 'posted', 'cancel': 'cancelled' },
      'posted': { 'reverse': 'reversed' }
    };
    return transitions[currentStatus]?.[action] || null;
  }
}

// Purchase Return Policy
class PurchaseReturnPolicy extends BaseDocumentPolicy {
  documentType: DocumentType = 'purchase_return';
  protected permissionPrefix = 'purchase_returns';
  
  getPostSideEffects(): SideEffects {
    return {
      updates_inventory: true,
      updates_vendor_balance: true,
      creates_journal_entry: true,
      locks_document: true,
      description: 'Inventory will be decreased. Vendor balance will be debited. A journal entry will be created: Dr Accounts Payable, Cr Inventory.',
      description_ar: 'سيتم تقليل المخزون. سيتم خصم رصيد المورد. سيتم إنشاء قيد محاسبي: مدين الذمم الدائنة، دائن المخزون.'
    };
  }
  
  getReverseSideEffects(): SideEffects {
    return {
      updates_inventory: true,
      updates_vendor_balance: true,
      creates_journal_entry: true,
      locks_document: true,
      description: 'Return will be reversed. Inventory will be restored. Vendor balance will be credited.',
      description_ar: 'سيتم عكس المرتجع. سيتم استعادة المخزون. سيتم إضافة رصيد المورد.'
    };
  }
  
  getNextStatus(currentStatus: string, action: 'approve' | 'reject' | 'post' | 'reverse' | 'cancel'): string | null {
    const transitions: Record<string, Record<string, string>> = {
      'draft': { 'post': 'posted', 'cancel': 'cancelled' },
      'pending': { 'post': 'posted', 'cancel': 'cancelled' },
      'posted': { 'reverse': 'reversed' }
    };
    return transitions[currentStatus]?.[action] || null;
  }
}

// Goods Receipt Policy
class GoodsReceiptPolicy extends BaseDocumentPolicy {
  documentType: DocumentType = 'goods_receipt';
  protected permissionPrefix = 'goods_receipts';
  
  getPostSideEffects(): SideEffects {
    return {
      updates_inventory: true,
      updates_vendor_balance: false,
      creates_journal_entry: false, // Optional: can create interim entry
      updates_po_status: true,
      locks_document: true,
      description: 'Inventory will be increased. Purchase Order status will be updated. No accounting entry (created on invoice).',
      description_ar: 'سيتم زيادة المخزون. سيتم تحديث حالة أمر الشراء. لا قيد محاسبي (ينشأ عند الفاتورة).'
    };
  }
  
  getReverseSideEffects(): SideEffects {
    return {
      updates_inventory: true,
      updates_vendor_balance: false,
      creates_journal_entry: false,
      updates_po_status: true,
      locks_document: true,
      description: 'Receipt will be reversed. Inventory will be decreased. PO status may revert.',
      description_ar: 'سيتم عكس الاستلام. سيتم تقليل المخزون. قد تعود حالة أمر الشراء.'
    };
  }
  
  getNextStatus(currentStatus: string, action: 'approve' | 'reject' | 'post' | 'reverse' | 'cancel'): string | null {
    const transitions: Record<string, Record<string, string>> = {
      'draft': { 'post': 'posted', 'cancel': 'cancelled' },
      'pending': { 'post': 'posted', 'cancel': 'cancelled' },
      'posted': { 'reverse': 'reversed' }
    };
    return transitions[currentStatus]?.[action] || null;
  }
}

// Vendor Contract Policy
class VendorContractPolicy extends BaseDocumentPolicy {
  documentType: DocumentType = 'vendor_contract';
  protected permissionPrefix = 'vendor_contracts';
  
  canPost(state: DocumentState, userPermissions: string[]): PolicyResult {
    // Contracts don't get posted, they get approved
    return { 
      allowed: false, 
      reason: 'Contracts are approved, not posted',
      reason_ar: 'العقود تُعتمد ولا تُرحّل'
    };
  }
  
  getPostSideEffects(): SideEffects {
    return {
      updates_inventory: false,
      updates_vendor_balance: false,
      creates_journal_entry: false,
      locks_document: true,
      description: 'Contract will be activated and locked.',
      description_ar: 'سيتم تفعيل العقد وقفله.'
    };
  }
  
  getReverseSideEffects(): SideEffects {
    return {
      updates_inventory: false,
      updates_vendor_balance: false,
      creates_journal_entry: false,
      locks_document: true,
      description: 'Contract will be terminated.',
      description_ar: 'سيتم إنهاء العقد.'
    };
  }
  
  getNextStatus(currentStatus: string, action: 'approve' | 'reject' | 'post' | 'reverse' | 'cancel'): string | null {
    const transitions: Record<string, Record<string, string>> = {
      'draft': { 'approve': 'active', 'cancel': 'cancelled' },
      'pending_approval': { 'approve': 'active', 'reject': 'rejected', 'cancel': 'cancelled' },
      'active': { 'cancel': 'terminated', 'reverse': 'terminated' },
      'expired': { }
    };
    return transitions[currentStatus]?.[action] || null;
  }
}

// Vendor Quotation Policy
class VendorQuotationPolicy extends BaseDocumentPolicy {
  documentType: DocumentType = 'vendor_quotation';
  protected permissionPrefix = 'vendor_quotations';
  
  canPost(state: DocumentState, userPermissions: string[]): PolicyResult {
    // Quotations don't get posted
    return { 
      allowed: false, 
      reason: 'Quotations are accepted/rejected, not posted',
      reason_ar: 'عروض الأسعار تُقبل أو تُرفض ولا تُرحّل'
    };
  }
  
  getPostSideEffects(): SideEffects {
    return {
      updates_inventory: false,
      updates_vendor_balance: false,
      creates_journal_entry: false,
      locks_document: false,
      description: 'No side effects.',
      description_ar: 'لا تأثيرات.'
    };
  }
  
  getReverseSideEffects(): SideEffects {
    return {
      updates_inventory: false,
      updates_vendor_balance: false,
      creates_journal_entry: false,
      locks_document: false,
      description: 'Quotation will be rejected.',
      description_ar: 'سيتم رفض عرض السعر.'
    };
  }
  
  getNextStatus(currentStatus: string, action: 'approve' | 'reject' | 'post' | 'reverse' | 'cancel'): string | null {
    const transitions: Record<string, Record<string, string>> = {
      'draft': { 'approve': 'accepted', 'reject': 'rejected', 'cancel': 'cancelled' },
      'pending': { 'approve': 'accepted', 'reject': 'rejected', 'cancel': 'cancelled' },
      'accepted': { },
      'rejected': { }
    };
    return transitions[currentStatus]?.[action] || null;
  }
}

// State Machine Factory
export class DocumentStateMachine {
  private static policies: Record<DocumentType, DocumentPolicy> = {
    'purchase_order': new PurchaseOrderPolicy(),
    'purchase_invoice': new PurchaseInvoicePolicy(),
    'purchase_return': new PurchaseReturnPolicy(),
    'goods_receipt': new GoodsReceiptPolicy(),
    'vendor_contract': new VendorContractPolicy(),
    'vendor_quotation': new VendorQuotationPolicy()
  };
  
  /**
   * Get policy for a specific document type
   */
  static getPolicy(documentType: DocumentType): DocumentPolicy {
    const policy = this.policies[documentType];
    if (!policy) {
      throw new Error(`Unknown document type: ${documentType}`);
    }
    return policy;
  }
  
  /**
   * Check if document can be edited
   */
  static canEdit(documentType: DocumentType, state: DocumentState, userPermissions: string[]): PolicyResult {
    return this.getPolicy(documentType).canEdit(state, userPermissions);
  }
  
  /**
   * Check if document can be deleted
   */
  static canDelete(documentType: DocumentType, state: DocumentState, userPermissions: string[]): PolicyResult {
    return this.getPolicy(documentType).canDelete(state, userPermissions);
  }
  
  /**
   * Check if document can be posted
   */
  static canPost(documentType: DocumentType, state: DocumentState, userPermissions: string[]): PolicyResult {
    return this.getPolicy(documentType).canPost(state, userPermissions);
  }
  
  /**
   * Check if document can be reversed
   */
  static canReverse(documentType: DocumentType, state: DocumentState, userPermissions: string[]): PolicyResult {
    return this.getPolicy(documentType).canReverse(state, userPermissions);
  }
  
  /**
   * Get side effects for posting
   */
  static getPostSideEffects(documentType: DocumentType): SideEffects {
    return this.getPolicy(documentType).getPostSideEffects();
  }
  
  /**
   * Get side effects for reversal
   */
  static getReverseSideEffects(documentType: DocumentType): SideEffects {
    return this.getPolicy(documentType).getReverseSideEffects();
  }
  
  /**
   * Get next status after an action
   */
  static getNextStatus(documentType: DocumentType, currentStatus: string, action: 'approve' | 'reject' | 'post' | 'reverse' | 'cancel'): string | null {
    return this.getPolicy(documentType).getNextStatus(currentStatus, action);
  }
}

export default DocumentStateMachine;
