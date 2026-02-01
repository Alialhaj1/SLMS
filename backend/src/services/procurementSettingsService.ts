/**
 * 📋 PROCUREMENT SETTINGS SERVICE
 * =================================
 * Company-specific procurement configuration
 * 
 * Features:
 * ✅ Per-company settings
 * ✅ Matching tolerances
 * ✅ Approval workflows
 * ✅ Override limits
 * ✅ Caching for performance
 */

import pool from '../db';
import { logger } from '../utils/logger';

export interface ProcurementSettings {
  company_id: number;
  
  // 3-Way Matching
  enable_three_way_matching: boolean;
  price_tolerance_percent: number;
  qty_tolerance_percent: number;
  allow_over_receipt: boolean;
  allow_over_invoice: boolean;
  
  // Approval Workflow
  require_po_approval: boolean;
  require_invoice_approval: boolean;
  require_gr_approval: boolean;
  require_return_approval: boolean;
  
  // Posting Controls
  auto_post_goods_receipts: boolean;
  allow_operational_gr: boolean;
  batch_financial_posting: boolean;
  enable_operational_gr_without_posting: boolean;
  
  // Override Permissions
  allow_price_override: boolean;
  allow_qty_override: boolean;
  price_override_limit_percent: number;
  qty_override_limit_percent: number;
  
  // Vendor Controls
  block_high_risk_vendors: boolean;
  require_vendor_compliance: boolean;
  vendor_credit_check: boolean;
  
  // Document Controls
  require_po_for_invoice: boolean;
  require_gr_for_invoice: boolean;
  allow_partial_receipt: boolean;
  allow_partial_invoice: boolean;
  
  // Defaults
  default_payment_terms_id?: number;
  default_warehouse_id?: number;
  default_currency_id?: number;
}

// Default settings
const DEFAULT_SETTINGS: Omit<ProcurementSettings, 'company_id'> = {
  enable_three_way_matching: true,
  price_tolerance_percent: 2,
  qty_tolerance_percent: 5,
  allow_over_receipt: false,
  allow_over_invoice: false,
  require_po_approval: true,
  require_invoice_approval: true,
  require_gr_approval: false,
  require_return_approval: true,
  auto_post_goods_receipts: false,
  allow_operational_gr: true,
  batch_financial_posting: false,
  enable_operational_gr_without_posting: false,
  allow_price_override: false,
  allow_qty_override: false,
  price_override_limit_percent: 10,
  qty_override_limit_percent: 20,
  block_high_risk_vendors: true,
  require_vendor_compliance: false,
  vendor_credit_check: false,
  require_po_for_invoice: true,
  require_gr_for_invoice: true,
  allow_partial_receipt: true,
  allow_partial_invoice: true
};

