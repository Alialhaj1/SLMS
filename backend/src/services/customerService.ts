/**
 * 👥 CUSTOMER SERVICE
 * ====================
 * Customer management with credit control
 * 
 * Features:
 * ✅ Customer CRUD
 * ✅ Credit limit management
 * ✅ Credit blocking/unblocking
 * ✅ Payment history tracking
 */

import pool from '../db';
import { logger } from '../utils/logger';

export interface Customer {
  id: number;
  company_id: number;
  code: string;
  name: string;
  name_ar?: string;
  legal_name?: string;
  customer_type_id?: number;
  category_id?: number;
  status_id?: number;
  email?: string;
  phone?: string;
  mobile?: string;
  credit_limit: number;
  current_balance: number;
  available_credit: number;
  credit_rating?: string;
  is_active: boolean;
}

export interface CreditCheckResult {
  can_proceed: boolean;
  customer_id: number;
  customer_name: string;
  credit_limit: number;
  current_balance: number;
  available_credit: number;
  requested_amount: number;
  new_balance: number;
  over_limit: boolean;
  over_limit_amount: number;
  warnings: string[];
  requires_approval: boolean;
  is_blocked: boolean;
  block_reason?: string;
}

export interface CustomerCreditUpdate {
  customer_id: number;
  change_type: 'limit_increase' | 'limit_decrease' | 'credit_hold' | 'credit_release' | 'rating_change';
  previous_limit?: number;
  new_limit?: number;
  previous_rating?: string;
  new_rating?: string;
  reason: string;
  updated_by: number;
}

/**
 * Customer Service
 */
export class CustomerService {
  
  /**
   * Check if customer can transact (credit + status check)
   */
  static async checkCreditAvailability(
    customerId: number,
    companyId: number,
    requestedAmount: number
  ): Promise<CreditCheckResult> {
    // Get customer with status
    const result = await pool.query(`
      SELECT 
        c.*,
        cs.allows_sales_orders,
        cs.allows_invoicing,
        cs.allows_credit,
        cs.is_blocked,
        cc.is_credit_blocked,
        cc.credit_block_reason
      FROM customers c
      LEFT JOIN customer_statuses cs ON c.status_id = cs.id
      LEFT JOIN customer_compliance cc ON c.id = cc.customer_id AND cc.company_id = c.company_id
      WHERE c.id = $1 AND c.company_id = $2 AND c.deleted_at IS NULL
    `, [customerId, companyId]);
    
    if (result.rows.length === 0) {
      throw new Error(`Customer ${customerId} not found`);
    }
    
    const customer = result.rows[0];
    const warnings: string[] = [];
    let canProceed = true;
    let requiresApproval = false;
    
    // Check if blocked
    if (customer.is_blocked || customer.is_credit_blocked) {
      canProceed = false;
      return {
        can_proceed: false,
        customer_id: customerId,
        customer_name: customer.name,
        credit_limit: customer.credit_limit || 0,
        current_balance: customer.current_balance || 0,
        available_credit: customer.available_credit || 0,
        requested_amount: requestedAmount,
        new_balance: (customer.current_balance || 0) + requestedAmount,
        over_limit: false,
        over_limit_amount: 0,
        warnings: [],
        requires_approval: false,
        is_blocked: true,
        block_reason: customer.credit_block_reason || 'Customer is blocked'
      };
    }
    
    // Calculate new balance
    const currentBalance = customer.current_balance || 0;
    const creditLimit = customer.credit_limit || 0;
    const newBalance = currentBalance + requestedAmount;
    const overLimitAmount = Math.max(0, newBalance - creditLimit);
    const overLimit = creditLimit > 0 && newBalance > creditLimit;
    
    // Get sales settings for tolerance
    const settingsResult = await pool.query(
      'SELECT * FROM sales_settings WHERE company_id = $1',
      [companyId]
    );
    const settings = settingsResult.rows[0] || {};
    const tolerance = settings.credit_tolerance_percent || 10;
    const toleranceLimit = creditLimit * (1 + tolerance / 100);
    
    if (overLimit) {
      if (newBalance > toleranceLimit) {
        // Exceeds tolerance - action depends on settings
        if (settings.credit_block_action === 'block') {
          canProceed = false;
          warnings.push(`Credit limit exceeded by ${overLimitAmount.toFixed(2)}. Transaction blocked.`);
        } else {
          requiresApproval = true;
          warnings.push(`Credit limit exceeded by ${overLimitAmount.toFixed(2)}. Requires approval.`);
        }
      } else {
        // Within tolerance - warn only
        warnings.push(`Credit limit will be exceeded by ${overLimitAmount.toFixed(2)} (within ${tolerance}% tolerance)`);
      }
    }
    
    // Warn if approaching limit
    if (!overLimit && creditLimit > 0 && newBalance >= creditLimit * 0.9) {
      warnings.push(`Customer approaching credit limit (${((newBalance / creditLimit) * 100).toFixed(0)}% used)`);
    }
    
    // Check credit rating
    if (customer.credit_rating === 'D' || customer.credit_rating === 'F') {
      warnings.push(`Customer has low credit rating: ${customer.credit_rating}`);
      requiresApproval = true;
    }
    
    return {
      can_proceed: canProceed,
      customer_id: customerId,
      customer_name: customer.name,
      credit_limit: creditLimit,
      current_balance: currentBalance,
      available_credit: customer.available_credit || 0,
      requested_amount: requestedAmount,
      new_balance: newBalance,
      over_limit: overLimit,
      over_limit_amount: overLimitAmount,
      warnings,
      requires_approval: requiresApproval,
      is_blocked: false
    };
  }
  
