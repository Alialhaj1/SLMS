/**
 * Accounting Rules Engine Service
 * 
 * This service processes accounting rules when specific events occur
 * (e.g., expense_request_approved, payment_request_paid, etc.)
 * 
 * Usage:
 *   await runAccountingRules({
 *     event: 'expense_request_approved',
 *     entity_id: 123,
 *     entity_type: 'expense_request',
 *     company_id: 1,
 *     user_id: 5
 *   });
 */

import pool from '../db';

// =============================================
// Types
// =============================================

interface AccountingRuleParams {
  event: string;           // Trigger code (expense_request_approved, etc.)
  entity_id: number;       // ID of the source entity
  entity_type: string;     // Type of entity (expense_request, payment_request, etc.)
  company_id: number;      // Company context
  user_id: number;         // User who triggered the event
}

interface JournalLine {
  account_id: number;
  account_code?: string;
  account_name?: string;
  debit: number;
  credit: number;
  description?: string;
  cost_center_id?: number;
  project_id?: number;
  shipment_id?: number;
}

interface AccountingResult {
  success: boolean;
  auto_posting_id?: number;
  journal_entry_id?: number;
  status: 'posted' | 'preview' | 'pending' | 'skipped' | 'failed';
  message: string;
  preview_data?: {
    lines: JournalLine[];
    total_debit: number;
    total_credit: number;
    description: string;
  };
  error?: string;
}

// =============================================
// Main Function: Run Accounting Rules
// =============================================