// Simple cache with TTL
const settingsCache = new Map<number, { settings: ProcurementSettings; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Procurement Settings Service
 */
export class ProcurementSettingsService {
  
  /**
   * Get settings for a company (with caching)
   */
  static async getSettings(companyId: number): Promise<ProcurementSettings> {
    // Check cache
    const cached = settingsCache.get(companyId);
    if (cached && cached.expires > Date.now()) {
      return cached.settings;
    }
    
    try {
      const result = await pool.query(
        'SELECT * FROM procurement_settings WHERE company_id = $1',
        [companyId]
      );
      
      let settings: ProcurementSettings;
      
      if (result.rows[0]) {
        settings = this.mapRowToSettings(result.rows[0]);
      } else {
        // Create default settings for company
        settings = await this.createDefaultSettings(companyId);
      }
      
      // Cache it
      settingsCache.set(companyId, {
        settings,
        expires: Date.now() + CACHE_TTL
      });
      
      return settings;
    } catch (error) {
      logger.error('Error fetching procurement settings:', error);
      return { company_id: companyId, ...DEFAULT_SETTINGS };
    }
  }
  
  /**
   * Update settings for a company
   */
  static async updateSettings(
    companyId: number,
    updates: Partial<ProcurementSettings>,
    updatedBy: number
  ): Promise<ProcurementSettings> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    // Build dynamic update
    const allowedFields = [
      'enable_three_way_matching', 'price_tolerance_percent', 'qty_tolerance_percent',
      'allow_over_receipt', 'allow_over_invoice', 'require_po_approval',
      'require_invoice_approval', 'require_gr_approval', 'require_return_approval',
      'auto_post_goods_receipts', 'allow_operational_gr', 'batch_financial_posting',
      'allow_price_override', 'allow_qty_override', 'price_override_limit_percent',
      'qty_override_limit_percent', 'block_high_risk_vendors', 'require_vendor_compliance',
      'vendor_credit_check', 'require_po_for_invoice', 'require_gr_for_invoice',
      'allow_partial_receipt', 'allow_partial_invoice', 'default_payment_terms_id',
      'default_warehouse_id', 'default_currency_id'
    ];
    
    for (const field of allowedFields) {
      if (field in updates) {
        fields.push(`${field} = $${paramIndex}`);
        values.push((updates as any)[field]);
        paramIndex++;
      }
    }
    
    if (fields.length === 0) {
      return this.getSettings(companyId);
    }
    
    fields.push(`updated_at = NOW()`);
    fields.push(`updated_by = $${paramIndex}`);
    values.push(updatedBy);
    paramIndex++;
    
    values.push(companyId);
    
    await pool.query(
      `UPDATE procurement_settings SET ${fields.join(', ')} WHERE company_id = $${paramIndex}`,
      values
    );
    
    // Invalidate cache
    settingsCache.delete(companyId);
    
    logger.info(`Procurement settings updated for company ${companyId}`);
    return this.getSettings(companyId);
  }
  
  /**
   * Create default settings for a new company
   */
  private static async createDefaultSettings(companyId: number): Promise<ProcurementSettings> {
    await pool.query(
      'INSERT INTO procurement_settings (company_id) VALUES ($1) ON CONFLICT (company_id) DO NOTHING',
      [companyId]
    );
    return { company_id: companyId, ...DEFAULT_SETTINGS };
  }
  
  /**
   * Map database row to settings object
   */
  private static mapRowToSettings(row: any): ProcurementSettings {
    return {
      company_id: row.company_id,
      enable_three_way_matching: row.enable_three_way_matching ?? true,
      price_tolerance_percent: parseFloat(row.price_tolerance_percent) || 2,
      qty_tolerance_percent: parseFloat(row.qty_tolerance_percent) || 5,
      allow_over_receipt: row.allow_over_receipt ?? false,
      allow_over_invoice: row.allow_over_invoice ?? false,
      require_po_approval: row.require_po_approval ?? true,
      require_invoice_approval: row.require_invoice_approval ?? true,
      require_gr_approval: row.require_gr_approval ?? false,
      require_return_approval: row.require_return_approval ?? true,
      auto_post_goods_receipts: row.auto_post_goods_receipts ?? false,
      allow_operational_gr: row.allow_operational_gr ?? true,
      batch_financial_posting: row.batch_financial_posting ?? false,
      allow_price_override: row.allow_price_override ?? false,
      allow_qty_override: row.allow_qty_override ?? false,
      price_override_limit_percent: parseFloat(row.price_override_limit_percent) || 10,
      qty_override_limit_percent: parseFloat(row.qty_override_limit_percent) || 20,
      block_high_risk_vendors: row.block_high_risk_vendors ?? true,
      require_vendor_compliance: row.require_vendor_compliance ?? false,
      vendor_credit_check: row.vendor_credit_check ?? false,
      require_po_for_invoice: row.require_po_for_invoice ?? true,
      require_gr_for_invoice: row.require_gr_for_invoice ?? true,
      allow_partial_receipt: row.allow_partial_receipt ?? true,
      allow_partial_invoice: row.allow_partial_invoice ?? true,
      enable_operational_gr_without_posting: row.enable_operational_gr_without_posting ?? false,
      default_payment_terms_id: row.default_payment_terms_id,
      default_warehouse_id: row.default_warehouse_id,
      default_currency_id: row.default_currency_id
    };
  }
  
  /**
   * Check if vendor can be used for PO creation
   */
  static async canCreatePOForVendor(
    companyId: number,
    vendorId: number
  ): Promise<{ allowed: boolean; reason?: string; reason_ar?: string }> {
    const settings = await this.getSettings(companyId);
    
    if (!settings.block_high_risk_vendors) {
      return { allowed: true };
    }
    
    try {
      const result = await pool.query(
        `SELECT * FROM vendor_compliance 
         WHERE vendor_id = $1 AND company_id = $2`,
        [vendorId, companyId]
      );
      
      const compliance = result.rows[0];
      
      if (!compliance) {
        // No compliance record, allow by default
        if (settings.require_vendor_compliance) {
          return {
            allowed: false,
            reason: 'Vendor has no compliance record. Complete vendor compliance first.',
            reason_ar: 'المورد ليس لديه سجل امتثال. يرجى إكمال سجل امتثال المورد أولاً.'
          };
        }
        return { allowed: true };
      }
      
      if (compliance.is_blacklisted) {
        return {
          allowed: false,
          reason: `Vendor is blacklisted: ${compliance.blacklist_reason || 'No reason provided'}`,
          reason_ar: `المورد محظور: ${compliance.blacklist_reason || 'لم يتم تقديم سبب'}`
        };
      }
      
      if (compliance.is_on_hold) {
        return {
          allowed: false,
          reason: `Vendor is on hold: ${compliance.hold_reason || 'No reason provided'}`,
          reason_ar: `المورد معلق: ${compliance.hold_reason || 'لم يتم تقديم سبب'}`
        };
      }
      
      if (compliance.risk_level === 'critical') {
        return {
          allowed: false,
          reason: 'Vendor has critical risk level. Contact procurement manager.',
          reason_ar: 'المورد لديه مستوى خطر حرج. تواصل مع مدير المشتريات.'
        };
      }
      
      if (compliance.risk_level === 'high') {
        // Allow but with warning
        return {
          allowed: true,
          reason: 'Warning: Vendor has high risk level. Proceed with caution.',
          reason_ar: 'تحذير: المورد لديه مستوى خطر عالي. تابع بحذر.'
        };
      }
      
      return { allowed: true };
    } catch (error) {
      logger.error('Error checking vendor compliance:', error);
      return { allowed: true }; // Fail open
    }
  }
  
  /**
   * Invalidate cache for a company
   */
  static invalidateCache(companyId: number): void {
    settingsCache.delete(companyId);
  }
  
  /**
   * Clear all cache (for testing)
   */
  static clearCache(): void {
    settingsCache.clear();
  }
}

export default ProcurementSettingsService;