  /**
   * Update customer balance (after invoice/payment)
   */
  static async updateBalance(
    customerId: number,
    companyId: number,
    amount: number, // Positive for invoice, negative for payment
    transactionType: string,
    referenceNumber: string
  ): Promise<void> {
    await pool.query(`
      UPDATE customers 
      SET current_balance = current_balance + $1,
          updated_at = NOW()
      WHERE id = $2 AND company_id = $3
    `, [amount, customerId, companyId]);
    
    logger.info(`Customer balance updated`, { 
      customerId, 
      amount, 
      transactionType, 
      referenceNumber 
    });
  }
  
  /**
   * Update credit limit with history
   */
  static async updateCreditLimit(
    customerId: number,
    companyId: number,
    newLimit: number,
    reason: string,
    updatedBy: number
  ): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get current limit
      const current = await client.query(
        'SELECT credit_limit FROM customers WHERE id = $1 AND company_id = $2',
        [customerId, companyId]
      );
      const previousLimit = current.rows[0]?.credit_limit || 0;
      
      // Update customer
      await client.query(`
        UPDATE customers 
        SET credit_limit = $1, updated_at = NOW(), updated_by = $2
        WHERE id = $3 AND company_id = $4
      `, [newLimit, updatedBy, customerId, companyId]);
      
      // Record history
      await client.query(`
        INSERT INTO customer_credit_history (
          customer_id, change_type, previous_limit, new_limit, reason,
          approved_by, approved_at, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $6)
      `, [
        customerId,
        newLimit > previousLimit ? 'limit_increase' : 'limit_decrease',
        previousLimit,
        newLimit,
        reason,
        updatedBy
      ]);
      
      await client.query('COMMIT');
      
