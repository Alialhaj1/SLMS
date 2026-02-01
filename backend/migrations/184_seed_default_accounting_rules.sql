-- =============================================
-- Migration: 184_seed_default_accounting_rules.sql
-- Description: Seed default accounting rules for expense requests
-- Created: 2026-01-21
-- =============================================

-- =============================================
-- 1. Create default accounts if needed (for fallback)
-- =============================================

-- Ensure we have accrued liabilities account (for default expense rule)
DO $$
DECLARE
    v_company_id INT;
    v_accrued_liabilities_id INT;
    v_general_expenses_id INT;
BEGIN
    -- For each company that has accounts
    FOR v_company_id IN 
        SELECT DISTINCT company_id FROM accounts WHERE company_id IS NOT NULL LIMIT 10
    LOOP
        -- Check for Accrued Liabilities account (usually 2100 range)
        SELECT id INTO v_accrued_liabilities_id
        FROM accounts
        WHERE company_id = v_company_id 
          AND (code LIKE '21%' OR name_ar LIKE '%مستحق%' OR name ILIKE '%accrued%' OR name ILIKE '%payable%')
          AND is_active = TRUE
          AND deleted_at IS NULL
        LIMIT 1;

        -- Check for General Expenses account
        SELECT id INTO v_general_expenses_id
        FROM accounts
        WHERE company_id = v_company_id 
          AND (code LIKE '5%' OR code LIKE '6%' OR name_ar LIKE '%مصروف%' OR name ILIKE '%expense%')
          AND is_active = TRUE
          AND deleted_at IS NULL
        LIMIT 1;

        -- Create default expense approval rule if doesn't exist
        IF v_accrued_liabilities_id IS NOT NULL OR v_general_expenses_id IS NOT NULL THEN
            INSERT INTO accounting_rules (
                company_id, code, name, name_ar, description,
                trigger_code, is_active, is_system, priority,
                auto_post, require_approval,
                created_at
            ) VALUES (
                v_company_id,
                'EXP_APPROVED_DEFAULT',
                'Expense Request Approval - Default',
                'اعتماد طلب المصروف - افتراضي',
                'Automatically records expense liability when expense request is approved',
                'expense_request_approved',
                FALSE, -- Disabled by default, admin should enable after review
                TRUE,  -- System rule
                100,
                FALSE, -- Preview first, don't auto-post
                TRUE,
                NOW()
            )
            ON CONFLICT (company_id, code) DO NOTHING;

            -- Get the rule ID
            IF FOUND THEN
                -- Add rule lines
                -- Debit: Expense Account (from expense type or fallback)
                INSERT INTO accounting_rule_lines (
                    rule_id, line_type, sequence,
                    account_source, fallback_account_id,
                    amount_source,
                    cost_center_source, project_source, shipment_source,
                    description_template
                )
                SELECT 
                    r.id, 'debit', 1,
                    'from_expense_type', v_general_expenses_id,
                    'full_amount',
                    'from_entity', 'from_entity', 'from_entity',
                    'Expense: {expense_type} - {vendor_name}'
                FROM accounting_rules r
                WHERE r.company_id = v_company_id AND r.code = 'EXP_APPROVED_DEFAULT'
                  AND NOT EXISTS (
                      SELECT 1 FROM accounting_rule_lines rl WHERE rl.rule_id = r.id AND rl.line_type = 'debit'
                  );

                -- Credit: Accrued Liabilities
                INSERT INTO accounting_rule_lines (
                    rule_id, line_type, sequence,
                    account_source, account_id,
                    amount_source,
                    cost_center_source, project_source, shipment_source,
                    description_template
                )
                SELECT 
                    r.id, 'credit', 2,
                    'fixed', v_accrued_liabilities_id,
                    'full_amount',
                    'from_entity', 'from_entity', 'from_entity',
                    'Accrued Liability: {expense_type} - {vendor_name}'
                FROM accounting_rules r
                WHERE r.company_id = v_company_id AND r.code = 'EXP_APPROVED_DEFAULT'
                  AND v_accrued_liabilities_id IS NOT NULL
                  AND NOT EXISTS (
                      SELECT 1 FROM accounting_rule_lines rl WHERE rl.rule_id = r.id AND rl.line_type = 'credit'
                  );
            END IF;
        END IF;
    END LOOP;
END $$;

-- =============================================
-- 2. Add sample rule for payment request approved
-- =============================================
DO $$
DECLARE
    v_company_id INT;
    v_bank_clearing_id INT;
    v_ap_account_id INT;
