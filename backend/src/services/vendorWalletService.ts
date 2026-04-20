/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  VENDOR WALLET & COMMISSION SERVICE                                       ║
 * ║  Handles: commission calculation, wallet credits, payouts, settlements   ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import pool from '../db';

// ════════════════════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════════════════════

export interface WalletSummary {
  vendorId: number;
  availableBalance: number;
  pendingBalance: number;
  totalEarned: number;
  totalWithdrawn: number;
  totalCommission: number;
}

export interface TransactionFilters {
  vendorId: number;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

// ════════════════════════════════════════════════════════════════════════════
// Record sale commission (called after payment confirmed)
// ════════════════════════════════════════════════════════════════════════════

export async function recordSaleCommission(
  vendorId: number,
  subOrderId: number,
  marketplaceOrderId: number,
  saleAmount: number,
  commissionAmount: number
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get or verify wallet
    const walletResult = await client.query(
      'SELECT * FROM vendor_wallets WHERE vendor_id = $1 FOR UPDATE',
      [vendorId]
    );

    if (walletResult.rows.length === 0) {
      // Auto-create wallet
      await client.query('INSERT INTO vendor_wallets (vendor_id) VALUES ($1)', [vendorId]);
    }

    const vendorPayout = saleAmount - commissionAmount;

    // Credit vendor (pending — will move to available after hold period)
    await client.query(`
      UPDATE vendor_wallets
      SET pending_balance = pending_balance + $1,
          total_earned = total_earned + $1,
          total_commission = total_commission + $2,
          updated_at = NOW()
      WHERE vendor_id = $3
    `, [vendorPayout, commissionAmount, vendorId]);

    // Get updated balance
    const updatedWallet = await client.query(
      'SELECT available_balance + pending_balance as total FROM vendor_wallets WHERE vendor_id = $1',
      [vendorId]
    );
    const balanceAfter = parseFloat(updatedWallet.rows[0]?.total || 0);

    // Record sale transaction
    const wallet = await client.query('SELECT id FROM vendor_wallets WHERE vendor_id = $1', [vendorId]);
    await client.query(`
      INSERT INTO vendor_transactions (
        vendor_id, wallet_id, transaction_type,
        amount, balance_after,
        marketplace_order_id, order_vendor_id,
        description, description_ar
      ) VALUES ($1, $2, 'sale', $3, $4, $5, $6, $7, $8)
    `, [
      vendorId, wallet.rows[0].id, vendorPayout, balanceAfter,
      marketplaceOrderId, subOrderId,
      `Sale earnings from order`,
      `أرباح من الطلب`,
    ]);

    // Record commission transaction (negative — deducted)
    await client.query(`
      INSERT INTO vendor_transactions (
        vendor_id, wallet_id, transaction_type,
        amount, balance_after,
        marketplace_order_id, order_vendor_id,
        description, description_ar
      ) VALUES ($1, $2, 'commission', $3, $4, $5, $6, $7, $8)
    `, [
      vendorId, wallet.rows[0].id,
      -commissionAmount, balanceAfter,
      marketplaceOrderId, subOrderId,
      `Platform commission`,
      `عمولة المنصة`,
    ]);

    // Update vendor metrics
    await client.query(`
      UPDATE marketplace_vendors
      SET total_orders = total_orders + 1,
          total_revenue = total_revenue + $1,
          updated_at = NOW()
      WHERE id = $2
    `, [vendorPayout, vendorId]);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ════════════════════════════════════════════════════════════════════════════
// Move pending to available (after hold period — called by scheduler)
// ════════════════════════════════════════════════════════════════════════════

export async function processSettlementEligibility(): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Find sub-orders past the hold period
    const eligible = await client.query(`
      SELECT mov.id, mov.vendor_id, mov.vendor_payout, mov.marketplace_order_id
      FROM marketplace_order_vendors mov
      WHERE mov.settlement_status = 'eligible'
        AND mov.settlement_eligible_at <= NOW()
        AND mov.status = 'delivered'
    `);

    let processed = 0;

    for (const row of eligible.rows) {
      // Move from pending to available
      await client.query(`
        UPDATE vendor_wallets
        SET available_balance = available_balance + $1,
            pending_balance = GREATEST(pending_balance - $1, 0),
            updated_at = NOW()
        WHERE vendor_id = $2
      `, [parseFloat(row.vendor_payout), row.vendor_id]);

      // Update settlement status
      await client.query(`
        UPDATE marketplace_order_vendors
        SET settlement_status = 'settled', settled_at = NOW()
        WHERE id = $1
      `, [row.id]);

      processed++;
    }

    await client.query('COMMIT');
    return processed;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ════════════════════════════════════════════════════════════════════════════
// Handle refund (reverse commission)
// ════════════════════════════════════════════════════════════════════════════

export async function processRefund(
  vendorId: number,
  subOrderId: number,
  marketplaceOrderId: number,
  refundAmount: number,
  commissionRefund: number
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Debit vendor wallet
    await client.query(`
      UPDATE vendor_wallets
      SET available_balance = available_balance - $1,
          total_earned = total_earned - $1,
          total_commission = total_commission - $2,
          updated_at = NOW()
      WHERE vendor_id = $3
    `, [refundAmount - commissionRefund, commissionRefund, vendorId]);

    const wallet = await client.query(
      'SELECT id, available_balance + pending_balance as total FROM vendor_wallets WHERE vendor_id = $1',
      [vendorId]
    );

    await client.query(`
      INSERT INTO vendor_transactions (
        vendor_id, wallet_id, transaction_type,
        amount, balance_after,
        marketplace_order_id, order_vendor_id,
        description, description_ar
      ) VALUES ($1, $2, 'refund', $3, $4, $5, $6, $7, $8)
    `, [
      vendorId, wallet.rows[0].id,
      -(refundAmount - commissionRefund),
      parseFloat(wallet.rows[0].total),
      marketplaceOrderId, subOrderId,
      `Refund deduction`,
      `خصم استرداد`,
    ]);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ════════════════════════════════════════════════════════════════════════════
// Request payout (vendor action)
// ════════════════════════════════════════════════════════════════════════════

export async function requestPayout(vendorId: number, amount?: number): Promise<any> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const wallet = await client.query(
      'SELECT * FROM vendor_wallets WHERE vendor_id = $1 FOR UPDATE',
      [vendorId]
    );
    if (wallet.rows.length === 0) throw new Error('Wallet not found');

    const available = parseFloat(wallet.rows[0].available_balance);
    const config = await client.query('SELECT settlement_min_amount FROM marketplace_config WHERE id = 1');
    const minAmount = parseFloat(config.rows[0]?.settlement_min_amount || 100);

    const payoutAmount = amount || available;
    if (payoutAmount > available) throw new Error('Insufficient balance');
    if (payoutAmount < minAmount) throw new Error(`Minimum payout amount is ${minAmount}`);

    // Get vendor bank details
    const vendor = await client.query(
      'SELECT bank_name, bank_iban, bank_account_name FROM marketplace_vendors WHERE id = $1',
      [vendorId]
    );
    if (!vendor.rows[0]?.bank_iban) throw new Error('Bank details not set');

    // Generate payout number
    const seqResult = await client.query(`
      INSERT INTO marketplace_sequences (seq_type, prefix, next_value)
      VALUES ('payout', 'PAY', 2)
      ON CONFLICT (seq_type)
      DO UPDATE SET next_value = marketplace_sequences.next_value + 1
      RETURNING next_value - 1 as current_value, prefix
    `);

    // Create payout record
    const payout = await client.query(`
      INSERT INTO vendor_payouts (
        vendor_id, amount,
        bank_name, bank_iban, bank_account_name,
        status, period_from, period_to
      ) VALUES ($1, $2, $3, $4, $5, 'pending', NOW() - INTERVAL '30 days', NOW())
      RETURNING *
    `, [
      vendorId, payoutAmount,
      vendor.rows[0].bank_name, vendor.rows[0].bank_iban, vendor.rows[0].bank_account_name,
    ]);

    // Deduct from available balance
    await client.query(`
      UPDATE vendor_wallets
      SET available_balance = available_balance - $1,
          total_withdrawn = total_withdrawn + $1,
          updated_at = NOW()
      WHERE vendor_id = $2
    `, [payoutAmount, vendorId]);

    // Record transaction
    const updatedWallet = await client.query(
      'SELECT id, available_balance + pending_balance as total FROM vendor_wallets WHERE vendor_id = $1',
      [vendorId]
    );

    await client.query(`
      INSERT INTO vendor_transactions (
        vendor_id, wallet_id, transaction_type,
        amount, balance_after, payout_id,
        description, description_ar
      ) VALUES ($1, $2, 'payout', $3, $4, $5, $6, $7)
    `, [
      vendorId, updatedWallet.rows[0].id,
      -payoutAmount, parseFloat(updatedWallet.rows[0].total),
      payout.rows[0].id,
      `Payout request`,
      `طلب سحب`,
    ]);

    await client.query('COMMIT');
    return payout.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ════════════════════════════════════════════════════════════════════════════
// Process payout (admin action — marks as completed)
// ════════════════════════════════════════════════════════════════════════════

export async function processPayout(
  payoutId: number,
  userId: number,
  paymentReference: string
): Promise<any> {
  const result = await pool.query(`
    UPDATE vendor_payouts
    SET status = 'completed',
        processed_at = NOW(),
        processed_by = $1,
        payment_reference = $2,
        updated_at = NOW()
    WHERE id = $3 AND status = 'pending'
    RETURNING *
  `, [userId, paymentReference, payoutId]);

  if (result.rows.length === 0) throw new Error('Payout not found or already processed');
  return result.rows[0];
}

// ════════════════════════════════════════════════════════════════════════════
// Get wallet summary
// ════════════════════════════════════════════════════════════════════════════

export async function getWalletSummary(vendorId: number): Promise<WalletSummary> {
  const result = await pool.query(
    'SELECT * FROM vendor_wallets WHERE vendor_id = $1',
    [vendorId]
  );

  if (result.rows.length === 0) {
    return {
      vendorId,
      availableBalance: 0,
      pendingBalance: 0,
      totalEarned: 0,
      totalWithdrawn: 0,
      totalCommission: 0,
    };
  }

  const w = result.rows[0];
  return {
    vendorId,
    availableBalance: parseFloat(w.available_balance),
    pendingBalance: parseFloat(w.pending_balance),
    totalEarned: parseFloat(w.total_earned),
    totalWithdrawn: parseFloat(w.total_withdrawn),
    totalCommission: parseFloat(w.total_commission),
  };
}

// ════════════════════════════════════════════════════════════════════════════
// Get transaction history
// ════════════════════════════════════════════════════════════════════════════

export async function getTransactions(filters: TransactionFilters): Promise<{
  transactions: any[];
  total: number;
}> {
  const page = filters.page || 1;
  const limit = Math.min(filters.limit || 20, 100);
  const offset = (page - 1) * limit;

  const conditions = ['vt.vendor_id = $1'];
  const params: any[] = [filters.vendorId];
  let paramIndex = 2;

  if (filters.type) {
    conditions.push(`vt.transaction_type = $${paramIndex++}`);
    params.push(filters.type);
  }
  if (filters.dateFrom) {
    conditions.push(`vt.created_at >= $${paramIndex++}`);
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    conditions.push(`vt.created_at <= $${paramIndex++}`);
    params.push(filters.dateTo);
  }

  const whereClause = conditions.join(' AND ');

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM vendor_transactions vt WHERE ${whereClause}`,
    params
  );

  const result = await pool.query(`
    SELECT vt.*,
           mo.order_number
    FROM vendor_transactions vt
    LEFT JOIN marketplace_orders mo ON mo.id = vt.marketplace_order_id
    WHERE ${whereClause}
    ORDER BY vt.created_at DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}
  `, [...params, limit, offset]);

  return {
    transactions: result.rows,
    total: parseInt(countResult.rows[0].count, 10),
  };
}

// ════════════════════════════════════════════════════════════════════════════
// List payouts
// ════════════════════════════════════════════════════════════════════════════

export async function listPayouts(
  vendorId?: number,
  status?: string,
  page: number = 1,
  limit: number = 20
): Promise<{ payouts: any[]; total: number }> {
  const offset = (page - 1) * limit;
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (vendorId) {
    conditions.push(`vp.vendor_id = $${paramIndex++}`);
    params.push(vendorId);
  }
  if (status) {
    conditions.push(`vp.status = $${paramIndex++}`);
    params.push(status);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM vendor_payouts vp ${whereClause}`,
    params
  );

  const result = await pool.query(`
    SELECT vp.*, mv.vendor_name, mv.vendor_name_ar, mv.slug as vendor_slug
    FROM vendor_payouts vp
    JOIN marketplace_vendors mv ON mv.id = vp.vendor_id
    ${whereClause}
    ORDER BY vp.created_at DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}
  `, [...params, limit, offset]);

  return {
    payouts: result.rows,
    total: parseInt(countResult.rows[0].count, 10),
  };
}

export default {
  recordSaleCommission,
  processSettlementEligibility,
  processRefund,
  requestPayout,
  processPayout,
  getWalletSummary,
  getTransactions,
  listPayouts,
};