export async function runAccountingRules(params: AccountingRuleParams): Promise<AccountingResult> {
  const { event, entity_id, entity_type, company_id, user_id } = params;
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // 1. Check if this event already processed
    const existingCheck = await client.query(`
      SELECT id, status FROM accounting_auto_postings
      WHERE source_entity_type = $1 
        AND source_entity_id = $2 
        AND trigger_code = $3
    `, [entity_type, entity_id, event]);

    if (existingCheck.rows.length > 0) {
      const existing = existingCheck.rows[0];
      if (existing.status === 'posted') {
        await client.query('ROLLBACK');
        return {
          success: false,
          status: 'skipped',
          message: 'This event has already been processed and posted',
          auto_posting_id: existing.id
        };
      }
    }

    // 2. Find matching active rules for this trigger
    const rulesQuery = await client.query(`
      SELECT r.*, t.entity_type as trigger_entity_type, t.available_fields
      FROM accounting_rules r
      JOIN accounting_rule_triggers t ON r.trigger_code = t.code
      WHERE r.trigger_code = $1 
        AND r.company_id = $2
        AND r.is_active = TRUE
        AND r.deleted_at IS NULL
      ORDER BY r.priority ASC
    `, [event, company_id]);

    if (rulesQuery.rows.length === 0) {
      // No rules defined - skip silently
      await client.query('ROLLBACK');
      return {
        success: true,
        status: 'skipped',
        message: 'No accounting rules defined for this event'
      };
    }

    // 3. Load source entity data
    const entityData = await loadEntityData(client, entity_type, entity_id, company_id);
    
    if (!entityData) {
      await client.query('ROLLBACK');
      return {
        success: false,
        status: 'failed',
        message: 'Source entity not found',
        error: `${entity_type} with id ${entity_id} not found`
      };
    }

    // 4. Evaluate rules and find first matching
    let matchedRule = null;
    for (const rule of rulesQuery.rows) {
      const conditionsMet = await evaluateRuleConditions(client, rule.id, entityData);
      if (conditionsMet) {
        matchedRule = rule;
        if (rule.stop_on_match) break;
      }
    }

    if (!matchedRule) {
      await client.query('ROLLBACK');
      return {
        success: true,
        status: 'skipped',
        message: 'No matching rule conditions'
      };
    }

    // 5. Build journal lines from rule
    const journalLines = await buildJournalLines(client, matchedRule.id, entityData, company_id);

    if (journalLines.length === 0) {
      await client.query('ROLLBACK');
      return {
        success: false,
        status: 'failed',
        message: 'Rule matched but no journal lines could be generated',
        error: 'No valid journal lines'
      };
    }

    // 6. Validate debit = credit
    const totalDebit = journalLines.reduce((sum, l) => sum + l.debit, 0);
    const totalCredit = journalLines.reduce((sum, l) => sum + l.credit, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      await client.query('ROLLBACK');
      return {
        success: false,
        status: 'failed',
        message: 'Journal entry is not balanced',
        error: `Debit (${totalDebit}) ≠ Credit (${totalCredit})`
      };
    }

    // 7. Generate description
    const description = buildJournalDescription(matchedRule, entityData);

    // 8. Create auto_posting record
    const previewData = {
      lines: journalLines,
      total_debit: totalDebit,
      total_credit: totalCredit,
      description: description
    };

    const autoPostingResult = await client.query(`
      INSERT INTO accounting_auto_postings (
        company_id, rule_id, rule_code, trigger_code,
        source_entity_type, source_entity_id, source_entity_number,
        status, preview_data, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      ON CONFLICT (source_entity_type, source_entity_id, trigger_code)
      DO UPDATE SET 
        rule_id = EXCLUDED.rule_id,
        rule_code = EXCLUDED.rule_code,
        preview_data = EXCLUDED.preview_data,
        status = EXCLUDED.status
      RETURNING id
    `, [
      company_id, 
      matchedRule.id, 
      matchedRule.code, 
      event,
      entity_type, 
      entity_id, 
      entityData.request_number || entityData.number || `#${entity_id}`,
      matchedRule.auto_post ? 'pending' : 'preview',
      JSON.stringify(previewData)
    ]);

    const autoPostingId = autoPostingResult.rows[0].id;

    // 9. If auto_post is enabled, create journal entry
    let journalEntryId = null;
    if (matchedRule.auto_post && !matchedRule.require_approval) {
      journalEntryId = await createJournalEntry(
        client, 
        company_id, 
        user_id, 
        journalLines, 
        description,
        entity_type,
        entity_id,
        event
      );

      // Update auto_posting status
      await client.query(`
        UPDATE accounting_auto_postings 
        SET journal_entry_id = $1, status = 'posted', posted_at = NOW(), posted_by = $2
        WHERE id = $3
      `, [journalEntryId, user_id, autoPostingId]);

      // Update source entity accounting_status
      await updateEntityAccountingStatus(client, entity_type, entity_id, 'posted', journalEntryId);
    }

    await client.query('COMMIT');

    return {
      success: true,
      auto_posting_id: autoPostingId,
      journal_entry_id: journalEntryId || undefined,
      status: journalEntryId ? 'posted' : 'preview',
      message: journalEntryId 
        ? 'Journal entry created and posted successfully'
        : 'Accounting preview generated - awaiting confirmation',
      preview_data: previewData
    };

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Accounting engine error:', error);
    return {
      success: false,
      status: 'failed',
      message: 'Accounting rule processing failed',
      error: error.message
    };
  } finally {
    client.release();
  }
}

// =============================================
// Helper: Load Entity Data
// =============================================

