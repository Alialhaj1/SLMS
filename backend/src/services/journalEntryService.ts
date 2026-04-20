/**
 * 📊 JOURNAL ENTRY SERVICE
 * =========================
 * Creates real accounting entries for procurement transactions.
 * 
 * Now routes ALL entries through the unified FinancialPostingEngine,
 * which writes to journal_lines (not journal_entry_lines) and posts
 * to general_ledger for real trial balance / balance sheet.
 * 
 * Entry Types:
 * ✅ Purchase Invoice: Dr Inventory/Expense, Cr AP
 * ✅ Purchase Return: Dr AP, Cr Inventory
 * ✅ Goods Receipt: Optional interim entries
 * ✅ Reversal entries for all posted documents
 */

import pool from '../db';
import { logger } from '../utils/logger';
import { financialPostingEngine, PostingLine, PostingRequest } from './financialPostingEngine';

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

// Fallback account codes (used ONLY if default_accounts table has no entry for the company)
const FALLBACK_ACCOUNTS: Record<string, string> = {
  INVENTORY: '1400',
  ACCOUNTS_PAYABLE: '2100',
  PURCHASE_EXPENSE: '5100',
  PURCHASE_RETURNS: '5150',
  FREIGHT_IN: '5200',
  CUSTOMS_EXPENSE: '5210',
  INSURANCE_EXPENSE: '5220',
  VAT_INPUT: '1600',
  PURCHASE_DISCOUNT: '5160',
};

// Key mapping from internal names to default_accounts.account_key
const ACCOUNT_KEY_MAP: Record<string, string> = {
  INVENTORY: 'INVENTORY',
  ACCOUNTS_PAYABLE: 'AP_TRADE',
  PURCHASE_EXPENSE: 'COGS',
  VAT_INPUT: 'VAT_INPUT',
  FREIGHT_IN: 'FREIGHT_IN',
  CUSTOMS_EXPENSE: 'CUSTOMS',
};

/**
 * Resolve account code from default_accounts table for a given company.
 * Falls back to hardcoded codes only if no DB config exists.
 */
async function resolveDefaultAccountCode(companyId: number, internalKey: string): Promise<string> {
  const dbKey = ACCOUNT_KEY_MAP[internalKey];
  if (dbKey) {
    try {
      const result = await pool.query(
        `SELECT a.code FROM default_accounts da 
         JOIN accounts a ON da.account_id = a.id 
         WHERE da.company_id = $1 AND da.account_key = $2 AND da.is_active = true`,
        [companyId, dbKey]
      );
      if (result.rows[0]?.code) {
        return result.rows[0].code;
      }
    } catch (e) {
      logger.warn(`Failed to resolve default account ${dbKey} for company ${companyId}`);
    }
  }
  return FALLBACK_ACCOUNTS[internalKey] || internalKey;
}

/**
 * Journal Entry Service
 */
export class JournalEntryService {
  
