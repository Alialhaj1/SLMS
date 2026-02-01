/**
 * 📊 JOURNAL ENTRY SERVICE
 * =========================
 * Creates real accounting entries for procurement transactions
 * 
 * Entry Types:
 * ✅ Purchase Invoice: Dr Inventory/Expense, Cr AP
 * ✅ Purchase Return: Dr AP, Cr Inventory
 * ✅ Goods Receipt: Optional interim entries
 * ✅ Reversal entries for all posted documents
 */

import pool from '../db';
import { logger } from '../utils/logger';

// Journal Entry Types
export type JournalEntryType = 
  | 'purchase_invoice'
  | 'purchase_invoice_reversal'
  | 'purchase_return'
  | 'purchase_return_reversal'
  | 'goods_receipt'
  | 'goods_receipt_reversal'
  | 'vendor_payment'
  | 'vendor_payment_reversal'
  | 'customs_expense'
  | 'freight_expense'
  | 'manual_adjustment';

// Journal Entry Line
export interface JournalEntryLine {
  account_id?: number;
  account_code: string;
  account_name?: string;
  description: string;
  description_ar?: string;
  debit_amount: number;
  credit_amount: number;
  cost_center_id?: number;
  project_id?: number;
  department_id?: number;
  vendor_id?: number;
  item_id?: number;
  warehouse_id?: number;
}

// Journal Entry Header
export interface JournalEntryHeader {
  company_id: number;
  entry_date: string;
  entry_type: JournalEntryType;
  reference_type: string;
  reference_id: number;
  reference_number: string;
  description: string;
  description_ar?: string;
  currency_id?: number;
  exchange_rate?: number;
  created_by: number;
  lines: JournalEntryLine[];
}

// Account Codes (configurable per company)
const DEFAULT_ACCOUNTS = {
  INVENTORY: '1400',           // Inventory Asset
  INVENTORY_INTERIM: '1410',   // Goods Received Not Invoiced
  ACCOUNTS_PAYABLE: '2100',    // Accounts Payable - Trade
  PURCHASE_EXPENSE: '5100',    // Purchase Expense (for non-inventory items)
  PURCHASE_RETURNS: '5150',    // Purchase Returns & Allowances
  FREIGHT_IN: '5200',          // Freight-In Expense
  CUSTOMS_EXPENSE: '5210',     // Customs & Duties Expense
  INSURANCE_EXPENSE: '5220',   // Insurance Expense
  VAT_INPUT: '1600',           // VAT Input (Recoverable)
  PURCHASE_DISCOUNT: '5160',   // Purchase Discounts
};

/**
 * Journal Entry Service
 */
export class JournalEntryService {
  
  /**
   * Get account ID by code for a company
   */
  private static async getAccountId(companyId: number, accountCode: string): Promise<number | null> {
    try {
      const result = await pool.query(
        `SELECT id FROM chart_of_accounts 
         WHERE company_id = $1 AND account_code = $2 AND deleted_at IS NULL`,
        [companyId, accountCode]
      );
      return result.rows[0]?.id || null;
    } catch (error) {
      logger.warn(`Account not found: ${accountCode} for company ${companyId}`);
      return null;
    }
  }
  
  /**
   * Generate journal entry number
   */
  private static async generateEntryNumber(companyId: number): Promise<string> {
    const result = await pool.query(
      `SELECT entry_number FROM journal_entries 
       WHERE company_id = $1 ORDER BY id DESC LIMIT 1`,
      [companyId]
    );
    
    const lastNumber = result.rows[0]?.entry_number || 'JE-0000';
    const numericPart = parseInt(lastNumber.replace('JE-', '')) || 0;
    return `JE-${String(numericPart + 1).padStart(4, '0')}`;
  }
  
