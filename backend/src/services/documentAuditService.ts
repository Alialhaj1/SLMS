/**
 * 📜 DOCUMENT AUDIT SERVICE
 * ==========================
 * Tracks document lifecycle: Created → Approved → Posted → Reversed
 * 
 * Features:
 * ✅ Full audit trail for all procurement documents
 * ✅ Before/after snapshots
 * ✅ User, timestamp, IP tracking
 * ✅ View History API for inline audit viewer
 */

import pool from '../db';
import { logger } from '../utils/logger';

// Document types
export type AuditDocumentType = 
  | 'purchase_order'
  | 'purchase_invoice'
  | 'purchase_return'
  | 'goods_receipt'
  | 'vendor_contract'
  | 'vendor_quotation'
  | 'vendor';

// Audit actions
export type AuditAction = 
  | 'created'
  | 'updated'
  | 'approved'
  | 'rejected'
  | 'posted'
  | 'reversed'
  | 'cancelled'
  | 'deleted'
  | 'status_changed'
  | 'lines_updated'
  | 'attachment_added'
  | 'note_added';

// Audit entry interface
export interface AuditEntry {
  company_id: number;
  document_type: AuditDocumentType;
  document_id: number;
  document_number: string;
  action: AuditAction;
  previous_status?: string;
  new_status?: string;
  previous_data?: Record<string, any>;
  new_data?: Record<string, any>;
  reason?: string;
  reason_ar?: string;
  performed_by: number;
  ip_address?: string;
  user_agent?: string;
}

// Lifecycle event for UI
export interface DocumentLifecycleEvent {
  id: number;
  action: AuditAction;
  action_label: string;
  action_label_ar: string;
  previous_status?: string;
  new_status?: string;
  reason?: string;
  reason_ar?: string;
  performed_by: number;
  performer_name: string;
  performer_email: string;
  performed_at: string;
  changes_summary?: string;
  changes_summary_ar?: string;
}

// Action labels for UI
const ACTION_LABELS: Record<AuditAction, { en: string; ar: string }> = {
  created: { en: 'Created', ar: 'تم الإنشاء' },
  updated: { en: 'Updated', ar: 'تم التحديث' },
  approved: { en: 'Approved', ar: 'تم الاعتماد' },
  rejected: { en: 'Rejected', ar: 'تم الرفض' },
  posted: { en: 'Posted', ar: 'تم الترحيل' },
  reversed: { en: 'Reversed', ar: 'تم العكس' },
  cancelled: { en: 'Cancelled', ar: 'تم الإلغاء' },
  deleted: { en: 'Deleted', ar: 'تم الحذف' },
  status_changed: { en: 'Status Changed', ar: 'تم تغيير الحالة' },
  lines_updated: { en: 'Lines Updated', ar: 'تم تحديث البنود' },
  attachment_added: { en: 'Attachment Added', ar: 'تمت إضافة مرفق' },
  note_added: { en: 'Note Added', ar: 'تمت إضافة ملاحظة' }
};

/**
 * Document Audit Service
 */
export class DocumentAuditService {
  
  /**
   * Log an audit entry
   */
  static async log(entry: AuditEntry): Promise<number> {
    try {
      const result = await pool.query(
        `INSERT INTO document_audit_trail (
          company_id, document_type, document_id, document_number,
          action, previous_status, new_status, previous_data, new_data,
          reason, reason_ar, performed_by, ip_address, user_agent, performed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
        RETURNING id`,
        [
          entry.company_id, entry.document_type, entry.document_id, entry.document_number,
          entry.action, entry.previous_status, entry.new_status,
          entry.previous_data ? JSON.stringify(entry.previous_data) : null,
          entry.new_data ? JSON.stringify(entry.new_data) : null,
          entry.reason, entry.reason_ar, entry.performed_by,
          entry.ip_address, entry.user_agent
        ]
      );
      
      logger.info(`Audit logged: ${entry.document_type} ${entry.document_number} - ${entry.action}`);
      return result.rows[0].id;
      
    } catch (error) {
      logger.error('Failed to log audit entry:', error);
      throw error;
    }
  }
  
