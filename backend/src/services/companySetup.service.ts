/**
 * Company Setup Service
 * Auto-provisions default Chart of Accounts, fiscal year, tax settings, etc.
 * when a new company is created.
 */
import pool from '../db';
import { logger } from '../utils/logger';

interface SetupResult {
  success: boolean;
  accounts_created: number;
  errors: string[];
}

interface LedgerResult {
  accountId: number | null;
}

/**
 * Setup default company configuration after creation.
 * Creates Chart of Accounts skeleton, default fiscal year, tax config, etc.
 */
export async function setupCompanyDefaults(
  companyId: number,
  tenantId: number | null,
  userId: number,
  currency: string,
  companyName: string
): Promise<SetupResult> {
  const errors: string[] = [];
  let accountsCreated = 0;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if accounts already exist for this company
    const existing = await client.query(
      'SELECT COUNT(*) FROM chart_of_accounts WHERE company_id = $1',
      [companyId]
    );

    if (parseInt(existing.rows[0].count) > 0) {
      await client.query('COMMIT');
      return { success: true, accounts_created: 0, errors: ['Accounts already exist'] };
    }

    // Create default top-level account groups
    const defaultAccounts = [
      { code: '1000', name: 'Assets', name_ar: 'الأصول', type: 'asset', is_group: true },
      { code: '1100', name: 'Current Assets', name_ar: 'الأصول المتداولة', type: 'asset', is_group: true, parent_code: '1000' },
      { code: '1200', name: 'Fixed Assets', name_ar: 'الأصول الثابتة', type: 'asset', is_group: true, parent_code: '1000' },
      { code: '2000', name: 'Liabilities', name_ar: 'الالتزامات', type: 'liability', is_group: true },
      { code: '2100', name: 'Current Liabilities', name_ar: 'الالتزامات المتداولة', type: 'liability', is_group: true, parent_code: '2000' },
      { code: '2200', name: 'Long-term Liabilities', name_ar: 'الالتزامات طويلة الأجل', type: 'liability', is_group: true, parent_code: '2000' },
      { code: '3000', name: 'Equity', name_ar: 'حقوق الملكية', type: 'equity', is_group: true },
      { code: '4000', name: 'Revenue', name_ar: 'الإيرادات', type: 'revenue', is_group: true },
      { code: '5000', name: 'Expenses', name_ar: 'المصروفات', type: 'expense', is_group: true },
      // Common sub-accounts
      { code: '1101', name: 'Cash', name_ar: 'النقدية', type: 'asset', parent_code: '1100' },
      { code: '1102', name: 'Bank Accounts', name_ar: 'الحسابات البنكية', type: 'asset', parent_code: '1100' },
      { code: '1103', name: 'Accounts Receivable', name_ar: 'الذمم المدينة', type: 'asset', parent_code: '1100' },
      { code: '1104', name: 'Inventory', name_ar: 'المخزون', type: 'asset', parent_code: '1100' },
      { code: '2101', name: 'Accounts Payable', name_ar: 'الذمم الدائنة', type: 'liability', parent_code: '2100' },
      { code: '2102', name: 'VAT Payable', name_ar: 'ضريبة القيمة المضافة', type: 'liability', parent_code: '2100' },
      { code: '4001', name: 'Sales Revenue', name_ar: 'إيرادات المبيعات', type: 'revenue', parent_code: '4000' },
      { code: '4002', name: 'Service Revenue', name_ar: 'إيرادات الخدمات', type: 'revenue', parent_code: '4000' },
      { code: '5001', name: 'Cost of Goods Sold', name_ar: 'تكلفة البضاعة المباعة', type: 'expense', parent_code: '5000' },
      { code: '5002', name: 'Shipping Expenses', name_ar: 'مصاريف الشحن', type: 'expense', parent_code: '5000' },
      { code: '5003', name: 'Customs Duties', name_ar: 'الرسوم الجمركية', type: 'expense', parent_code: '5000' },
      { code: '5004', name: 'General & Admin', name_ar: 'المصاريف العمومية والإدارية', type: 'expense', parent_code: '5000' },
    ];

    for (const acct of defaultAccounts) {
      try {
        let parentId = null;
        if ((acct as any).parent_code) {
          const parentResult = await client.query(
            'SELECT id FROM chart_of_accounts WHERE company_id = $1 AND code = $2',
            [companyId, (acct as any).parent_code]
          );
          parentId = parentResult.rows[0]?.id || null;
        }

        await client.query(
          `INSERT INTO chart_of_accounts (company_id, code, name, name_ar, account_type, is_group, parent_id, is_active, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8)
           ON CONFLICT (company_id, code) DO NOTHING`,
          [companyId, acct.code, acct.name, acct.name_ar, acct.type, acct.is_group || false, parentId, userId]
        );
        accountsCreated++;
      } catch (err: any) {
        errors.push(`Failed to create account ${acct.code}: ${err.message}`);
      }
    }

    await client.query('COMMIT');
    logger.info(`Company ${companyId} setup complete: ${accountsCreated} accounts created`);
    return { success: errors.length === 0, accounts_created: accountsCreated, errors };
  } catch (error: any) {
    await client.query('ROLLBACK');
    logger.error(`Company setup failed for ${companyId}:`, error);
    return { success: false, accounts_created: 0, errors: [error.message] };
  } finally {
    client.release();
  }
}

/**
 * Auto-create an AP sub-ledger account for a vendor.
 */
export async function createVendorLedgerAccount(
  companyId: number,
  tenantId: number | null,
  vendorId: number,
  vendorCode: string,
  vendorName: string,
  vendorNameAr: string | null,
  isExternal: boolean,
  userId: number
): Promise<LedgerResult> {
  try {
    // Find the AP parent account (2101)
    const parentResult = await pool.query(
      `SELECT id FROM chart_of_accounts WHERE company_id = $1 AND code = '2101' AND deleted_at IS NULL`,
      [companyId]
    );

    const parentId = parentResult.rows[0]?.id || null;
    const accountCode = `2101-${vendorCode}`;
    const accountName = `AP - ${vendorName}`;
    const accountNameAr = vendorNameAr ? `ذمم دائنة - ${vendorNameAr}` : accountName;

    const result = await pool.query(
      `INSERT INTO chart_of_accounts (company_id, code, name, name_ar, account_type, is_group, parent_id, is_active, is_sub_ledger, sub_ledger_type, sub_ledger_id, created_by)
       VALUES ($1, $2, $3, $4, 'liability', false, $5, true, true, 'vendor', $6, $7)
       ON CONFLICT (company_id, code) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [companyId, accountCode, accountName, accountNameAr, parentId, vendorId, userId]
    );

    return { accountId: result.rows[0]?.id || null };
  } catch (error: any) {
    logger.warn(`Failed to create vendor ledger account for vendor ${vendorId}:`, error.message);
    return { accountId: null };
  }
}
