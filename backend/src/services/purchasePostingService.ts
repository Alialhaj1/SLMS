/**
 * Purchase Posting Service
 * Handles automatic journal entry generation for purchase transactions
 * 
 * Business Rules:
 * 1. Purchase Invoice posting creates:
 *    DR: Inventory/Expense Account
 *    CR: Vendor Payable Account
 * 
 * 2. Payment posting creates:
 *    DR: Vendor Payable Account
 *    CR: Cash/Bank Account
 * 
 * 3. Purchase Return posting creates:
 *    DR: Vendor Payable Account
 *    CR: Inventory Account
 */

import pool from '../db';
import { PoolClient } from 'pg';

interface PurchaseInvoicePostingData {
  invoiceId: number;
  companyId: number;
  vendorId: number;
  warehouseId?: number;
  currencyId: number;
  exchangeRate: number;
  totalAmount: number;
  taxAmount?: number;
  discountAmount?: number;
  userId: number;
  description?: string;
}

interface PaymentPostingData {
  paymentId: number;
  companyId: number;
  vendorId: number;
  amount: number;
  currencyId: number;
  exchangeRate: number;
  cashAccountId: number;
  userId: number;
  description?: string;
}

interface PurchaseReturnPostingData {
  returnId: number;
  companyId: number;
  vendorId: number;
  warehouseId?: number;
  totalAmount: number;
  currencyId: number;
  exchangeRate: number;
  userId: number;
  description?: string;
}

interface JournalEntryLine {
  accountId: number;
  debit: number;
  credit: number;
  description?: string;
  costCenterId?: number;
  vendorId?: number;
  customerId?: number;
  referenceType?: string;
  referenceId?: number;
}

/**
 * Post purchase invoice to general ledger
 */