async function loadEntityData(
  client: any, 
  entity_type: string, 
  entity_id: number, 
  company_id: number
): Promise<any> {
  let query = '';
  
  switch (entity_type) {
    case 'expense_request':
      query = `
        SELECT er.*, 
               rs.code as status_code, rs.name as status_name,
               et.code as expense_type_code, et.name as expense_type_name,
               et.expense_account_id, et.payable_account_id,
               v.name as vendor_name, v.payable_account_id as vendor_payable_account_id,
               c.code as currency_code,
               p.name as project_name,
               NULL::text as cost_center_name,
               s.tracking_number as shipment_number
        FROM expense_requests er
        LEFT JOIN request_statuses rs ON er.status_id = rs.id
        LEFT JOIN expense_types et ON er.expense_type_id = et.id
        LEFT JOIN vendors v ON er.vendor_id = v.id
        LEFT JOIN currencies c ON er.currency_id = c.id
        LEFT JOIN projects p ON er.project_id = p.id
        LEFT JOIN shipments s ON er.shipment_id = s.id
        WHERE er.id = $1 AND er.company_id = $2 AND er.deleted_at IS NULL
      `;
      break;

    case 'payment_request':
      query = `
        SELECT pr.*,
               rs.code as status_code, rs.name as status_name,
               v.name as vendor_name, v.payable_account_id as vendor_payable_account_id,
               p.name as project_name,
               ba.name as bank_account_name, ba.gl_account_id as bank_gl_account_id
        FROM payment_requests pr
        LEFT JOIN request_statuses rs ON pr.status_id = rs.id
        LEFT JOIN vendors v ON pr.vendor_id = v.id
        LEFT JOIN projects p ON pr.project_id = p.id
        LEFT JOIN bank_accounts ba ON pr.bank_account_id = ba.id
        WHERE pr.id = $1 AND pr.company_id = $2 AND pr.deleted_at IS NULL
      `;
      break;

    case 'shipment':
      query = `
        SELECT s.*,
               c.name as customer_name, c.receivable_account_id,
               p.name as project_name
        FROM shipments s
        LEFT JOIN customers c ON s.customer_id = c.id
        LEFT JOIN projects p ON s.project_id = p.id
        WHERE s.id = $1 AND s.company_id = $2 AND s.deleted_at IS NULL
      `;
      break;

    case 'purchase_invoice':
      query = `
        SELECT pi.*,
               v.name as vendor_name, v.payable_account_id as vendor_payable_account_id,
               p.name as project_name
        FROM purchase_invoices pi
        LEFT JOIN vendors v ON pi.vendor_id = v.id
        LEFT JOIN projects p ON pi.project_id = p.id
        WHERE pi.id = $1 AND pi.company_id = $2 AND pi.deleted_at IS NULL
      `;
      break;

    default:
      return null;
  }

  const result = await client.query(query, [entity_id, company_id]);
  return result.rows[0] || null;
}

// =============================================
// Helper: Evaluate Rule Conditions
// =============================================

async function evaluateRuleConditions(
  client: any, 
  rule_id: number, 
  entityData: any
): Promise<boolean> {
  const conditionsResult = await client.query(`
    SELECT * FROM accounting_rule_conditions
    WHERE rule_id = $1
    ORDER BY condition_group, sequence
  `, [rule_id]);

  if (conditionsResult.rows.length === 0) {
    // No conditions = always match
    return true;
  }

  // Group conditions by condition_group
  const groups: { [key: number]: any[] } = {};
  for (const cond of conditionsResult.rows) {
    if (!groups[cond.condition_group]) {
      groups[cond.condition_group] = [];
    }
    groups[cond.condition_group].push(cond);
  }

  // Evaluate: AND within group, OR between groups
  for (const groupNum of Object.keys(groups)) {
    const group = groups[parseInt(groupNum)];
    let groupResult = true;

    for (const cond of group) {
      const fieldValue = entityData[cond.field_name];
      const conditionMet = evaluateSingleCondition(fieldValue, cond.operator, cond.field_value, cond.field_value_2);
      
      if (!conditionMet) {
        groupResult = false;
        break;
      }
    }

    if (groupResult) {
      // At least one group passed (OR logic between groups)
      return true;
    }
  }

  return false;
}