  /**
   * Log document creation
   */
  static async logCreated(
    companyId: number,
    documentType: AuditDocumentType,
    documentId: number,
    documentNumber: string,
    data: Record<string, any>,
    performedBy: number,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      company_id: companyId,
      document_type: documentType,
      document_id: documentId,
      document_number: documentNumber,
      action: 'created',
      new_status: 'draft',
      new_data: data,
      performed_by: performedBy,
      ip_address: ipAddress
    });
  }
  
  /**
   * Log document update
   */
  static async logUpdated(
    companyId: number,
    documentType: AuditDocumentType,
    documentId: number,
    documentNumber: string,
    previousData: Record<string, any>,
    newData: Record<string, any>,
    performedBy: number,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      company_id: companyId,
      document_type: documentType,
      document_id: documentId,
      document_number: documentNumber,
      action: 'updated',
      previous_data: previousData,
      new_data: newData,
      performed_by: performedBy,
      ip_address: ipAddress
    });
  }
  
  /**
   * Log document approval
   */
  static async logApproved(
    companyId: number,
    documentType: AuditDocumentType,
    documentId: number,
    documentNumber: string,
    previousStatus: string,
    performedBy: number,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      company_id: companyId,
      document_type: documentType,
      document_id: documentId,
      document_number: documentNumber,
      action: 'approved',
      previous_status: previousStatus,
      new_status: 'approved',
      performed_by: performedBy,
      ip_address: ipAddress
    });
  }
  
  /**
   * Log document rejection
   */
  static async logRejected(
    companyId: number,
    documentType: AuditDocumentType,
    documentId: number,
    documentNumber: string,
    previousStatus: string,
    reason: string,
    reasonAr: string,
    performedBy: number,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      company_id: companyId,
      document_type: documentType,
      document_id: documentId,
      document_number: documentNumber,
      action: 'rejected',
      previous_status: previousStatus,
      new_status: 'rejected',
      reason,
      reason_ar: reasonAr,
      performed_by: performedBy,
      ip_address: ipAddress
    });
  }
  
  /**
   * Log document posting
   */
  static async logPosted(
    companyId: number,
    documentType: AuditDocumentType,
    documentId: number,
    documentNumber: string,
    previousStatus: string,
    sideEffects: Record<string, any>,
    performedBy: number,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      company_id: companyId,
      document_type: documentType,
      document_id: documentId,
      document_number: documentNumber,
      action: 'posted',
      previous_status: previousStatus,
      new_status: 'posted',
      new_data: sideEffects,
      performed_by: performedBy,
      ip_address: ipAddress
    });
  }
  
  /**
   * Log document reversal
   */
  static async logReversed(
    companyId: number,
    documentType: AuditDocumentType,
    documentId: number,
    documentNumber: string,
    reason: string,
    reasonAr: string,
    reversalData: Record<string, any>,
    performedBy: number,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      company_id: companyId,
      document_type: documentType,
      document_id: documentId,
      document_number: documentNumber,
      action: 'reversed',
      previous_status: 'posted',
      new_status: 'reversed',
      reason,
      reason_ar: reasonAr,
      new_data: reversalData,
      performed_by: performedBy,
      ip_address: ipAddress
    });
  }
  
  /**
   * Get document lifecycle history
   */
  static async getDocumentHistory(
    documentType: AuditDocumentType,
    documentId: number
  ): Promise<DocumentLifecycleEvent[]> {
    try {
      const result = await pool.query(
        `SELECT 
          dat.id,
          dat.action,
          dat.previous_status,
          dat.new_status,
          dat.reason,
          dat.reason_ar,
          dat.previous_data,
          dat.new_data,
          dat.performed_by,
          u.full_name as performer_name,
          u.email as performer_email,
          dat.performed_at
         FROM document_audit_trail dat
         LEFT JOIN users u ON u.id = dat.performed_by
         WHERE dat.document_type = $1 AND dat.document_id = $2
         ORDER BY dat.performed_at ASC`,
        [documentType, documentId]
      );
      
      return result.rows.map(row => ({
        id: row.id,
        action: row.action,
        action_label: ACTION_LABELS[row.action as AuditAction]?.en || row.action,
        action_label_ar: ACTION_LABELS[row.action as AuditAction]?.ar || row.action,
        previous_status: row.previous_status,
        new_status: row.new_status,
        reason: row.reason,
        reason_ar: row.reason_ar,
        performed_by: row.performed_by,
        performer_name: row.performer_name || 'System',
        performer_email: row.performer_email || '',
        performed_at: row.performed_at,
        changes_summary: this.summarizeChanges(row.previous_data, row.new_data, 'en'),
        changes_summary_ar: this.summarizeChanges(row.previous_data, row.new_data, 'ar')
      }));
      
    } catch (error) {
      logger.error('Failed to get document history:', error);
      return [];
    }
  }
  
  /**
   * Summarize changes between before/after data
   */
  private static summarizeChanges(
    previous: any,
    current: any,
    lang: 'en' | 'ar'
  ): string {
    if (!previous && !current) return '';
    if (!previous) return lang === 'en' ? 'Initial creation' : 'الإنشاء الأولي';
    if (!current) return '';
    
    const changes: string[] = [];
    const labels = {
      total_amount: { en: 'Total Amount', ar: 'المبلغ الإجمالي' },
      status: { en: 'Status', ar: 'الحالة' },
      vendor_id: { en: 'Vendor', ar: 'المورد' },
      order_date: { en: 'Order Date', ar: 'تاريخ الطلب' },
      due_date: { en: 'Due Date', ar: 'تاريخ الاستحقاق' },
      notes: { en: 'Notes', ar: 'ملاحظات' }
    };
    
    for (const key of Object.keys(current)) {
      if (previous[key] !== current[key] && labels[key as keyof typeof labels]) {
        const label = labels[key as keyof typeof labels][lang];
        changes.push(`${label}: ${previous[key]} → ${current[key]}`);
      }
    }
    
    return changes.slice(0, 3).join(', ') + (changes.length > 3 ? '...' : '');
  }
  
  /**
   * Get recent activity for a company
   */
  static async getRecentActivity(
    companyId: number,
    limit: number = 20
  ): Promise<Array<{
    document_type: string;
    document_number: string;
    action: string;
    action_label: string;
    action_label_ar: string;
    performer_name: string;
    performed_at: string;
  }>> {
    try {
      const result = await pool.query(
        `SELECT 
          dat.document_type,
          dat.document_number,
          dat.action,
          u.full_name as performer_name,
          dat.performed_at
         FROM document_audit_trail dat
         LEFT JOIN users u ON u.id = dat.performed_by
         WHERE dat.company_id = $1
         ORDER BY dat.performed_at DESC
         LIMIT $2`,
        [companyId, limit]
      );
      
      return result.rows.map(row => ({
        document_type: row.document_type,
        document_number: row.document_number,
        action: row.action,
        action_label: ACTION_LABELS[row.action as AuditAction]?.en || row.action,
        action_label_ar: ACTION_LABELS[row.action as AuditAction]?.ar || row.action,
        performer_name: row.performer_name || 'System',
        performed_at: row.performed_at
      }));
      
    } catch (error) {
      logger.error('Failed to get recent activity:', error);
      return [];
    }
  }
}

export default DocumentAuditService;