  /**
   * Create journal entry with lines
   */
  static async createEntry(entry: JournalEntryHeader): Promise<number> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Validate balanced entry
      const totalDebit = entry.lines.reduce((sum, line) => sum + line.debit_amount, 0);
      const totalCredit = entry.lines.reduce((sum, line) => sum + line.credit_amount, 0);
      
      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        throw new Error(`Journal entry is not balanced. Debit: ${totalDebit}, Credit: ${totalCredit}`);
      }
      
      // Generate entry number
      const entryNumber = await this.generateEntryNumber(entry.company_id);
      
      // Insert header
      const headerResult = await client.query(
        `INSERT INTO journal_entries (
          company_id, entry_number, entry_date, entry_type, 
          reference_type, reference_id, reference_number,
          description, description_ar, currency_id, exchange_rate,
          total_debit, total_credit, status, created_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'posted', $14, NOW())
        RETURNING id`,
        [
          entry.company_id, entryNumber, entry.entry_date, entry.entry_type,
          entry.reference_type, entry.reference_id, entry.reference_number,
          entry.description, entry.description_ar, entry.currency_id, entry.exchange_rate || 1,
          totalDebit, totalCredit, entry.created_by
        ]
      );
      
      const journalEntryId = headerResult.rows[0].id;
      
      // Insert lines
      for (let i = 0; i < entry.lines.length; i++) {
        const line = entry.lines[i];
        const accountId = line.account_id || await this.getAccountId(entry.company_id, line.account_code);
        
        await client.query(
          `INSERT INTO journal_entry_lines (
            journal_entry_id, line_number, account_id, account_code,
            description, description_ar, debit_amount, credit_amount,
            cost_center_id, project_id, department_id, vendor_id, item_id, warehouse_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [
            journalEntryId, i + 1, accountId, line.account_code,
            line.description, line.description_ar, line.debit_amount, line.credit_amount,
            line.cost_center_id, line.project_id, line.department_id,
            line.vendor_id, line.item_id, line.warehouse_id
          ]
        );
      }
      
      await client.query('COMMIT');
      
      logger.info(`Journal entry created: ${entryNumber} for ${entry.reference_type} ${entry.reference_number}`);
      
      return journalEntryId;
      
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to create journal entry:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Create Purchase Invoice Journal Entry
   * Dr Inventory/Expense (item value)
   * Dr VAT Input (if applicable)
   * Cr Accounts Payable (total)
   */
  static async createPurchaseInvoiceEntry(
    invoiceId: number,
    invoiceNumber: string,
    companyId: number,
    vendorId: number,
    vendorName: string,
    invoiceDate: string,
    subtotal: number,
    taxAmount: number,
    totalAmount: number,
    items: Array<{ item_id?: number; item_name: string; amount: number; is_inventory: boolean }>,
    createdBy: number,
    currencyId?: number
  ): Promise<number> {
    
    const lines: JournalEntryLine[] = [];
    
    // Debit lines for each item
    for (const item of items) {
      lines.push({
        account_code: item.is_inventory ? DEFAULT_ACCOUNTS.INVENTORY : DEFAULT_ACCOUNTS.PURCHASE_EXPENSE,
        description: `Purchase: ${item.item_name}`,
        description_ar: `شراء: ${item.item_name}`,
        debit_amount: item.amount,
        credit_amount: 0,
        vendor_id: vendorId,
        item_id: item.item_id
      });
    }
    
    // Debit VAT if applicable
    if (taxAmount > 0) {
      lines.push({
        account_code: DEFAULT_ACCOUNTS.VAT_INPUT,
        description: 'VAT Input - Purchase Invoice',
        description_ar: 'ضريبة القيمة المضافة - فاتورة مشتريات',
        debit_amount: taxAmount,
        credit_amount: 0,
        vendor_id: vendorId
      });
    }
    
    // Credit Accounts Payable
    lines.push({
      account_code: DEFAULT_ACCOUNTS.ACCOUNTS_PAYABLE,
      description: `AP - ${vendorName}`,
      description_ar: `ذمم دائنة - ${vendorName}`,
      debit_amount: 0,
      credit_amount: totalAmount,
      vendor_id: vendorId
    });
    
    return await this.createEntry({
      company_id: companyId,
      entry_date: invoiceDate,
      entry_type: 'purchase_invoice',
      reference_type: 'purchase_invoice',
      reference_id: invoiceId,
      reference_number: invoiceNumber,
      description: `Purchase Invoice ${invoiceNumber} - ${vendorName}`,
      description_ar: `فاتورة مشتريات ${invoiceNumber} - ${vendorName}`,
      currency_id: currencyId,
      created_by: createdBy,
      lines
    });
  }
  
  /**
   * Create Purchase Invoice Reversal Entry
   * Reverses the original entry
   */
  static async createPurchaseInvoiceReversalEntry(
    invoiceId: number,
    invoiceNumber: string,
    companyId: number,
    vendorId: number,
    vendorName: string,
    reversalDate: string,
    subtotal: number,
    taxAmount: number,
    totalAmount: number,
    items: Array<{ item_id?: number; item_name: string; amount: number; is_inventory: boolean }>,
    createdBy: number,
    currencyId?: number
  ): Promise<number> {
    
    const lines: JournalEntryLine[] = [];
    
    // Credit (reverse) lines for each item
    for (const item of items) {
      lines.push({
        account_code: item.is_inventory ? DEFAULT_ACCOUNTS.INVENTORY : DEFAULT_ACCOUNTS.PURCHASE_EXPENSE,
        description: `Reversal: ${item.item_name}`,
        description_ar: `عكس: ${item.item_name}`,
        debit_amount: 0,
        credit_amount: item.amount,
        vendor_id: vendorId,
        item_id: item.item_id
      });
    }
    
    // Credit (reverse) VAT if applicable
    if (taxAmount > 0) {
      lines.push({
        account_code: DEFAULT_ACCOUNTS.VAT_INPUT,
        description: 'Reversal: VAT Input',
        description_ar: 'عكس: ضريبة القيمة المضافة',
        debit_amount: 0,
        credit_amount: taxAmount,
        vendor_id: vendorId
      });
    }
    
    // Debit (reverse) Accounts Payable
    lines.push({
      account_code: DEFAULT_ACCOUNTS.ACCOUNTS_PAYABLE,
      description: `Reversal AP - ${vendorName}`,
      description_ar: `عكس ذمم دائنة - ${vendorName}`,
      debit_amount: totalAmount,
      credit_amount: 0,
      vendor_id: vendorId
    });
    
    return await this.createEntry({
      company_id: companyId,
      entry_date: reversalDate,
      entry_type: 'purchase_invoice_reversal',
      reference_type: 'purchase_invoice',
      reference_id: invoiceId,
      reference_number: `REV-${invoiceNumber}`,
      description: `Reversal: Purchase Invoice ${invoiceNumber}`,
      description_ar: `عكس: فاتورة مشتريات ${invoiceNumber}`,
      currency_id: currencyId,
      created_by: createdBy,
      lines
    });
  }
  
  /**
   * Create Purchase Return Journal Entry
   * Dr Accounts Payable
   * Cr Inventory/Expense
   * Cr VAT Input (if applicable)
   */
  static async createPurchaseReturnEntry(
    returnId: number,
    returnNumber: string,
    companyId: number,
    vendorId: number,
    vendorName: string,
    returnDate: string,
    subtotal: number,
    taxAmount: number,
    totalAmount: number,
    items: Array<{ item_id?: number; item_name: string; amount: number; is_inventory: boolean }>,
    createdBy: number,
    currencyId?: number
  ): Promise<number> {
    
    const lines: JournalEntryLine[] = [];
    
    // Debit Accounts Payable (reduce what we owe)
    lines.push({
      account_code: DEFAULT_ACCOUNTS.ACCOUNTS_PAYABLE,
      description: `Return to ${vendorName}`,
      description_ar: `مرتجع إلى ${vendorName}`,
      debit_amount: totalAmount,
      credit_amount: 0,
      vendor_id: vendorId
    });
    
    // Credit lines for each item
    for (const item of items) {
      lines.push({
        account_code: item.is_inventory ? DEFAULT_ACCOUNTS.INVENTORY : DEFAULT_ACCOUNTS.PURCHASE_RETURNS,
        description: `Return: ${item.item_name}`,
        description_ar: `مرتجع: ${item.item_name}`,
        debit_amount: 0,
        credit_amount: item.amount,
        vendor_id: vendorId,
        item_id: item.item_id
      });
    }
    
    // Credit VAT if applicable
    if (taxAmount > 0) {
      lines.push({
        account_code: DEFAULT_ACCOUNTS.VAT_INPUT,
        description: 'VAT Reversal - Purchase Return',
        description_ar: 'عكس ضريبة - مرتجع مشتريات',
        debit_amount: 0,
        credit_amount: taxAmount,
        vendor_id: vendorId
      });
    }
    
    return await this.createEntry({
      company_id: companyId,
      entry_date: returnDate,
      entry_type: 'purchase_return',
      reference_type: 'purchase_return',
      reference_id: returnId,
      reference_number: returnNumber,
      description: `Purchase Return ${returnNumber} - ${vendorName}`,
      description_ar: `مرتجع مشتريات ${returnNumber} - ${vendorName}`,
      currency_id: currencyId,
      created_by: createdBy,
      lines
    });
  }
  
  /**
   * Create Freight/Customs/Insurance Expense Entry
   */
  static async createCostAllocationEntry(
    referenceType: 'shipment' | 'purchase_order' | 'goods_receipt',
    referenceId: number,
    referenceNumber: string,
    companyId: number,
    vendorId: number | null,
    vendorName: string,
    entryDate: string,
    costs: {
      freight?: number;
      customs?: number;
      insurance?: number;
    },
    paymentMethod: 'payable' | 'cash',
    createdBy: number,
    currencyId?: number
  ): Promise<number> {
    
    const lines: JournalEntryLine[] = [];
    let totalCost = 0;
    
    // Freight expense
    if (costs.freight && costs.freight > 0) {
      lines.push({
        account_code: DEFAULT_ACCOUNTS.FREIGHT_IN,
        description: `Freight - ${referenceNumber}`,
        description_ar: `شحن - ${referenceNumber}`,
        debit_amount: costs.freight,
        credit_amount: 0,
        vendor_id: vendorId || undefined
      });
      totalCost += costs.freight;
    }
    
    // Customs expense
    if (costs.customs && costs.customs > 0) {
      lines.push({
        account_code: DEFAULT_ACCOUNTS.CUSTOMS_EXPENSE,
        description: `Customs - ${referenceNumber}`,
        description_ar: `جمارك - ${referenceNumber}`,
        debit_amount: costs.customs,
        credit_amount: 0
      });
      totalCost += costs.customs;
    }
    
    // Insurance expense
    if (costs.insurance && costs.insurance > 0) {
      lines.push({
        account_code: DEFAULT_ACCOUNTS.INSURANCE_EXPENSE,
        description: `Insurance - ${referenceNumber}`,
        description_ar: `تأمين - ${referenceNumber}`,
        debit_amount: costs.insurance,
        credit_amount: 0
      });
      totalCost += costs.insurance;
    }
    
    if (lines.length === 0) {
      throw new Error('No costs provided for allocation');
    }
    
    // Credit line - either AP or Cash
    if (paymentMethod === 'payable') {
      lines.push({
        account_code: DEFAULT_ACCOUNTS.ACCOUNTS_PAYABLE,
        description: `AP - ${vendorName}`,
        description_ar: `ذمم دائنة - ${vendorName}`,
        debit_amount: 0,
        credit_amount: totalCost,
        vendor_id: vendorId || undefined
      });
    } else {
      lines.push({
        account_code: '1000', // Cash account
        description: 'Cash payment',
        description_ar: 'دفع نقدي',
        debit_amount: 0,
        credit_amount: totalCost
      });
    }
    
    const entryType: JournalEntryType = costs.customs ? 'customs_expense' : 'freight_expense';
    
    return await this.createEntry({
      company_id: companyId,
      entry_date: entryDate,
      entry_type: entryType,
      reference_type: referenceType,
      reference_id: referenceId,
      reference_number: referenceNumber,
      description: `Cost Allocation - ${referenceNumber}`,
      description_ar: `تخصيص تكلفة - ${referenceNumber}`,
      currency_id: currencyId,
      created_by: createdBy,
      lines
    });
  }
  
  /**
   * Get journal entries for a reference document
   */
  static async getEntriesForDocument(
    referenceType: string,
    referenceId: number
  ): Promise<any[]> {
    const result = await pool.query(
      `SELECT je.*, 
        (SELECT json_agg(jel ORDER BY jel.line_number)
         FROM journal_entry_lines jel 
         WHERE jel.journal_entry_id = je.id) as lines
       FROM journal_entries je
       WHERE je.reference_type = $1 AND je.reference_id = $2
       ORDER BY je.created_at DESC`,
      [referenceType, referenceId]
    );
    return result.rows;
  }
  
  /**
   * Reverse a journal entry by creating a contra entry
   */
  static async reverseEntry(
    originalEntryId: number,
    createdBy: number,
    reason: string,
    client?: any
  ): Promise<number> {
    const db = client || pool;
    
    // Get original entry
    const entryResult = await db.query(
      `SELECT * FROM journal_entries WHERE id = $1`,
      [originalEntryId]
    );
    
    if (entryResult.rows.length === 0) {
      throw new Error('Original journal entry not found');
    }
    
    const original = entryResult.rows[0];
    
    // Get original lines
    const linesResult = await db.query(
      `SELECT * FROM journal_entry_lines WHERE journal_entry_id = $1 ORDER BY line_number`,
      [originalEntryId]
    );
    
    // Create reversal entry with swapped debits/credits
    const reversalNumber = await this.generateEntryNumber(original.company_id);
    
    const reversalResult = await db.query(`
      INSERT INTO journal_entries (
        company_id, entry_number, entry_date, entry_type, 
        reference_type, reference_id, reference_number, 
        description, description_ar, 
        currency_id, exchange_rate, 
        total_debit, total_credit, 
        status, is_reversing, reversing_entry_id,
        created_by
      ) VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'posted', true, $13, $14)
      RETURNING id
    `, [
      original.company_id,
      reversalNumber,
      original.entry_type + '_reversal',
      original.reference_type,
      original.reference_id,
      original.reference_number,
      `Reversal: ${original.description} - ${reason}`,
      original.description_ar ? `عكس: ${original.description_ar}` : null,
      original.currency_id,
      original.exchange_rate,
      original.total_credit, // Swap totals
      original.total_debit,
      originalEntryId,
      createdBy
    ]);
    
    const reversalId = reversalResult.rows[0].id;
    
    // Insert reversed lines (swap debit/credit)
    for (const line of linesResult.rows) {
      await db.query(`
        INSERT INTO journal_entry_lines (
          journal_entry_id, line_number, 
          account_id, description, description_ar,
          debit_amount, credit_amount,
          cost_center_id, project_id, department_id,
          vendor_id, customer_id, item_id, warehouse_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `, [
        reversalId,
        line.line_number,
        line.account_id,
        `Reversal: ${line.description}`,
        line.description_ar ? `عكس: ${line.description_ar}` : null,
        line.credit_amount, // Swap debit/credit
        line.debit_amount,
        line.cost_center_id,
        line.project_id,
        line.department_id,
        line.vendor_id,
        line.customer_id,
        line.item_id,
        line.warehouse_id
      ]);
    }
    
    // Mark original entry as reversed
    await db.query(`
      UPDATE journal_entries SET 
        is_reversed = true, 
        reversed_by_entry_id = $1, 
        reversed_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [reversalId, originalEntryId]);
    
    logger.info(`Reversed journal entry ${original.entry_number} -> ${reversalNumber}`);
    
    return reversalId;
  }
}

export default JournalEntryService;