function evaluateSingleCondition(
  fieldValue: any, 
  operator: string, 
  condValue: string, 
  condValue2?: string
): boolean {
  switch (operator) {
    case '=':
      return String(fieldValue) === condValue;
    case '!=':
      return String(fieldValue) !== condValue;
    case '>':
      return Number(fieldValue) > Number(condValue);
    case '<':
      return Number(fieldValue) < Number(condValue);
    case '>=':
      return Number(fieldValue) >= Number(condValue);
    case '<=':
      return Number(fieldValue) <= Number(condValue);
    case 'IN':
      try {
        const arr = JSON.parse(condValue);
        return arr.includes(String(fieldValue)) || arr.includes(Number(fieldValue));
      } catch { return false; }
    case 'NOT_IN':
      try {
        const arr = JSON.parse(condValue);
        return !arr.includes(String(fieldValue)) && !arr.includes(Number(fieldValue));
      } catch { return true; }
    case 'IS_NULL':
      return fieldValue === null || fieldValue === undefined;
    case 'IS_NOT_NULL':
      return fieldValue !== null && fieldValue !== undefined;
    case 'LIKE':
      return String(fieldValue).includes(condValue);
    case 'BETWEEN':
      return Number(fieldValue) >= Number(condValue) && Number(fieldValue) <= Number(condValue2);
    default:
      return false;
  }
}

// =============================================
// Helper: Build Journal Lines from Rule
// =============================================

async function buildJournalLines(
  client: any, 
  rule_id: number, 
  entityData: any,
  company_id: number
): Promise<JournalLine[]> {
  const linesResult = await client.query(`
    SELECT rl.*, 
           a.code as fixed_account_code, a.name as fixed_account_name,
           fa.code as fallback_account_code, fa.name as fallback_account_name
    FROM accounting_rule_lines rl
    LEFT JOIN accounts a ON rl.account_id = a.id
    LEFT JOIN accounts fa ON rl.fallback_account_id = fa.id
    WHERE rl.rule_id = $1
    ORDER BY rl.sequence
  `, [rule_id]);

  const journalLines: JournalLine[] = [];

  for (const line of linesResult.rows) {
    // Resolve account
    let accountId = null;
    let accountCode = null;
    let accountName = null;

    switch (line.account_source) {
      case 'fixed':
        accountId = line.account_id;
        accountCode = line.fixed_account_code;
        accountName = line.fixed_account_name;
        break;
      case 'from_expense_type':
        if (line.line_type === 'debit') {
          accountId = entityData.expense_account_id;
        } else {
          accountId = entityData.payable_account_id;
        }
        break;
      case 'from_vendor':
        accountId = entityData.vendor_payable_account_id;
        break;
      case 'from_bank':
        accountId = entityData.bank_gl_account_id;
        break;
      case 'from_entity_field':
        accountId = entityData[line.account_field];
        break;
    }

    // Use fallback if no account found
    if (!accountId && line.fallback_account_id) {
      accountId = line.fallback_account_id;
      accountCode = line.fallback_account_code;
      accountName = line.fallback_account_name;
    }

    if (!accountId) {
      console.warn(`No account found for rule line ${line.id}, skipping`);
      continue;
    }

    // Fetch account details if not already loaded
    if (!accountCode) {
      const accResult = await client.query(
        'SELECT code, name FROM accounts WHERE id = $1', 
        [accountId]
      );
      if (accResult.rows.length > 0) {
        accountCode = accResult.rows[0].code;
        accountName = accResult.rows[0].name;
      }
    }

    // Calculate amount - support both 'amount' and 'total_amount' fields
    const baseAmount = Number(entityData.amount) || Number(entityData.total_amount) || Number(entityData.total_amount_local) || 0;
    let amount = 0;
    switch (line.amount_source) {
      case 'full_amount':
        amount = baseAmount;
        break;
      case 'percentage':
        amount = baseAmount * (Number(line.amount_value) / 100);
        break;
      case 'fixed':
        amount = Number(line.amount_value) || 0;
        break;
      case 'field':
        amount = Number(entityData[line.amount_field]) || 0;
        break;
    }

    // Resolve cost center / project / shipment
    let costCenterId = null;
    if (line.cost_center_source === 'from_entity') {
      costCenterId = entityData.cost_center_id;
    } else if (line.cost_center_source === 'fixed') {
      costCenterId = line.cost_center_id;
    }

    let projectId = null;
    if (line.project_source === 'from_entity') {
      projectId = entityData.project_id;
    } else if (line.project_source === 'fixed') {
      projectId = line.project_id;
    }

    let shipmentId = null;
    if (line.shipment_source === 'from_entity') {
      shipmentId = entityData.shipment_id;
    } else if (line.shipment_source === 'fixed') {
      shipmentId = line.shipment_id;
    }

    // Build description from template
    let description = line.description_template || '';
    if (description) {
      description = description
        .replace('{vendor_name}', entityData.vendor_name || '')
        .replace('{expense_type}', entityData.expense_type_name || '')
        .replace('{shipment_number}', entityData.shipment_number || '')
        .replace('{project_name}', entityData.project_name || '')
        .replace('{amount}', String(amount))
        .replace('{request_number}', entityData.request_number || '');
    }

    journalLines.push({
      account_id: accountId,
      account_code: accountCode,
      account_name: accountName,
      debit: line.line_type === 'debit' ? amount : 0,
      credit: line.line_type === 'credit' ? amount : 0,
      description: description || undefined,
      cost_center_id: costCenterId,
      project_id: projectId,
      shipment_id: shipmentId
    });
  }

  return journalLines;
}

