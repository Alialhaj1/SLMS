/**
 * 🔢 DOCUMENT NUMBER SERVICE (Shared)
 * =====================================
 * Centralized document numbering with fiscal year support
 * 
 * Features:
 * ✅ Per-company, per-document-type configuration
 * ✅ Fiscal year reset
 * ✅ Atomic number generation (race-safe)
 * ✅ Format: PREFIX-YEAR-NUMBER (e.g., PO-2024-0001)
 */

import pool from '../db';
import { logger } from '../utils/logger';

export type DocumentType = 
  // Procurement
  | 'purchase_order'
  | 'purchase_invoice'
  | 'purchase_return'
  | 'goods_receipt'
  | 'vendor_quotation'
  | 'vendor_contract'
  // Logistics
  | 'logistics_shipment'
  // Customs
  | 'customs_declaration'
  // Sales
  | 'sales_quotation'
  | 'sales_order'
  | 'sales_invoice'
  | 'delivery_note'
  | 'sales_return'
  | 'credit_note'
  // Accounting
  | 'journal_entry'
  | 'payment_voucher'
  | 'receipt_voucher';

export interface NumberingConfig {
  prefix: string;
  suffix?: string;
  separator: string;
  number_length: number;
  reset_policy: 'yearly' | 'monthly' | 'never';
  include_fiscal_year: boolean;
  fiscal_year_format: 'YYYY' | 'YY';
  include_branch_code: boolean;
}

export interface GeneratedNumber {
  number: string;
  sequence: number;
  fiscal_year: number;
}

// Default configs for document types
const DEFAULT_CONFIGS: Record<DocumentType, Partial<NumberingConfig>> = {
  purchase_order: { prefix: 'PO' },
  purchase_invoice: { prefix: 'PINV' },
  purchase_return: { prefix: 'PRET' },
  goods_receipt: { prefix: 'GR' },
  vendor_quotation: { prefix: 'VQ' },
  vendor_contract: { prefix: 'VC' },
  logistics_shipment: { prefix: 'SHP' },
  customs_declaration: { prefix: 'CD' },
  sales_quotation: { prefix: 'SQ' },
  sales_order: { prefix: 'SO' },
  sales_invoice: { prefix: 'SINV' },
  delivery_note: { prefix: 'DN' },
  sales_return: { prefix: 'SRET' },
  credit_note: { prefix: 'CN' },
  journal_entry: { prefix: 'JE' },
  payment_voucher: { prefix: 'PV' },
  receipt_voucher: { prefix: 'RV' }
};

/**
 * Document Number Service
 */
export class DocumentNumberService {
  