export async function postPurchaseInvoice(
  data: PurchaseInvoicePostingData,
  client?: PoolClient
): Promise<{ journalEntryId: number; entryNumber: string }> {
  const conn = client || await pool.connect();
  const shouldRelease = !client;

  try {
    if (!client) await conn.query('BEGIN');

    // Get vendor payable account
    const vendorResult = await conn.query(
      'SELECT payable_account_id, name FROM vendors WHERE id = $1 AND company_id = $2',
      [data.vendorId, data.companyId]
    );

    if (vendorResult.rows.length === 0) {
      throw new Error('Vendor not found or payable account not set');
    }

    const payableAccountId = vendorResult.rows[0].payable_account_id;
    if (!payableAccountId) {
      throw new Error(`Vendor ${vendorResult.rows[0].name} does not have a payable account configured`);
    }

    // Get inventory or expense account from invoice items
    const itemsResult = await conn.query(
      `SELECT 
        pii.item_id, 
        pii.quantity, 
        pii.unit_price, 
        pii.total_amount,
        i.inventory_account_id,
        i.expense_account_id,
        i.is_inventory_item
      FROM purchase_invoice_items pii
      LEFT JOIN items i ON pii.item_id = i.id
      WHERE pii.purchase_invoice_id = $1`,
      [data.invoiceId]
    );

    if (itemsResult.rows.length === 0) {
      throw new Error('Purchase invoice has no items');
    }

    // Get next journal entry number
    const numberResult = await conn.query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(entry_number FROM '[0-9]+') AS INTEGER)), 0) + 1 as next_num
       FROM journal_entries 
       WHERE company_id = $1 AND entry_number ~ '^JE-[0-9]+'`,
      [data.companyId]
    );
    const entryNumber = `JE-${numberResult.rows[0].next_num.toString().padStart(6, '0')}`;

    // Create journal entry header
    const jeResult = await conn.query(
      `INSERT INTO journal_entries (
        company_id, entry_number, entry_date, entry_type, 
        reference_type, reference_id, description, 
        currency_id, exchange_rate, total_debit, total_credit,
        status, created_by, created_at
      ) VALUES ($1, $2, CURRENT_DATE, 'purchase_invoice', 'purchase_invoice', $3, $4, $5, $6, $7, $7, 'posted', $8, NOW())
      RETURNING id`,
      [
        data.companyId,
        entryNumber,
        data.invoiceId,
        data.description || `Purchase Invoice #${data.invoiceId}`,
        data.currencyId,
        data.exchangeRate,
        data.totalAmount,
        data.userId
      ]
    );

    const journalEntryId = jeResult.rows[0].id;

    // Prepare journal entry lines
    const lines: JournalEntryLine[] = [];

    // Group items by account (inventory vs expense)
    const accountGroups = new Map<number, number>();
    
    for (const item of itemsResult.rows) {
      const accountId = item.is_inventory_item 
        ? item.inventory_account_id 
        : item.expense_account_id;
      
      if (!accountId) {
        throw new Error(`Item ${item.item_id} does not have inventory/expense account configured`);
      }

      const currentAmount = accountGroups.get(accountId) || 0;
      accountGroups.set(accountId, currentAmount + parseFloat(item.total_amount));
    }

    // DR: Inventory/Expense accounts
    for (const [accountId, amount] of accountGroups) {
      lines.push({
        accountId,
        debit: amount,
        credit: 0,
        description: data.description || 'Purchase Invoice',
        referenceType: 'purchase_invoice',
        referenceId: data.invoiceId,
        vendorId: data.vendorId
      });
    }

    // CR: Vendor Payable Account
    lines.push({
      accountId: payableAccountId,
      debit: 0,
      credit: data.totalAmount,
      description: data.description || 'Purchase Invoice',
      referenceType: 'purchase_invoice',
      referenceId: data.invoiceId,
      vendorId: data.vendorId
    });

    // Insert journal entry lines
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      await conn.query(
        `INSERT INTO journal_entry_lines (
          journal_entry_id, line_number, account_id, 
          debit, credit, description, 
          cost_center_id, vendor_id, customer_id,
          reference_type, reference_id,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
        [
          journalEntryId,
          i + 1,
          line.accountId,
          line.debit,
          line.credit,
          line.description,
          line.costCenterId || null,
          line.vendorId || null,
          line.customerId || null,
          line.referenceType || null,
          line.referenceId || null
        ]
      );
    }

    // Update purchase invoice with journal entry reference
    await conn.query(
      'UPDATE purchase_invoices SET journal_entry_id = $1, status = $2, posted_at = NOW() WHERE id = $3',
      [journalEntryId, 'posted', data.invoiceId]
    );

    // Update vendor balance
    await conn.query(
      `INSERT INTO vendor_balance_transactions (
        vendor_id, company_id, transaction_date, transaction_type,
        reference_type, reference_id, debit, credit, balance, description, created_by
      ) 
      SELECT 
        $1, $2, CURRENT_DATE, 'purchase_invoice', 'purchase_invoice', $3, 
        0, $4, 
        COALESCE((SELECT balance FROM vendor_balance_transactions WHERE vendor_id = $1 AND company_id = $2 ORDER BY id DESC LIMIT 1), 0) + $4,
        $5, $6`,
      [data.vendorId, data.companyId, data.invoiceId, data.totalAmount, data.description || 'Purchase Invoice', data.userId]
    );

    if (!client) await conn.query('COMMIT');

    return { journalEntryId, entryNumber };
  } catch (error) {
    if (!client) await conn.query('ROLLBACK');
    throw error;
  } finally {
    if (shouldRelease) conn.release();
  }
}

/**
 * Post payment to vendor to general ledger
 */
export async function postVendorPayment(
  data: PaymentPostingData,
  client?: PoolClient
): Promise<{ journalEntryId: number; entryNumber: string }> {
  const conn = client || await pool.connect();
  const shouldRelease = !client;

  try {
    if (!client) await conn.query('BEGIN');

    // Get vendor payable account
    const vendorResult = await conn.query(
      'SELECT payable_account_id FROM vendors WHERE id = $1 AND company_id = $2',
      [data.vendorId, data.companyId]
    );

    if (vendorResult.rows.length === 0 || !vendorResult.rows[0].payable_account_id) {
      throw new Error('Vendor payable account not found');
    }

    const payableAccountId = vendorResult.rows[0].payable_account_id;

    // Get next journal entry number
    const numberResult = await conn.query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(entry_number FROM '[0-9]+') AS INTEGER)), 0) + 1 as next_num
       FROM journal_entries 
       WHERE company_id = $1 AND entry_number ~ '^JE-[0-9]+'`,
      [data.companyId]
    );
    const entryNumber = `JE-${numberResult.rows[0].next_num.toString().padStart(6, '0')}`;

    // Create journal entry
    const jeResult = await conn.query(
      `INSERT INTO journal_entries (
        company_id, entry_number, entry_date, entry_type,
        reference_type, reference_id, description,
        currency_id, exchange_rate, total_debit, total_credit,
        status, created_by, created_at
      ) VALUES ($1, $2, CURRENT_DATE, 'payment', 'payment_voucher', $3, $4, $5, $6, $7, $7, 'posted', $8, NOW())
      RETURNING id`,
      [
        data.companyId,
        entryNumber,
        data.paymentId,
        data.description || `Vendor Payment #${data.paymentId}`,
        data.currencyId,
        data.exchangeRate,
        data.amount,
        data.userId
      ]
    );

    const journalEntryId = jeResult.rows[0].id;

    // DR: Vendor Payable Account (reduce liability)
    await conn.query(
      `INSERT INTO journal_entry_lines (
        journal_entry_id, line_number, account_id, debit, credit,
        description, vendor_id, reference_type, reference_id, created_at
      ) VALUES ($1, 1, $2, $3, 0, $4, $5, 'payment_voucher', $6, NOW())`,
      [journalEntryId, payableAccountId, data.amount, data.description, data.vendorId, data.paymentId]
    );

    // CR: Cash/Bank Account
    await conn.query(
      `INSERT INTO journal_entry_lines (
        journal_entry_id, line_number, account_id, debit, credit,
        description, vendor_id, reference_type, reference_id, created_at
      ) VALUES ($1, 2, $2, 0, $3, $4, $5, 'payment_voucher', $6, NOW())`,
      [journalEntryId, data.cashAccountId, data.amount, data.description, data.vendorId, data.paymentId]
    );

    // Update payment voucher
    await conn.query(
      'UPDATE payment_vouchers SET journal_entry_id = $1, status = $2, posted_at = NOW() WHERE id = $3',
      [journalEntryId, 'posted', data.paymentId]
    );

    // Update vendor balance (reduce balance)
    await conn.query(
      `INSERT INTO vendor_balance_transactions (
        vendor_id, company_id, transaction_date, transaction_type,
        reference_type, reference_id, debit, credit, balance, description, created_by
      )
      SELECT 
        $1, $2, CURRENT_DATE, 'payment', 'payment_voucher', $3,
        $4, 0,
        COALESCE((SELECT balance FROM vendor_balance_transactions WHERE vendor_id = $1 AND company_id = $2 ORDER BY id DESC LIMIT 1), 0) - $4,
        $5, $6`,
      [data.vendorId, data.companyId, data.paymentId, data.amount, data.description || 'Vendor Payment', data.userId]
    );

    if (!client) await conn.query('COMMIT');

    return { journalEntryId, entryNumber };
  } catch (error) {
    if (!client) await conn.query('ROLLBACK');
    throw error;
  } finally {
    if (shouldRelease) conn.release();
  }
}