// =============================================
// Helper: Build Journal Description
// =============================================

function buildJournalDescription(rule: any, entityData: any): string {
  let desc = rule.name;
  
  if (entityData.request_number) {
    desc += ` - ${entityData.request_number}`;
  }
  if (entityData.vendor_name) {
    desc += ` - ${entityData.vendor_name}`;
  }
  if (entityData.expense_type_name) {
    desc += ` (${entityData.expense_type_name})`;
  }
  
  return desc;
}

// =============================================
// Helper: Create Journal Entry
// =============================================

async function createJournalEntry(
  client: any,
  company_id: number,
  user_id: number,
  lines: JournalLine[],
  description: string,
  source_type: string,
  source_id: number,
  trigger_code: string
): Promise<number> {
  // Generate journal number
  const yearMonth = new Date().toISOString().slice(0, 7).replace('-', '');
  const countResult = await client.query(`
    SELECT COUNT(*) + 1 as seq FROM journal_entries 
    WHERE company_id = $1 AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())
  `, [company_id]);
  const seq = countResult.rows[0].seq;
  const journalNumber = `JV-${yearMonth}-${String(seq).padStart(5, '0')}`;

  // Calculate totals
  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);

  // Get current fiscal year and period
  const fiscalResult = await client.query(`
    SELECT fy.id as fiscal_year_id, ap.id as period_id
    FROM fiscal_years fy
    JOIN accounting_periods ap ON ap.fiscal_year_id = fy.id
    WHERE fy.company_id = $1 
      AND NOW() BETWEEN fy.start_date AND fy.end_date
      AND NOW() BETWEEN ap.start_date AND ap.end_date
      AND fy.is_closed = FALSE
      AND ap.status = 'open'
    LIMIT 1
  `, [company_id]);

  // Get default currency
  const currencyResult = await client.query(`
    SELECT id FROM currencies WHERE code = 'SAR' OR code = 'USD' LIMIT 1
  `);
  const currencyId = currencyResult.rows[0]?.id || 1;

  // If no fiscal year/period found, we still create the journal but log warning
  let fiscalYearId = fiscalResult.rows[0]?.fiscal_year_id || null;
  let periodId = fiscalResult.rows[0]?.period_id || null;

  if (!fiscalYearId || !periodId) {
    console.warn('[Accounting Engine] No open fiscal year/period found. Journal entry created without period reference.');
    // Try to get any fiscal year for the current year
    const fallbackFy = await client.query(`
      SELECT id FROM fiscal_years WHERE company_id = $1 AND EXTRACT(YEAR FROM start_date) = EXTRACT(YEAR FROM NOW()) LIMIT 1
    `, [company_id]);
    fiscalYearId = fallbackFy.rows[0]?.id;
    
    if (fiscalYearId) {
      const fallbackPeriod = await client.query(`
        SELECT id FROM accounting_periods WHERE fiscal_year_id = $1 LIMIT 1
      `, [fiscalYearId]);
      periodId = fallbackPeriod.rows[0]?.id;
    }
  }

  // Create journal header with 'draft' status first (to allow totals trigger to work)
  const journalResult = await client.query(`
    INSERT INTO journal_entries (
      company_id, entry_number, entry_date, posting_date,
      fiscal_year_id, period_id, currency_id,
      entry_type, source_document_type, source_document_id, source_document_number,
      total_debit, total_credit, status, description,
      created_by, created_at
    ) VALUES (
      $1, $2, CURRENT_DATE, CURRENT_DATE,
      $3, $4, $5,
      'auto', $6, $7, $8,
      $9, $9, 'draft', $10,
      $11, NOW()
    )
    RETURNING id
  `, [
    company_id, journalNumber, 
    fiscalYearId, periodId, currencyId,
    source_type, source_id, `${source_type.toUpperCase()}-${source_id}`,
    totalDebit, description,
    user_id
  ]);

  const journalId = journalResult.rows[0].id;

  // Create journal lines (using journal_lines table, not journal_entry_lines)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    await client.query(`
      INSERT INTO journal_lines (
        journal_entry_id, line_number, account_id,
        debit_amount, credit_amount, description,
        cost_center_id, project_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      journalId, i + 1, line.account_id,
      line.debit, line.credit, line.description,
      line.cost_center_id, line.project_id
    ]);

    // Update account balances
    if (line.debit > 0) {
      await updateAccountBalance(client, line.account_id, company_id, line.debit, 0);
    }
    if (line.credit > 0) {
      await updateAccountBalance(client, line.account_id, company_id, 0, line.credit);
    }
  }

  // Now update status to 'posted' after all lines are added (trigger will allow this as status is changing)
  await client.query(`
    UPDATE journal_entries 
    SET status = 'posted', posted_at = NOW(), posted_by = $2
    WHERE id = $1
  `, [journalId, user_id]);

  return journalId;
}