BEGIN
    FOR v_company_id IN 
        SELECT DISTINCT company_id FROM accounts WHERE company_id IS NOT NULL LIMIT 10
    LOOP
        -- Check for Bank Clearing or AP account
        SELECT id INTO v_ap_account_id
        FROM accounts
        WHERE company_id = v_company_id 
          AND (code LIKE '21%' OR name_ar LIKE '%مورد%' OR name_ar LIKE '%دائن%' OR name ILIKE '%payable%')
          AND is_active = TRUE
          AND deleted_at IS NULL
        LIMIT 1;

        SELECT id INTO v_bank_clearing_id
        FROM accounts
        WHERE company_id = v_company_id 
          AND (code LIKE '10%' OR code LIKE '11%' OR name_ar LIKE '%بنك%' OR name ILIKE '%bank%' OR name ILIKE '%cash%')
          AND is_active = TRUE
          AND deleted_at IS NULL
        LIMIT 1;

        IF v_ap_account_id IS NOT NULL AND v_bank_clearing_id IS NOT NULL THEN
            INSERT INTO accounting_rules (
                company_id, code, name, name_ar, description,
                trigger_code, is_active, is_system, priority,
                auto_post, require_approval,
                created_at
            ) VALUES (
                v_company_id,
                'PAY_REQ_PAID_DEFAULT',
                'Payment Request Paid - Default',
                'دفع طلب التحويل - افتراضي',
                'Records payment when payment request is marked as paid',
                'payment_request_paid',
                FALSE, -- Disabled by default
                TRUE,
                100,
                FALSE,
                TRUE,
                NOW()
            )
            ON CONFLICT (company_id, code) DO NOTHING;

            -- Add rule lines if rule was created
            IF FOUND THEN
                -- Debit: Accounts Payable (clear the liability)
                INSERT INTO accounting_rule_lines (
                    rule_id, line_type, sequence,
                    account_source, fallback_account_id,
                    amount_source,
                    cost_center_source, project_source, shipment_source,
                    description_template
                )
                SELECT 
                    r.id, 'debit', 1,
                    'from_vendor', v_ap_account_id,
                    'full_amount',
                    'from_entity', 'from_entity', 'none',
                    'Payment to: {vendor_name}'
                FROM accounting_rules r
                WHERE r.company_id = v_company_id AND r.code = 'PAY_REQ_PAID_DEFAULT'
                  AND NOT EXISTS (
                      SELECT 1 FROM accounting_rule_lines rl WHERE rl.rule_id = r.id AND rl.line_type = 'debit'
                  );

                -- Credit: Bank Account
                INSERT INTO accounting_rule_lines (
                    rule_id, line_type, sequence,
                    account_source, fallback_account_id,
                    amount_source,
                    cost_center_source, project_source, shipment_source,
                    description_template
                )
                SELECT 
                    r.id, 'credit', 2,
                    'from_bank', v_bank_clearing_id,
                    'full_amount',
                    'none', 'from_entity', 'none',
                    'Bank Payment: {vendor_name}'
                FROM accounting_rules r
                WHERE r.company_id = v_company_id AND r.code = 'PAY_REQ_PAID_DEFAULT'
                  AND NOT EXISTS (
                      SELECT 1 FROM accounting_rule_lines rl WHERE rl.rule_id = r.id AND rl.line_type = 'credit'
                  );
            END IF;
        END IF;
    END LOOP;
END $$;

-- =============================================
-- 3. Update expense_types to link default accounts
-- =============================================
-- This helps the rule engine find accounts automatically
DO $$
DECLARE
    v_company_id INT;
    v_expense_account_id INT;
    v_payable_account_id INT;
BEGIN
    FOR v_company_id IN 
        SELECT DISTINCT company_id FROM expense_types WHERE company_id IS NOT NULL AND deleted_at IS NULL
    LOOP
        -- Find a general expense account for this company
        SELECT id INTO v_expense_account_id
        FROM accounts
        WHERE company_id = v_company_id 
          AND (code LIKE '5%' OR code LIKE '6%')
          AND is_active = TRUE
          AND deleted_at IS NULL
        LIMIT 1;

        -- Find a payable account
        SELECT id INTO v_payable_account_id
        FROM accounts
        WHERE company_id = v_company_id 
          AND code LIKE '21%'
          AND is_active = TRUE
          AND deleted_at IS NULL
        LIMIT 1;

        -- Update expense_types that don't have accounts linked
        IF v_expense_account_id IS NOT NULL THEN
            UPDATE expense_types
            SET expense_account_id = v_expense_account_id
            WHERE company_id = v_company_id 
              AND expense_account_id IS NULL
              AND deleted_at IS NULL;
        END IF;

        IF v_payable_account_id IS NOT NULL THEN
            UPDATE expense_types
            SET payable_account_id = v_payable_account_id
            WHERE company_id = v_company_id 
              AND payable_account_id IS NULL
              AND deleted_at IS NULL;
        END IF;
    END LOOP;
END $$;

-- =============================================
-- Log success
-- =============================================
DO $$ 
BEGIN 
    RAISE NOTICE 'Migration 184: Default accounting rules seeded successfully';
END $$;