      logger.info('Customer credit limit updated', { 
        customerId, 
        previousLimit, 
        newLimit, 
        updatedBy 
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Block/unblock customer credit
   */
  static async setCreditBlock(
    customerId: number,
    companyId: number,
    blocked: boolean,
    reason: string,
    blockedBy: number
  ): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get or create compliance record
      const existing = await client.query(
        'SELECT id FROM customer_compliance WHERE customer_id = $1 AND company_id = $2',
        [customerId, companyId]
      );
      
      if (existing.rows.length === 0) {
        await client.query(`
          INSERT INTO customer_compliance (customer_id, company_id, is_credit_blocked, credit_block_reason, credit_blocked_at, credit_blocked_by)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [customerId, companyId, blocked, blocked ? reason : null, blocked ? new Date() : null, blocked ? blockedBy : null]);
      } else {
        await client.query(`
          UPDATE customer_compliance 
          SET is_credit_blocked = $1,
              credit_block_reason = $2,
              credit_blocked_at = $3,
              credit_blocked_by = $4,
              updated_at = NOW()
          WHERE customer_id = $5 AND company_id = $6
        `, [blocked, blocked ? reason : null, blocked ? new Date() : null, blocked ? blockedBy : null, customerId, companyId]);
      }
      
      // Record in history
      await client.query(`
        INSERT INTO customer_credit_history (
          customer_id, change_type, reason, approved_by, approved_at, created_by
        ) VALUES ($1, $2, $3, $4, NOW(), $4)
      `, [customerId, blocked ? 'credit_hold' : 'credit_release', reason, blockedBy]);
      
      await client.query('COMMIT');
      
      logger.warn(`Customer credit ${blocked ? 'blocked' : 'unblocked'}`, { 
        customerId, 
        reason, 
        blockedBy 
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Get customers requiring credit review
   */
  static async getCustomersForCreditReview(companyId: number): Promise<any[]> {
    const result = await pool.query(`
      SELECT 
        c.*,
        cs.name as status_name,
        cc.risk_level,
        cc.last_review_date,
        cc.next_review_date,
        cc.late_payment_count
      FROM customers c
      LEFT JOIN customer_statuses cs ON c.status_id = cs.id
      LEFT JOIN customer_compliance cc ON c.id = cc.customer_id AND cc.company_id = c.company_id
      WHERE c.company_id = $1 
        AND c.deleted_at IS NULL
        AND c.is_active = true
        AND (
          -- Over credit limit
          (c.credit_limit > 0 AND c.current_balance >= c.credit_limit)
          -- Review due
          OR (cc.next_review_date IS NOT NULL AND cc.next_review_date <= CURRENT_DATE)
          -- High risk
          OR cc.risk_level IN ('high', 'critical')
          -- Many late payments
          OR cc.late_payment_count >= 3
        )
      ORDER BY 
        CASE cc.risk_level 
          WHEN 'critical' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          ELSE 4 
        END,
        (c.current_balance - c.credit_limit) DESC
    `, [companyId]);
    
    return result.rows;
  }
  
  /**
   * Get customer aging summary
   */
  static async getCustomerAging(customerId: number, companyId: number): Promise<any> {
    // This would query unpaid invoices grouped by age buckets
    // Placeholder for now - actual implementation depends on invoice structure
    const result = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE due_date >= CURRENT_DATE) as current_count,
        COALESCE(SUM(balance_due) FILTER (WHERE due_date >= CURRENT_DATE), 0) as current_amount,
        COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND due_date >= CURRENT_DATE - 30) as days_1_30_count,
        COALESCE(SUM(balance_due) FILTER (WHERE due_date < CURRENT_DATE AND due_date >= CURRENT_DATE - 30), 0) as days_1_30_amount,
        COUNT(*) FILTER (WHERE due_date < CURRENT_DATE - 30 AND due_date >= CURRENT_DATE - 60) as days_31_60_count,
        COALESCE(SUM(balance_due) FILTER (WHERE due_date < CURRENT_DATE - 30 AND due_date >= CURRENT_DATE - 60), 0) as days_31_60_amount,
        COUNT(*) FILTER (WHERE due_date < CURRENT_DATE - 60 AND due_date >= CURRENT_DATE - 90) as days_61_90_count,
        COALESCE(SUM(balance_due) FILTER (WHERE due_date < CURRENT_DATE - 60 AND due_date >= CURRENT_DATE - 90), 0) as days_61_90_amount,
        COUNT(*) FILTER (WHERE due_date < CURRENT_DATE - 90) as over_90_count,
        COALESCE(SUM(balance_due) FILTER (WHERE due_date < CURRENT_DATE - 90), 0) as over_90_amount
      FROM sales_invoices
      WHERE customer_id = $1 AND company_id = $2 
        AND status NOT IN ('paid', 'cancelled', 'void')
        AND deleted_at IS NULL
    `, [customerId, companyId]);
    
    return result.rows[0] || {
      current_count: 0, current_amount: 0,
      days_1_30_count: 0, days_1_30_amount: 0,
      days_31_60_count: 0, days_31_60_amount: 0,
      days_61_90_count: 0, days_61_90_amount: 0,
      over_90_count: 0, over_90_amount: 0
    };
  }
}

export default CustomerService;