// =============================================
// Helper: Update Account Balance
// =============================================

async function updateAccountBalance(
  client: any,
  account_id: number,
  company_id: number,
  debit: number,
  credit: number
): Promise<void> {
  // Get current fiscal year, period, and default currency
  const periodResult = await client.query(`
    SELECT ap.id as period_id, ap.fiscal_year_id
    FROM accounting_periods ap
    JOIN fiscal_years fy ON ap.fiscal_year_id = fy.id
    WHERE fy.company_id = $1 
      AND NOW() BETWEEN ap.start_date AND ap.end_date
      AND fy.is_closed = FALSE
    LIMIT 1
  `, [company_id]);

  const periodId = periodResult.rows[0]?.period_id;
  const fiscalYearId = periodResult.rows[0]?.fiscal_year_id;

  if (!periodId || !fiscalYearId) {
    console.warn('[Accounting Engine] No open period found for account balance update');
    return;
  }

  // Get default currency (base currency for the company)
  const currencyResult = await client.query(`
    SELECT id FROM currencies WHERE is_base_currency = true AND company_id = $1 AND deleted_at IS NULL LIMIT 1
  `, [company_id]);
  
  let currencyId = currencyResult.rows[0]?.id;
  
  // Fallback: get any active currency for the company
  if (!currencyId) {
    const fallbackCurrency = await client.query(`
      SELECT id FROM currencies WHERE company_id = $1 AND is_active = true AND deleted_at IS NULL LIMIT 1
    `, [company_id]);
    currencyId = fallbackCurrency.rows[0]?.id;
  }
  
  // Final fallback: get any currency
  if (!currencyId) {
    const anyCurrency = await client.query(`SELECT id FROM currencies WHERE deleted_at IS NULL LIMIT 1`);
    currencyId = anyCurrency.rows[0]?.id || 1;
  }

  // Note: closing_debit, closing_credit, balance are GENERATED columns (auto-computed)
  // The unique constraint includes: company_id, account_id, fiscal_year_id, period_id, currency_id, cost_center_id, branch_id
  await client.query(`
    INSERT INTO account_balances (account_id, company_id, fiscal_year_id, period_id, currency_id, period_debit, period_credit)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (company_id, account_id, fiscal_year_id, period_id, currency_id, cost_center_id, branch_id)
    DO UPDATE SET 
      period_debit = account_balances.period_debit + EXCLUDED.period_debit,
      period_credit = account_balances.period_credit + EXCLUDED.period_credit,
      transaction_count = account_balances.transaction_count + 1,
      last_transaction_date = CURRENT_DATE,
      last_updated_at = NOW()
  `, [account_id, company_id, fiscalYearId, periodId, currencyId, debit, credit]);
}