  /**
   * Get account ID by code for a company.
   * Uses the `accounts` table (not chart_of_accounts — that table doesn't exist).
   */
  private static async getAccountId(companyId: number, accountCode: string): Promise<number | null> {
    try {
      const result = await pool.query(
        `SELECT id FROM accounts 
         WHERE company_id = $1 AND code = $2 AND deleted_at IS NULL`,
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
   * Create journal entry with lines.
   * Routes through the unified FinancialPostingEngine for proper GL posting.
   */
  static async createEntry(entry: JournalEntryHeader): Promise<number> {
    // Resolve account IDs for lines that only have codes
    const resolvedLines: PostingLine[] = [];

    for (const line of entry.lines) {
      const accountId = line.account_id || await this.getAccountId(entry.company_id, line.account_code);
      if (!accountId) {
        throw new Error(`Account not found: ${line.account_code} for company ${entry.company_id}`);
      }

      resolvedLines.push({
        accountId,
        accountCode: line.account_code,
        debit: line.debit_amount,
        credit: line.credit_amount,
        description: line.description,
        costCenterId: line.cost_center_id,
        projectId: line.project_id,
        partnerType: line.vendor_id ? 'vendor' : undefined,
        partnerId: line.vendor_id || undefined
      });
    }

    // Map entry_type to journal type prefix
    const journalTypeMap: Record<string, string> = {
      'purchase_invoice': 'PJ',
      'purchase_invoice_reversal': 'PJ',
      'purchase_return': 'PJ',
      'purchase_return_reversal': 'PJ',
      'goods_receipt': 'GRJ',
      'goods_receipt_reversal': 'GRJ',
      'vendor_payment': 'CPJ',
      'vendor_payment_reversal': 'CPJ',
      'customs_expense': 'PJ',
      'freight_expense': 'PJ',
      'manual_adjustment': 'ADJ'
    };

    const result = await financialPostingEngine.post({
      companyId: entry.company_id,
      entryDate: entry.entry_date,
      journalType: journalTypeMap[entry.entry_type] || 'GJ',
      entryType: entry.entry_type,
      sourceType: entry.reference_type,
      sourceId: entry.reference_id,
      sourceNumber: entry.reference_number,
      description: entry.description,
      descriptionAr: entry.description_ar,
      currencyId: entry.currency_id,
      exchangeRate: entry.exchange_rate,
      lines: resolvedLines,
      userId: entry.created_by,
      isReversal: entry.entry_type.includes('reversal')
    });

    if (!result.success || !result.journalEntryId) {
      throw new Error(result.message || 'Failed to post journal entry');
    }

    logger.info(`Journal entry created via engine: ${result.entryNumber} for ${entry.reference_type} ${entry.reference_number}`);
    return result.journalEntryId;
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
    
    // Resolve account codes from default_accounts table
    const inventoryCode = await resolveDefaultAccountCode(companyId, 'INVENTORY');
    const purchaseExpenseCode = await resolveDefaultAccountCode(companyId, 'PURCHASE_EXPENSE');
    const vatInputCode = await resolveDefaultAccountCode(companyId, 'VAT_INPUT');
    const apCode = await resolveDefaultAccountCode(companyId, 'ACCOUNTS_PAYABLE');
    
    // Debit lines for each item
    for (const item of items) {
      lines.push({
        account_code: item.is_inventory ? inventoryCode : purchaseExpenseCode,
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
        account_code: vatInputCode,
        description: 'VAT Input - Purchase Invoice',
        description_ar: 'ضريبة القيمة المضافة - فاتورة مشتريات',
        debit_amount: taxAmount,
        credit_amount: 0,
        vendor_id: vendorId
      });
    }
    
    // Credit Accounts Payable
    lines.push({
      account_code: apCode,
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
    
    // Resolve account codes from default_accounts table
    const inventoryCode = await resolveDefaultAccountCode(companyId, 'INVENTORY');
    const purchaseExpenseCode = await resolveDefaultAccountCode(companyId, 'PURCHASE_EXPENSE');
    const vatInputCode = await resolveDefaultAccountCode(companyId, 'VAT_INPUT');
    const apCode = await resolveDefaultAccountCode(companyId, 'ACCOUNTS_PAYABLE');
    
    // Credit (reverse) lines for each item
    for (const item of items) {
      lines.push({
        account_code: item.is_inventory ? inventoryCode : purchaseExpenseCode,
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
        account_code: vatInputCode,
        description: 'Reversal: VAT Input',
        description_ar: 'عكس: ضريبة القيمة المضافة',
        debit_amount: 0,
        credit_amount: taxAmount,
        vendor_id: vendorId
      });
    }
    
    // Debit (reverse) Accounts Payable
    lines.push({
      account_code: apCode,
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
    
    // Resolve account codes from default_accounts table
    const inventoryCode = await resolveDefaultAccountCode(companyId, 'INVENTORY');
    const vatInputCode = await resolveDefaultAccountCode(companyId, 'VAT_INPUT');
    const apCode = await resolveDefaultAccountCode(companyId, 'ACCOUNTS_PAYABLE');
    const purchaseReturnsCode = FALLBACK_ACCOUNTS.PURCHASE_RETURNS;
    
    // Debit Accounts Payable (reduce what we owe)
    lines.push({
      account_code: apCode,
      description: `Return to ${vendorName}`,
      description_ar: `مرتجع إلى ${vendorName}`,
      debit_amount: totalAmount,
      credit_amount: 0,
      vendor_id: vendorId
    });
    
    // Credit lines for each item
    for (const item of items) {
      lines.push({
        account_code: item.is_inventory ? inventoryCode : purchaseReturnsCode,
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
        account_code: vatInputCode,
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
    
    // Resolve account codes from default_accounts table
    const freightCode = await resolveDefaultAccountCode(companyId, 'FREIGHT_IN');
    const customsCode = await resolveDefaultAccountCode(companyId, 'CUSTOMS_EXPENSE');
    const insuranceCode = FALLBACK_ACCOUNTS.INSURANCE_EXPENSE;
    const apCode = await resolveDefaultAccountCode(companyId, 'ACCOUNTS_PAYABLE');
    
    // Freight expense
    if (costs.freight && costs.freight > 0) {
      lines.push({
        account_code: freightCode,
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
        account_code: customsCode,
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
        account_code: insuranceCode,
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
        account_code: apCode,
        description: `AP - ${vendorName}`,
        description_ar: `ذمم دائنة - ${vendorName}`,
        debit_amount: 0,
        credit_amount: totalCost,
        vendor_id: vendorId || undefined
      });
    } else {
      // Resolve cash account from default_accounts
      const cashCode = await resolveDefaultAccountCode(companyId, 'INVENTORY');
      // Use the actual cash account from defaults
      const cashResult = await pool.query(
        `SELECT a.code FROM default_accounts da 
         JOIN accounts a ON da.account_id = a.id 
         WHERE da.company_id = $1 AND da.account_key = 'CASH' AND da.is_active = true`,
        [companyId]
      );
      const resolvedCashCode = cashResult.rows[0]?.code || '1000';
      lines.push({
        account_code: resolvedCashCode,
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
        (SELECT json_agg(jl ORDER BY jl.line_number)
         FROM journal_lines jl 
         WHERE jl.journal_entry_id = je.id) as lines
       FROM journal_entries je
       WHERE je.source_document_type = $1 AND je.source_document_id = $2
       ORDER BY je.created_at DESC`,
      [referenceType, referenceId]
    );
    return result.rows;
  }
  
  /**
   * Reverse a journal entry via the Financial Posting Engine.
   * Never deletes — only creates a contra entry.
   */
  static async reverseEntry(
    originalEntryId: number,
    createdBy: number,
    reason: string,
    _client?: any
  ): Promise<number> {
    // Get original entry to find company
    const entryResult = await pool.query(
      `SELECT company_id FROM journal_entries WHERE id = $1`,
      [originalEntryId]
    );
    
    if (entryResult.rows.length === 0) {
      throw new Error('Original journal entry not found');
    }
    
    const result = await financialPostingEngine.reverse({
      journalEntryId: originalEntryId,
      companyId: entryResult.rows[0].company_id,
      userId: createdBy,
      reason
    });

    if (!result.success || !result.journalEntryId) {
      throw new Error(result.message || 'Failed to reverse journal entry');
    }

    logger.info(`Reversed journal entry ${originalEntryId} -> ${result.entryNumber}`);
    return result.journalEntryId;
  }
}

export default JournalEntryService;