/**
 * Post purchase return to general ledger
 */
export async function postPurchaseReturn(
  data: PurchaseReturnPostingData,
  client?: PoolClient
): Promise<{ journalEntryId: number; entryNumber: string }> {
  const conn = client || await pool.connect();
  const shouldRelease = !client;

  try {
    if (!client) await conn.query('BEGIN');

    // Get vendor payable account
    const vendorResult = await conn.query(
      'SELECT payable_account_id FROM vendors WHERE id = $1 AND company_id = $2',
      [data.vendorId, data.companyId]
    );

    if (vendorResult.rows.length === 0 || !vendorResult.rows[0].payable_account_id) {
      throw new Error('Vendor payable account not found');
    }

    const payableAccountId = vendorResult.rows[0].payable_account_id;

    // Get return items and their inventory accounts
    const itemsResult = await conn.query(
      `SELECT 
        pri.item_id, 
        pri.quantity, 
        pri.unit_price, 
        pri.total_amount,
        i.inventory_account_id
      FROM purchase_return_items pri
      LEFT JOIN items i ON pri.item_id = i.id
      WHERE pri.purchase_return_id = $1`,
      [data.returnId]
    );

    if (itemsResult.rows.length === 0) {
      throw new Error('Purchase return has no items');
    }

    // Get next journal entry number
    const numberResult = await conn.query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(entry_number FROM '[0-9]+') AS INTEGER)), 0) + 1 as next_num
       FROM journal_entries 
       WHERE company_id = $1 AND entry_number ~ '^JE-[0-9]+'`,
      [data.companyId]
    );
    const entryNumber = `JE-${numberResult.rows[0].next_num.toString().padStart(6, '0')}`;

    // Create journal entry
    const jeResult = await conn.query(
      `INSERT INTO journal_entries (
        company_id, entry_number, entry_date, entry_type,
        reference_type, reference_id, description,
        currency_id, exchange_rate, total_debit, total_credit,
        status, created_by, created_at
      ) VALUES ($1, $2, CURRENT_DATE, 'purchase_return', 'purchase_return', $3, $4, $5, $6, $7, $7, 'posted', $8, NOW())
      RETURNING id`,
      [
        data.companyId,
        entryNumber,
        data.returnId,
        data.description || `Purchase Return #${data.returnId}`,
        data.currencyId,
        data.exchangeRate,
        data.totalAmount,
        data.userId
      ]
    );

    const journalEntryId = jeResult.rows[0].id;

    // Group items by inventory account
    const accountGroups = new Map<number, number>();
    for (const item of itemsResult.rows) {
      if (!item.inventory_account_id) {
        throw new Error(`Item ${item.item_id} does not have inventory account configured`);
      }
      const currentAmount = accountGroups.get(item.inventory_account_id) || 0;
      accountGroups.set(item.inventory_account_id, currentAmount + parseFloat(item.total_amount));
    }

    let lineNumber = 1;

    // DR: Vendor Payable Account (reduce liability)
    await conn.query(
      `INSERT INTO journal_entry_lines (
        journal_entry_id, line_number, account_id, debit, credit,
        description, vendor_id, reference_type, reference_id, created_at
      ) VALUES ($1, $2, $3, $4, 0, $5, $6, 'purchase_return', $7, NOW())`,
      [journalEntryId, lineNumber++, payableAccountId, data.totalAmount, data.description, data.vendorId, data.returnId]
    );

    // CR: Inventory accounts
    for (const [accountId, amount] of accountGroups) {
      await conn.query(
        `INSERT INTO journal_entry_lines (
          journal_entry_id, line_number, account_id, debit, credit,
          description, vendor_id, reference_type, reference_id, created_at
        ) VALUES ($1, $2, $3, 0, $4, $5, $6, 'purchase_return', $7, NOW())`,
        [journalEntryId, lineNumber++, accountId, amount, data.description, data.vendorId, data.returnId]
      );
    }

    // Update purchase return
    await conn.query(
      'UPDATE purchase_returns SET journal_entry_id = $1, status = $2, posted_at = NOW() WHERE id = $3',
      [journalEntryId, 'posted', data.returnId]
    );

    // Update vendor balance (reduce balance)
    await conn.query(
      `INSERT INTO vendor_balance_transactions (
        vendor_id, company_id, transaction_date, transaction_type,
        reference_type, reference_id, debit, credit, balance, description, created_by
      )
      SELECT 
        $1, $2, CURRENT_DATE, 'purchase_return', 'purchase_return', $3,
        $4, 0,
        COALESCE((SELECT balance FROM vendor_balance_transactions WHERE vendor_id = $1 AND company_id = $2 ORDER BY id DESC LIMIT 1), 0) - $4,
        $5, $6`,
      [data.vendorId, data.companyId, data.returnId, data.totalAmount, data.description || 'Purchase Return', data.userId]
    );

    if (!client) await conn.query('COMMIT');

    return { journalEntryId, entryNumber };
  } catch (error) {
    if (!client) await conn.query('ROLLBACK');
    throw error;
  } finally {
    if (shouldRelease) conn.release();
  }
}