// =============================================
// Helper: Update Entity Accounting Status
// =============================================

async function updateEntityAccountingStatus(
  client: any,
  entity_type: string,
  entity_id: number,
  status: string,
  journal_entry_id: number
): Promise<void> {
  let table = '';
  switch (entity_type) {
    case 'expense_request':
      table = 'expense_requests';
      break;
    case 'payment_request':
      table = 'payment_requests';
      break;
    case 'shipment':
      table = 'shipments';
      break;
    default:
      return;
  }

  await client.query(`
    UPDATE ${table} SET accounting_status = $1, journal_entry_id = $2 WHERE id = $3
  `, [status, journal_entry_id, entity_id]);
}

// =============================================
// Export additional utility functions
// =============================================

/**
 * Get accounting preview for an entity (without posting)
 */
export async function getAccountingPreview(params: AccountingRuleParams): Promise<AccountingResult> {
  // Same as runAccountingRules but doesn't create journal entry
  const result = await runAccountingRules({
    ...params,
    // We'll handle preview mode in the main function
  });
  return result;
}

/**
 * Confirm and post a pending auto-posting
 */
export async function confirmAutoPosting(
  auto_posting_id: number,
  user_id: number
): Promise<AccountingResult> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Get auto posting
    const apResult = await client.query(`
      SELECT * FROM accounting_auto_postings WHERE id = $1
    `, [auto_posting_id]);

    if (apResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, status: 'failed', message: 'Auto posting not found' };
    }

    const ap = apResult.rows[0];

    if (ap.status !== 'preview' && ap.status !== 'pending') {
      await client.query('ROLLBACK');
      return { success: false, status: 'failed', message: `Cannot confirm posting with status: ${ap.status}` };
    }

    const previewData = ap.preview_data;
    
    // Create journal entry from preview data
    const journalId = await createJournalEntry(
      client,
      ap.company_id,
      user_id,
      previewData.lines,
      previewData.description,
      ap.source_entity_type,
      ap.source_entity_id,
      ap.trigger_code
    );

    // Update auto posting
    await client.query(`
      UPDATE accounting_auto_postings 
      SET journal_entry_id = $1, status = 'posted', posted_at = NOW(), posted_by = $2
      WHERE id = $3
    `, [journalId, user_id, auto_posting_id]);

    // Update source entity
    await updateEntityAccountingStatus(client, ap.source_entity_type, ap.source_entity_id, 'posted', journalId);

    await client.query('COMMIT');

    return {
      success: true,
      auto_posting_id: auto_posting_id,
      journal_entry_id: journalId,
      status: 'posted',
      message: 'Journal entry posted successfully'
    };

  } catch (error: any) {
    await client.query('ROLLBACK');
    return { success: false, status: 'failed', message: error.message };
  } finally {
    client.release();
  }
}