  /**
   * Generate next document number (atomic)
   */
  static async generateNumber(
    companyId: number,
    documentType: DocumentType,
    branchCode?: string
  ): Promise<GeneratedNumber> {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    // Use transaction with row lock
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Lock the row for update
      const result = await client.query(
        `SELECT * FROM document_number_series 
         WHERE company_id = $1 AND document_type = $2
         FOR UPDATE`,
        [companyId, documentType]
      );
      
      let config = result.rows[0];
      
      // Create default config if not exists
      if (!config) {
        const defaultConfig = DEFAULT_CONFIGS[documentType] || { prefix: documentType.toUpperCase() };
        await client.query(
          `INSERT INTO document_number_series (
            company_id, document_type, prefix, current_number, fiscal_year
          ) VALUES ($1, $2, $3, 0, $4)
          RETURNING *`,
          [companyId, documentType, defaultConfig.prefix, currentYear]
        );
        
        const newResult = await client.query(
          `SELECT * FROM document_number_series 
           WHERE company_id = $1 AND document_type = $2
           FOR UPDATE`,
          [companyId, documentType]
        );
        config = newResult.rows[0];
      }
      
      // Check if need to reset based on policy
      let needsReset = false;
      if (config.reset_policy === 'yearly' && config.fiscal_year !== currentYear) {
        needsReset = true;
      } else if (config.reset_policy === 'monthly' && 
                 (config.fiscal_year !== currentYear || config.fiscal_month !== currentMonth)) {
        needsReset = true;
      }
      
      // Get next number
      let nextNumber: number;
      let fiscalYear = config.fiscal_year || currentYear;
      
      if (needsReset) {
        nextNumber = 1;
        fiscalYear = currentYear;
        
        await client.query(
          `UPDATE document_number_series 
           SET current_number = 1, 
               fiscal_year = $1, 
               fiscal_month = $2,
               last_reset_at = NOW(),
               updated_at = NOW()
           WHERE id = $3`,
          [currentYear, currentMonth, config.id]
        );
      } else {
        nextNumber = (config.current_number || 0) + 1;
        
        await client.query(
          `UPDATE document_number_series 
           SET current_number = $1, updated_at = NOW()
           WHERE id = $2`,
          [nextNumber, config.id]
        );
      }
      
      await client.query('COMMIT');
      
      // Format the number
      const formattedNumber = this.formatNumber(config, nextNumber, fiscalYear, branchCode);
      
      return {
        number: formattedNumber,
        sequence: nextNumber,
        fiscal_year: fiscalYear
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error generating document number:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Format number based on config
   */
  private static formatNumber(
    config: any,
    sequence: number,
    fiscalYear: number,
    branchCode?: string
  ): string {
    const parts: string[] = [];
    
    // Prefix
    parts.push(config.prefix || 'DOC');
    
    // Branch code (optional)
    if (config.include_branch_code && branchCode) {
      parts.push(branchCode);
    }
    
    // Fiscal year (optional)
    if (config.include_fiscal_year !== false) {
      const yearFormat = config.fiscal_year_format || 'YYYY';
      const yearStr = yearFormat === 'YY' 
        ? String(fiscalYear).slice(-2)
        : String(fiscalYear);
      parts.push(yearStr);
    }
    
    // Sequence number (padded)
    const numberLength = config.number_length || 4;
    const paddedNumber = String(sequence).padStart(numberLength, '0');
    parts.push(paddedNumber);
    
    // Join with separator
    const separator = config.separator || '-';
    let result = parts.join(separator);
    
    // Add suffix if exists
    if (config.suffix) {
      result += separator + config.suffix;
    }
    
    return result;
  }
  
  /**
   * Preview what the next number will be (without incrementing)
   */
  static async previewNextNumber(
    companyId: number,
    documentType: DocumentType,
    branchCode?: string
  ): Promise<string> {
    const currentYear = new Date().getFullYear();
    
    const result = await pool.query(
      `SELECT * FROM document_number_series 
       WHERE company_id = $1 AND document_type = $2`,
      [companyId, documentType]
    );
    
    const config = result.rows[0];
    
    if (!config) {
      const defaultConfig = DEFAULT_CONFIGS[documentType] || { prefix: documentType.toUpperCase() };
      return `${defaultConfig.prefix}-${currentYear}-0001`;
    }
    
    // Check if would reset
    let nextNumber = (config.current_number || 0) + 1;
    let fiscalYear = config.fiscal_year || currentYear;
    
    if (config.reset_policy === 'yearly' && config.fiscal_year !== currentYear) {
      nextNumber = 1;
      fiscalYear = currentYear;
    }
    
    return this.formatNumber(config, nextNumber, fiscalYear, branchCode);
  }
  
  /**
   * Update numbering configuration
   */
  static async updateConfig(
    companyId: number,
    documentType: DocumentType,
    updates: Partial<NumberingConfig>
  ): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    const allowedFields = [
      'prefix', 'suffix', 'separator', 'number_length',
      'reset_policy', 'include_fiscal_year', 'fiscal_year_format',
      'include_branch_code'
    ];
    
    for (const field of allowedFields) {
      if (field in updates) {
        fields.push(`${field} = $${paramIndex}`);
        values.push((updates as any)[field]);
        paramIndex++;
      }
    }
    
    if (fields.length === 0) return;
    
    fields.push('updated_at = NOW()');
    values.push(companyId, documentType);
    
    await pool.query(
      `UPDATE document_number_series 
       SET ${fields.join(', ')}
       WHERE company_id = $${paramIndex} AND document_type = $${paramIndex + 1}`,
      values
    );
    
    logger.info(`Document numbering updated for ${documentType} in company ${companyId}`);
  }
  
  /**
   * Get all numbering configs for a company
   */
  static async getAllConfigs(companyId: number): Promise<any[]> {
    const result = await pool.query(
      `SELECT * FROM document_number_series 
       WHERE company_id = $1
       ORDER BY document_type`,
      [companyId]
    );
    return result.rows;
  }
  
  /**
   * Manually set current number (admin only - use with caution)
   */
  static async setCurrentNumber(
    companyId: number,
    documentType: DocumentType,
    newNumber: number
  ): Promise<void> {
    await pool.query(
      `UPDATE document_number_series 
       SET current_number = $1, updated_at = NOW()
       WHERE company_id = $2 AND document_type = $3`,
      [newNumber, companyId, documentType]
    );
    
    logger.warn(`Document number manually set for ${documentType} to ${newNumber} in company ${companyId}`);
  }
}

export default DocumentNumberService;