/**
 * Check if vendor can be deleted (no open balances or posted transactions)
 */
export async function canDeleteVendor(
  vendorId: number,
  companyId: number
): Promise<{ canDelete: boolean; reason?: string }> {
  const conn = await pool.connect();
  
  try {
    // Check for open balance
    const balanceResult = await conn.query(
      `SELECT balance FROM vendor_balance_transactions 
       WHERE vendor_id = $1 AND company_id = $2 
       ORDER BY id DESC LIMIT 1`,
      [vendorId, companyId]
    );

    if (balanceResult.rows.length > 0 && parseFloat(balanceResult.rows[0].balance) !== 0) {
      return { 
        canDelete: false, 
        reason: `Vendor has open balance: ${balanceResult.rows[0].balance}` 
      };
    }

    // Check for posted invoices
    const invoicesResult = await conn.query(
      `SELECT COUNT(*) as count FROM purchase_invoices 
       WHERE vendor_id = $1 AND company_id = $2 AND status = 'posted' AND deleted_at IS NULL`,
      [vendorId, companyId]
    );

    if (parseInt(invoicesResult.rows[0].count) > 0) {
      return { 
        canDelete: false, 
        reason: `Vendor has ${invoicesResult.rows[0].count} posted purchase invoices` 
      };
    }

    // Check for journal entries
    const jeResult = await conn.query(
      `SELECT COUNT(*) as count FROM journal_entry_lines 
       WHERE vendor_id = $1 AND deleted_at IS NULL`,
      [vendorId]
    );

    if (parseInt(jeResult.rows[0].count) > 0) {
      return { 
        canDelete: false, 
        reason: `Vendor has ${jeResult.rows[0].count} journal entry lines` 
      };
    }

    return { canDelete: true };
  } finally {
    conn.release();
  }
}
