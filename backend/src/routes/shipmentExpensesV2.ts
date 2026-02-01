/**
 * 📦 SHIPMENT EXPENSES V2 API
 * ===========================
 * Enhanced shipment expenses with dynamic fields based on expense type
 * 
 * Endpoints:
 * - GET    /api/shipment-expenses/types                   - Get expense types
 * - GET    /api/shipment-expenses/shipment/:shipmentId    - Get expenses for shipment
 * - GET    /api/shipment-expenses/:id                     - Get single expense
 * - POST   /api/shipment-expenses                         - Create expense
 * - PUT    /api/shipment-expenses/:id                     - Update expense
 * - DELETE /api/shipment-expenses/:id                     - Delete expense
 * - POST   /api/shipment-expenses/:id/approve             - Approve expense
 * - POST   /api/shipment-expenses/:id/post                - Post to accounting
 * - GET    /api/shipment-expenses/summary/:shipmentId     - Get cost summary
 * 
 * Reference Data:
 * - GET    /api/insurance-companies
 * - GET    /api/clearance-offices  
 * - GET    /api/laboratories
 * - GET    /api/shipping-agents
 */

import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requirePermission, requireAnyPermission } from '../middleware/rbac';
import { amountToWordsArabic, amountToWordsEnglish } from '../utils/numberToWords';

const router = Router();

// =====================================================
// GET EXPENSE TYPES
// =====================================================
router.get('/types', authenticate, async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user?.companyId || 1;
    
    // Join with accounts table to get latest account names
    const result = await pool.query(`
      SELECT 
        et.id, et.code, 
        COALESCE(acc.name, et.name) as name, 
        COALESCE(acc.name_ar, et.name_ar) as name_ar, 
        et.category, et.analytic_account_code,
        et.requires_lc, et.requires_insurance_company, et.requires_shipping_agent,
        et.requires_clearance_office, et.requires_laboratory, et.requires_customs_declaration,
        et.requires_port, et.default_vat_rate, et.is_vat_exempt,
        et.required_fields, et.optional_fields, et.display_order,
        acc.id as linked_account_id,
        acc.name as account_name,
        acc.name_ar as account_name_ar
      FROM shipment_expense_types et
      LEFT JOIN accounts acc ON et.analytic_account_code = acc.code AND acc.company_id = et.company_id
      WHERE et.company_id = $1 AND et.is_active = true AND et.deleted_at IS NULL
      ORDER BY et.display_order, et.code
    `, [companyId]);
    
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error('Error fetching expense types:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// =====================================================
// GET PARENT ACCOUNTS FOR EXPENSE SELECTION
// Returns list of parent accounts that can be selected (1151010003, 2111010001, 3221020002)
// =====================================================
router.get('/parent-accounts', authenticate, async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user?.companyId || 1;
    
    // Get the configurable parent accounts for shipment expenses
    const parentCodes = ['1151010003', '2111010001', '3221020002'];
    
    const result = await pool.query(`
      SELECT id, code, name, name_ar, level,
             (SELECT COUNT(*) FROM accounts c WHERE c.parent_id = a.id AND c.deleted_at IS NULL) as children_count
      FROM accounts a
      WHERE company_id = $1 AND code = ANY($2) AND deleted_at IS NULL
      ORDER BY ARRAY_POSITION($2, code)
    `, [companyId, parentCodes]);
    
    // Mark the default account
    const accounts = result.rows.map((acc: any, index: number) => ({
      ...acc,
      is_default: acc.code === '1151010003'
    }));
    
    res.json({ 
      success: true, 
      data: accounts
    });
  } catch (error: any) {
    console.error('Error fetching parent accounts:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// =====================================================
// GET EXPENSE ACCOUNTS FROM CHART OF ACCOUNTS
// Returns child accounts for a given parent account
// =====================================================
router.get('/expense-accounts', authenticate, async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user?.companyId || 1;
    const { parent_code } = req.query;
    
    // Default to 1151010003 if no parent specified
    const parentCode = (parent_code as string) || '1151010003';
    
    // Get the parent account
    const parentResult = await pool.query(`
      SELECT id, code, name, name_ar, level
      FROM accounts
      WHERE company_id = $1 AND code = $2 AND deleted_at IS NULL
    `, [companyId, parentCode]);
    
    if (parentResult.rows.length === 0) {
      return res.json({ 
        success: true, 
        data: { 
          parent: null, 
          children: [],
          message: `Parent account ${parentCode} not found` 
        } 
      });
    }
    
    const parentAccount = parentResult.rows[0];
    
    // Get child accounts with expense type info if linked
    const childrenResult = await pool.query(`
      SELECT 
        a.id, a.code, a.name, a.name_ar, a.level, a.is_active,
        a.is_group, a.allow_posting,
        set.id as expense_type_id,
        set.code as expense_type_code,
        set.name as expense_type_name,
        set.name_ar as expense_type_name_ar,
        set.category as expense_category,
        set.requires_lc, set.requires_insurance_company, set.requires_shipping_agent,
        set.requires_clearance_office, set.requires_laboratory, set.requires_customs_declaration,
        set.requires_port, set.default_vat_rate, set.is_vat_exempt,
        set.required_fields, set.optional_fields
      FROM accounts a
      LEFT JOIN shipment_expense_types set 
        ON set.analytic_account_code = a.code 
        AND set.company_id = a.company_id 
        AND set.deleted_at IS NULL
      WHERE a.company_id = $1 
        AND a.parent_id = $2 
        AND a.deleted_at IS NULL
        AND a.is_active = true
      ORDER BY a.code
    `, [companyId, parentAccount.id]);
    
    res.json({ 
      success: true, 
      data: { 
        parent: parentAccount,
        children: childrenResult.rows
      } 
    });
  } catch (error: any) {
    console.error('Error fetching expense accounts:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// =====================================================
// GET EXPENSES FOR SHIPMENT
// =====================================================
router.get('/shipment/:shipmentId', authenticate, async (req: Request, res: Response) => {
  try {
    const { shipmentId } = req.params;
    const companyId = (req as any).user?.companyId || 1;
    
    // Get shipment info first with extended details for customs declaration
    const shipmentResult = await pool.query(`
      SELECT ls.id, ls.shipment_number, ls.bl_no, ls.lc_number, ls.project_id,
             ls.shipment_type_id, st.code as shipment_type_code, st.name_en as shipment_type_name,
             ls.port_of_discharge_id, pod.name as port_of_discharge_name, pod.name_ar as port_of_discharge_name_ar,
             ls.port_of_loading_id, pol.name as port_of_loading_name,
             pol.country_id as origin_country_id, oc.name as origin_country_name,
             pod.country_id as destination_country_id, dc.name as destination_country_name,
             ls.total_amount as total_value,
             p.code as project_code, p.name as project_name,
             ls.purchase_order_id,
             -- Get PO details if linked
             (SELECT SUM(poi.line_total) 
              FROM purchase_order_items poi 
              WHERE poi.order_id = ls.purchase_order_id) as po_total_value,
             (SELECT po.currency_id FROM purchase_orders po 
              WHERE po.id = ls.purchase_order_id AND po.deleted_at IS NULL LIMIT 1) as po_currency_id,
             (SELECT poc.code FROM purchase_orders po 
              JOIN currencies poc ON po.currency_id = poc.id
              WHERE po.id = ls.purchase_order_id AND po.deleted_at IS NULL LIMIT 1) as po_currency_code,
             (SELECT poc.symbol FROM purchase_orders po 
              JOIN currencies poc ON po.currency_id = poc.id
              WHERE po.id = ls.purchase_order_id AND po.deleted_at IS NULL LIMIT 1) as currency_symbol
      FROM logistics_shipments ls
      LEFT JOIN logistics_shipment_types st ON ls.shipment_type_id = st.id
      LEFT JOIN ports pod ON ls.port_of_discharge_id = pod.id
      LEFT JOIN ports pol ON ls.port_of_loading_id = pol.id
      LEFT JOIN countries oc ON pol.country_id = oc.id
      LEFT JOIN countries dc ON pod.country_id = dc.id
      LEFT JOIN projects p ON ls.project_id = p.id
      WHERE ls.id = $1 AND ls.company_id = $2
    `, [shipmentId, companyId]);
    
    if (shipmentResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'Shipment not found' } });
    }
    
    const shipment = shipmentResult.rows[0];
    
    // Get expenses with account info from Chart of Accounts
    // Use COALESCE to prefer account names over expense type names (user may update account names)
    const result = await pool.query(`
      SELECT 
        se.*,
        COALESCE(acc.name, et.name) as expense_type_name_en,
        COALESCE(acc.name_ar, et.name_ar) as expense_type_name_ar,
        et.category as expense_category,
        et.requires_lc, et.requires_insurance_company, et.requires_shipping_agent,
        et.requires_clearance_office, et.requires_laboratory, et.requires_customs_declaration,
        et.requires_port,
        acc.code as account_code,
        acc.name as account_name,
        acc.name_ar as account_name_ar,
        ic.name as insurance_company_name,
        co.name as clearance_office_name,
        lab.name as laboratory_name,
        sa.name as shipping_agent_name,
        port.name as port_name,
        cur.code as currency_code_display,
        cur.symbol as currency_symbol,
        u_created.full_name as created_by_name,
        u_approved.full_name as approved_by_name,
        -- Get linked expense request ID if exists
        (SELECT er.id FROM expense_requests er WHERE er.source_shipment_expense_id = se.id AND er.deleted_at IS NULL LIMIT 1) as expense_request_id,
        (SELECT er.request_number FROM expense_requests er WHERE er.source_shipment_expense_id = se.id AND er.deleted_at IS NULL LIMIT 1) as expense_request_number
      FROM shipment_expenses se
      JOIN shipment_expense_types et ON se.expense_type_id = et.id
      LEFT JOIN accounts acc ON se.account_id = acc.id
      LEFT JOIN insurance_companies ic ON se.insurance_company_id = ic.id
      LEFT JOIN clearance_offices co ON se.clearance_office_id = co.id
      LEFT JOIN laboratories lab ON se.laboratory_id = lab.id
      LEFT JOIN shipping_agents sa ON se.shipping_agent_id = sa.id
      LEFT JOIN ports port ON se.port_id = port.id
      LEFT JOIN currencies cur ON se.currency_id = cur.id
      LEFT JOIN users u_created ON se.created_by = u_created.id
      LEFT JOIN users u_approved ON se.approved_by = u_approved.id
      WHERE se.shipment_id = $1 AND se.company_id = $2 AND se.deleted_at IS NULL
      ORDER BY se.expense_date DESC, se.id DESC
    `, [shipmentId, companyId]);
    
    // Get cost summary
    const summaryResult = await pool.query(`
      SELECT * FROM shipment_cost_summary WHERE shipment_id = $1
    `, [shipmentId]);
    
    res.json({ 
      success: true, 
      data: {
        shipment,
        expenses: result.rows,
        summary: summaryResult.rows[0] || null
      }
    });
  } catch (error: any) {
    console.error('Error fetching shipment expenses:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// =====================================================
// GET SINGLE EXPENSE
// =====================================================
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = (req as any).user?.companyId || 1;
    
    // Use COALESCE to prefer account names (which user can update) over static expense type names
    const result = await pool.query(`
      SELECT 
        se.*,
        COALESCE(acc.name, et.name) as expense_type_name_en,
        COALESCE(acc.name_ar, et.name_ar) as expense_type_name_ar,
        et.category as expense_category,
        et.required_fields,
        acc.name as account_name,
        acc.name_ar as account_name_ar,
        ic.name as insurance_company_name,
        co.name as clearance_office_name,
        lab.name as laboratory_name,
        sa.name as shipping_agent_name,
        port.name as port_name,
        cur.code as currency_code_display,
        cur.symbol as currency_symbol,
        -- Get linked expense request ID if exists
        (SELECT er.id FROM expense_requests er WHERE er.source_shipment_expense_id = se.id AND er.deleted_at IS NULL LIMIT 1) as expense_request_id,
        (SELECT er.request_number FROM expense_requests er WHERE er.source_shipment_expense_id = se.id AND er.deleted_at IS NULL LIMIT 1) as expense_request_number
      FROM shipment_expenses se
      JOIN shipment_expense_types et ON se.expense_type_id = et.id
      LEFT JOIN accounts acc ON se.account_id = acc.id
      LEFT JOIN insurance_companies ic ON se.insurance_company_id = ic.id
      LEFT JOIN clearance_offices co ON se.clearance_office_id = co.id
      LEFT JOIN laboratories lab ON se.laboratory_id = lab.id
      LEFT JOIN shipping_agents sa ON se.shipping_agent_id = sa.id
      LEFT JOIN ports port ON se.port_id = port.id
      LEFT JOIN currencies cur ON se.currency_id = cur.id
      WHERE se.id = $1 AND se.company_id = $2 AND se.deleted_at IS NULL
    `, [id, companyId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'Expense not found' } });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error fetching expense:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// =====================================================
// CREATE EXPENSE
// =====================================================
router.post('/', authenticate, requirePermission('shipment_expenses:create'), async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const userId = (req as any).user?.id;
    const companyId = (req as any).user?.companyId || 1;
    
    const {
      shipment_id,
      expense_type_id,
      account_id,  // Direct link to Chart of Accounts
      account_code,
      amount_before_vat,
      vat_rate = 15,
      currency_id,
      exchange_rate = 1,
      expense_date,
      distribution_method = 'value',
      
      // Optional linked entities
      lc_id, lc_number, lc_bank_name, lc_total_amount, lc_currency_code,
      insurance_company_id, insurance_policy_number,
      shipping_agent_id, shipping_company_id,
      clearance_office_id,
      laboratory_id, certificate_number,
      port_id,
      
      // Customs declaration
      customs_declaration_id, customs_declaration_number,
      declaration_type, declaration_type_id, declaration_date, has_undertaking, undertaking_details,
      
      // Additional customs declaration fields for expense 8005
      origin_country_id, destination_country_id,
      total_fob_value, freight_value, insurance_value,
      customs_duty, handling_fees, ground_fees, other_charges,
      
      // Transport
      transport_from, transport_to, container_count, goods_description,
      driver_name, receiver_name, workers_count,
      
      // References
      invoice_number, receipt_number, payment_reference,
      entity_name, description, notes
    } = req.body;
    
    // Get expense type details
    const typeResult = await client.query(`
      SELECT code, name, name_ar, analytic_account_code, default_vat_rate, is_vat_exempt
      FROM shipment_expense_types WHERE id = $1
    `, [expense_type_id]);
    
    if (typeResult.rows.length === 0) {
      throw new Error('Invalid expense type');
    }
    
    const expenseType = typeResult.rows[0];
    
    // For expense type 8005 (Customs Declaration), check if one already exists for this shipment
    if (expenseType.code === '8005') {
      // Validate declaration number is required
      if (!customs_declaration_number || customs_declaration_number.trim() === '') {
        throw new Error('رقم البيان الجمركي مطلوب | Customs declaration number is required');
      }
      
      const existingDeclarationResult = await client.query(`
        SELECT id FROM shipment_expenses 
        WHERE shipment_id = $1 AND company_id = $2 AND deleted_at IS NULL
          AND expense_type_id IN (SELECT id FROM shipment_expense_types WHERE code = '8005')
      `, [shipment_id, companyId]);
      
      if (existingDeclarationResult.rows.length > 0) {
        throw new Error('لا يمكن إضافة أكثر من بيان جمركي لنفس الشحنة | Cannot add more than one customs declaration per shipment');
      }
    }
    
    // Get shipment details for BL number and project
    const shipmentResult = await client.query(`
      SELECT bl_no, lc_number, project_id
      FROM logistics_shipments WHERE id = $1
    `, [shipment_id]);
    
    if (shipmentResult.rows.length === 0) {
      throw new Error('Shipment not found');
    }
    
    const shipment = shipmentResult.rows[0];
    
    // Get base currency exchange rate
    const baseCurrencyResult = await client.query(`
      SELECT id, code FROM currencies WHERE is_base_currency = true LIMIT 1
    `, []);
    
    if (baseCurrencyResult.rows.length === 0) {
      throw new Error('Base currency not configured');
    }
    
    const baseCurrency = baseCurrencyResult.rows[0];
    
    // Calculate amounts
    const actualVatRate = expenseType.is_vat_exempt ? 0 : (vat_rate || expenseType.default_vat_rate || 15);
    const vatAmount = Number(amount_before_vat) * (actualVatRate / 100);
    const totalAmount = Number(amount_before_vat) + vatAmount;
    
    // Convert to base currency
    const amountInBaseCurrency = Number(amount_before_vat) * Number(exchange_rate);
    const vatInBaseCurrency = vatAmount * Number(exchange_rate);
    const totalInBaseCurrency = totalAmount * Number(exchange_rate);
    
    // Get currency code
    if (!currency_id) {
      throw new Error('Currency is required');
    }
    
    const currencyResult = await client.query(`SELECT code FROM currencies WHERE id = $1`, [currency_id]);
    
    if (currencyResult.rows.length === 0) {
      throw new Error('Currency not found');
    }
    
    const currencyCode = currencyResult.rows[0].code;
    
    // Generate amount in words (English and Arabic with proper currency)
    const amountInWords = amountToWordsEnglish(totalAmount, currencyCode);
    const amountInWordsAr = amountToWordsArabic(totalAmount, currencyCode);
    
    // =====================================================
    // AUTO-CREATE CUSTOMS DECLARATION FOR EXPENSE TYPE 8005
    // =====================================================
    let autoCreatedDeclarationId = customs_declaration_id;
    let autoCreatedDeclarationNumber = customs_declaration_number;
    
    if (expenseType.code === '8005' && !customs_declaration_id) {
      // Get initial status for customs declaration
      const initialStatusResult = await client.query(`
        SELECT id FROM customs_declaration_statuses WHERE is_initial = true LIMIT 1
      `);
      const initialStatusId = initialStatusResult.rows[0]?.id || 1;
      
      // Use provided declaration type or default to import
      let declTypeId = declaration_type_id;
      if (!declTypeId) {
        const importTypeResult = await client.query(`
          SELECT id FROM customs_declaration_types WHERE direction = 'import' LIMIT 1
        `);
        declTypeId = importTypeResult.rows[0]?.id || 1;
      }
      
      // Generate declaration number if not provided
      let declNumber = customs_declaration_number;
      if (!declNumber) {
        const declarationNumberResult = await client.query(`
          SELECT COALESCE(MAX(CAST(SUBSTRING(declaration_number FROM '[0-9]+$') AS INTEGER)), 0) + 1 as next_num
          FROM customs_declarations
          WHERE company_id = $1 AND declaration_number LIKE 'CD-%'
        `, [companyId]);
        const nextNum = declarationNumberResult.rows[0]?.next_num || 1;
        declNumber = `CD-${new Date().getFullYear()}-${String(nextNum).padStart(4, '0')}`;
      }
      
      // Get PO details to fetch FOB value if not provided
      let fobValue = parseFloat(total_fob_value) || 0;
      let freightVal = parseFloat(freight_value) || 0;
      let insuranceVal = parseFloat(insurance_value) || 0;
      
      // If FOB is 0, try to get from PO
      if (fobValue === 0) {
        const poDetailsResult = await client.query(`
          SELECT 
            ls.purchase_order_id,
            po.total_amount as po_total,
            po.currency_id as po_currency_id,
            ls.port_of_discharge_id,
            po.origin_country_id as po_origin_country_id
          FROM logistics_shipments ls
          LEFT JOIN purchase_orders po ON po.id = ls.purchase_order_id
          WHERE ls.id = $1 AND ls.company_id = $2
        `, [shipment_id, companyId]);
        
        if (poDetailsResult.rows.length > 0 && poDetailsResult.rows[0].po_total) {
          fobValue = parseFloat(poDetailsResult.rows[0].po_total) || 0;
        }
      }
      
      const customsDutyVal = parseFloat(customs_duty) || parseFloat(amount_before_vat) || 0;
      const handlingFeesVal = parseFloat(handling_fees) || 0;
      const groundFeesVal = parseFloat(ground_fees) || 0;
      const otherChargesVal = parseFloat(other_charges) || 0;
      const cifValue = fobValue + freightVal + insuranceVal;
      const totalFeesVal = customsDutyVal + vatAmount + handlingFeesVal + groundFeesVal + otherChargesVal;
      
      // Create customs declaration from expense data
      const createDeclarationResult = await client.query(`
        INSERT INTO customs_declarations (
          company_id, declaration_number, declaration_type_id, status_id,
          declaration_date, shipment_id, project_id,
          bl_number, port_id,
          origin_country_id, destination_country_id,
          currency_id, exchange_rate,
          total_fob_value, freight_value, insurance_value, total_cif_value,
          handling_fees, ground_fees, other_charges,
          total_fees, total_customs_duty, total_vat,
          notes, created_by, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, NOW()
        ) RETURNING id, declaration_number
      `, [
        companyId,
        declNumber,
        declTypeId,
        initialStatusId,
        declaration_date || expense_date || new Date().toISOString().split('T')[0],
        shipment_id,
        shipment.project_id,
        shipment.bl_no,
        port_id && port_id !== '' ? parseInt(port_id) : null,
        origin_country_id && origin_country_id !== '' ? parseInt(origin_country_id) : null,
        destination_country_id && destination_country_id !== '' ? parseInt(destination_country_id) : null,
        currency_id,
        exchange_rate,
        fobValue,
        freightVal,
        insuranceVal,
        cifValue,
        handlingFeesVal,
        groundFeesVal,
        otherChargesVal,
        totalFeesVal,
        customsDutyVal,
        vatAmount,
        notes || `Auto-created from expense for shipment`,
        userId
      ]);
      
      autoCreatedDeclarationId = createDeclarationResult.rows[0].id;
      autoCreatedDeclarationNumber = createDeclarationResult.rows[0].declaration_number;
      
      // Sync items from shipment to customs declaration
      const shipmentItemsResult = await client.query(`
        SELECT 
          lsi.id, lsi.item_id, lsi.quantity, lsi.unit_cost, lsi.uom_id,
          i.code as item_code, i.name as item_name, i.name_ar as item_name_ar,
          i.hs_code,
          COALESCE(ct.duty_rate_percent, 5) as duty_rate,
          COALESCE(ct.duty_rate_percent, 5) = 0 as is_exempt
        FROM logistics_shipment_items lsi
        JOIN items i ON i.id = lsi.item_id
        LEFT JOIN customs_tariffs ct ON ct.hs_code = i.hs_code 
          AND ct.country_code = 'SAU' 
          AND ct.is_active = true 
          AND ct.deleted_at IS NULL
          AND (ct.effective_to IS NULL OR ct.effective_to >= CURRENT_DATE)
        WHERE lsi.shipment_id = $1 AND lsi.company_id = $2 AND lsi.deleted_at IS NULL
        ORDER BY lsi.id
      `, [shipment_id, companyId]);
      
      // Insert items into customs_declaration_items
      let lineNumber = 1;
      for (const item of shipmentItemsResult.rows) {
        const itemFobValue = (item.quantity || 0) * (item.unit_cost || 0);
        const dutyRate = item.is_exempt ? 0 : (item.duty_rate || 5);
        const dutyAmount = itemFobValue * (dutyRate / 100);
        const vatOnItem = (itemFobValue + dutyAmount) * 0.15; // 15% VAT
        
        // hs_code and item_description are NOT NULL columns
        const hsCode = item.hs_code || item.customs_tariff_code || '0000.00.00';
        const itemDesc = item.item_name_ar || item.item_name || 'Item';
        
        await client.query(`
          INSERT INTO customs_declaration_items (
            company_id, declaration_id, line_number, item_id, item_code,
            hs_code, item_description, item_description_ar,
            quantity, unit_id, unit_price, fob_value, cif_value,
            duty_rate, duty_amount, vat_amount, total_fees,
            created_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW()
          )
        `, [
          companyId,
          autoCreatedDeclarationId,
          lineNumber,
          item.item_id,
          item.item_code || '',
          hsCode,
          itemDesc,
          item.item_name_ar || itemDesc,
          item.quantity || 0,
          item.uom_id || null,
          item.unit_cost || 0,
          itemFobValue,
          itemFobValue, // CIF = FOB for now (freight/insurance distributed later)
          dutyRate,
          dutyAmount,
          vatOnItem,
          dutyAmount + vatOnItem
        ]);
        lineNumber++;
      }
      
      console.log(`Auto-created customs declaration ${autoCreatedDeclarationNumber} with ${shipmentItemsResult.rows.length} items for expense type 8005`);
    }
    
    // Insert expense with account_id from Chart of Accounts
    const insertResult = await client.query(`
      INSERT INTO shipment_expenses (
        company_id, shipment_id, project_id,
        expense_type_id, expense_type_code, expense_type_name, analytic_account_code,
        account_id,
        amount_before_vat, vat_rate, vat_amount, total_amount,
        currency_id, currency_code, exchange_rate,
        amount_in_shipment_currency, amount_in_base_currency, vat_in_base_currency, total_in_base_currency,
        bl_number, customs_declaration_id, customs_declaration_number,
        invoice_number, receipt_number, payment_reference,
        distribution_method,
        lc_id, lc_number, lc_bank_name, lc_total_amount, lc_currency_code,
        insurance_company_id, insurance_policy_number,
        shipping_agent_id, shipping_company_id,
        clearance_office_id,
        laboratory_id, certificate_number,
        port_id,
        declaration_type, declaration_date, has_undertaking, undertaking_details,
        transport_from, transport_to, container_count, goods_description,
        driver_name, receiver_name, workers_count,
        entity_name, description, notes,
        amount_in_words, amount_in_words_ar,
        expense_date, approval_status,
        created_by, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
        $31, $32, $33, $34, $35, $36, $37, $38, $39, $40,
        $41, $42, $43, $44, $45, $46, $47, $48, $49, $50,
        $51, $52, $53, $54, $55, $56, 'draft', $57, NOW()
      ) RETURNING *
    `, [
      companyId, shipment_id, shipment.project_id,
      expense_type_id, expenseType.code, expenseType.name, expenseType.analytic_account_code,
      account_id && account_id !== '' ? parseInt(account_id) : null,
      amount_before_vat, actualVatRate, vatAmount, totalAmount,
      currency_id, currencyCode, exchange_rate,
      totalAmount, amountInBaseCurrency, vatInBaseCurrency, totalInBaseCurrency,
      shipment.bl_no, autoCreatedDeclarationId || (customs_declaration_id && customs_declaration_id !== '' ? parseInt(customs_declaration_id) : null), autoCreatedDeclarationNumber || customs_declaration_number || null,
      invoice_number || null, receipt_number || null, payment_reference || null,
      distribution_method || null,
      lc_id && lc_id !== '' ? parseInt(lc_id) : null, lc_number || null, lc_bank_name || null, lc_total_amount || null, lc_currency_code || null,
      insurance_company_id && insurance_company_id !== '' ? parseInt(insurance_company_id) : null, insurance_policy_number || null,
      shipping_agent_id && shipping_agent_id !== '' ? parseInt(shipping_agent_id) : null, shipping_company_id && shipping_company_id !== '' ? parseInt(shipping_company_id) : null,
      clearance_office_id && clearance_office_id !== '' ? parseInt(clearance_office_id) : null,
      laboratory_id && laboratory_id !== '' ? parseInt(laboratory_id) : null, certificate_number || null,
      port_id && port_id !== '' ? parseInt(port_id) : null,
      declaration_type || null, declaration_date || null, has_undertaking || false, undertaking_details || null,
      transport_from || null, transport_to || null, container_count && container_count !== '' ? parseInt(container_count) : null, goods_description || null,
      driver_name || null, receiver_name || null, workers_count && workers_count !== '' ? parseInt(workers_count) : null,
      entity_name || null, description || null, notes || null,
      amountInWords, amountInWordsAr,
      expense_date || new Date().toISOString().split('T')[0],
      userId
    ]);
    
    await client.query('COMMIT');
    
    res.status(201).json({ success: true, data: insertResult.rows[0] });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error creating expense:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  } finally {
    client.release();
  }
});

// =====================================================
// UPDATE EXPENSE
// =====================================================
router.put('/:id', authenticate, requirePermission('shipment_expenses:update'), async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const userId = (req as any).user?.id;
    const companyId = (req as any).user?.companyId || 1;
    
    // Check if expense exists and is not posted
    const existingResult = await client.query(`
      SELECT * FROM shipment_expenses WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
    `, [id, companyId]);
    
    if (existingResult.rows.length === 0) {
      throw new Error('Expense not found');
    }
    
    const existing = existingResult.rows[0];
    
    if (existing.is_posted) {
      throw new Error('Cannot update posted expense');
    }
    
    const {
      expense_type_id,
      amount_before_vat,
      vat_rate,
      currency_id,
      exchange_rate,
      expense_date,
      distribution_method,
      
      lc_id, lc_number, lc_bank_name, lc_total_amount, lc_currency_code,
      insurance_company_id, insurance_policy_number,
      shipping_agent_id, shipping_company_id,
      clearance_office_id,
      laboratory_id, certificate_number,
      port_id,
      
      customs_declaration_id, customs_declaration_number,
      declaration_type, declaration_type_id, declaration_date, has_undertaking, undertaking_details,
      
      // Additional customs declaration fields for expense 8005
      origin_country_id, destination_country_id,
      total_fob_value, freight_value, insurance_value,
      customs_duty, handling_fees, ground_fees, other_charges,
      
      transport_from, transport_to, container_count, goods_description,
      driver_name, receiver_name, workers_count,
      
      invoice_number, receipt_number, payment_reference,
      entity_name, description, notes
    } = req.body;
    
    // Get expense type details
    const typeResult = await client.query(`
      SELECT code, name, name_ar, analytic_account_code, default_vat_rate, is_vat_exempt
      FROM shipment_expense_types WHERE id = $1
    `, [expense_type_id || existing.expense_type_id]);
    
    const expenseType = typeResult.rows[0];
    
    // Calculate amounts
    const actualVatRate = expenseType.is_vat_exempt ? 0 : (vat_rate ?? existing.vat_rate);
    const finalAmount = amount_before_vat ?? existing.amount_before_vat;
    const vatAmount = Number(finalAmount) * (actualVatRate / 100);
    const totalAmount = Number(finalAmount) + vatAmount;
    const finalExchangeRate = exchange_rate ?? existing.exchange_rate;
    
    const amountInBaseCurrency = Number(finalAmount) * Number(finalExchangeRate);
    const vatInBaseCurrency = vatAmount * Number(finalExchangeRate);
    const totalInBaseCurrency = totalAmount * Number(finalExchangeRate);
    
    // Get currency code
    const currencyResult = await client.query(`SELECT code FROM currencies WHERE id = $1`, [currency_id || existing.currency_id]);
    const currencyCode = currencyResult.rows[0]?.code || 'SAR';
    
    // Generate amount in words (English and Arabic with proper currency)
    const amountInWords = amountToWordsEnglish(totalAmount, currencyCode);
    const amountInWordsAr = amountToWordsArabic(totalAmount, currencyCode);
    
    // Update expense
    await client.query(`
      UPDATE shipment_expenses SET
        expense_type_id = COALESCE($1, expense_type_id),
        expense_type_code = $2,
        expense_type_name = $3,
        analytic_account_code = $4,
        amount_before_vat = $5,
        vat_rate = $6,
        vat_amount = $7,
        total_amount = $8,
        currency_id = COALESCE($9, currency_id),
        currency_code = $10,
        exchange_rate = $11,
        amount_in_base_currency = $12,
        vat_in_base_currency = $13,
        total_in_base_currency = $14,
        expense_date = COALESCE($15, expense_date),
        distribution_method = COALESCE($16, distribution_method),
        lc_id = $17, lc_number = $18, lc_bank_name = $19, lc_total_amount = $20, lc_currency_code = $21,
        insurance_company_id = $22, insurance_policy_number = $23,
        shipping_agent_id = $24, shipping_company_id = $25,
        clearance_office_id = $26,
        laboratory_id = $27, certificate_number = $28,
        port_id = $29,
        customs_declaration_id = $30, customs_declaration_number = $31,
        declaration_type = $32, declaration_date = $33, has_undertaking = $34, undertaking_details = $35,
        transport_from = $36, transport_to = $37, container_count = $38, goods_description = $39,
        driver_name = $40, receiver_name = $41, workers_count = $42,
        invoice_number = $43, receipt_number = $44, payment_reference = $45,
        entity_name = $46, description = $47, notes = $48,
        amount_in_words = $49, amount_in_words_ar = $50,
        updated_by = $51, updated_at = NOW()
      WHERE id = $52
    `, [
      expense_type_id, expenseType.code, expenseType.name, expenseType.analytic_account_code,
      finalAmount, actualVatRate, vatAmount, totalAmount,
      currency_id, currencyCode, finalExchangeRate,
      amountInBaseCurrency, vatInBaseCurrency, totalInBaseCurrency,
      expense_date || null, distribution_method,
      lc_id || null, lc_number || null, lc_bank_name || null, lc_total_amount || null, lc_currency_code || null,
      insurance_company_id || null, insurance_policy_number || null,
      shipping_agent_id || null, shipping_company_id || null,
      clearance_office_id || null,
      laboratory_id || null, certificate_number || null,
      port_id || null,
      customs_declaration_id || null, customs_declaration_number || null,
      declaration_type || null, declaration_date || null, has_undertaking, undertaking_details || null,
      transport_from || null, transport_to || null, container_count || null, goods_description || null,
      driver_name || null, receiver_name || null, workers_count || null,
      invoice_number || null, receipt_number || null, payment_reference || null,
      entity_name || null, description || null, notes || null,
      amountInWords, amountInWordsAr,
      userId, id
    ]);
    
    // =====================================================
    // SYNC: Update linked customs declaration if expense type is 8005
    // =====================================================
    const finalDeclarationId = customs_declaration_id || existing.customs_declaration_id;
    if (expenseType.code === '8005' && finalDeclarationId) {
      // Calculate CIF and total fees for customs declaration
      const fobValue = parseFloat(total_fob_value) || 0;
      const freightVal = parseFloat(freight_value) || 0;
      const insuranceVal = parseFloat(insurance_value) || 0;
      const customsDutyVal = parseFloat(customs_duty) || finalAmount;
      const handlingFeesVal = parseFloat(handling_fees) || 0;
      const groundFeesVal = parseFloat(ground_fees) || 0;
      const otherChargesVal = parseFloat(other_charges) || 0;
      const cifValue = fobValue + freightVal + insuranceVal;
      const totalFeesVal = customsDutyVal + vatAmount + handlingFeesVal + groundFeesVal + otherChargesVal;
      
      await client.query(`
        UPDATE customs_declarations SET
          declaration_number = COALESCE($1, declaration_number),
          declaration_type_id = COALESCE($2, declaration_type_id),
          declaration_date = COALESCE($3, declaration_date),
          port_id = COALESCE($4, port_id),
          origin_country_id = COALESCE($5, origin_country_id),
          destination_country_id = COALESCE($6, destination_country_id),
          currency_id = COALESCE($7, currency_id),
          exchange_rate = COALESCE($8, exchange_rate),
          total_fob_value = COALESCE($9, total_fob_value),
          freight_value = COALESCE($10, freight_value),
          insurance_value = COALESCE($11, insurance_value),
          total_cif_value = COALESCE($12, total_cif_value),
          handling_fees = COALESCE($13, handling_fees),
          ground_fees = COALESCE($14, ground_fees),
          other_charges = COALESCE($15, other_charges),
          total_fees = $16,
          total_customs_duty = $17,
          total_vat = $18,
          notes = COALESCE($19, notes),
          updated_by = $20, updated_at = NOW()
        WHERE id = $21 AND company_id = $22 AND deleted_at IS NULL
      `, [
        customs_declaration_number || null,
        declaration_type_id && declaration_type_id !== '' ? parseInt(declaration_type_id) : null,
        declaration_date || null,
        port_id && port_id !== '' ? parseInt(port_id) : null,
        origin_country_id && origin_country_id !== '' ? parseInt(origin_country_id) : null,
        destination_country_id && destination_country_id !== '' ? parseInt(destination_country_id) : null,
        currency_id || existing.currency_id,
        finalExchangeRate,
        fobValue || null,
        freightVal || null,
        insuranceVal || null,
        cifValue || null,
        handlingFeesVal || null,
        groundFeesVal || null,
        otherChargesVal || null,
        totalFeesVal,
        customsDutyVal,
        vatAmount,
        notes || null,
        userId,
        finalDeclarationId,
        companyId
      ]);
      console.log(`Synced customs declaration ${finalDeclarationId} with expense ${id}`);
    }
    
    await client.query('COMMIT');
    
    // Fetch updated record
    const updatedResult = await pool.query(`SELECT * FROM shipment_expenses WHERE id = $1`, [id]);
    
    res.json({ success: true, data: updatedResult.rows[0] });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error updating expense:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  } finally {
    client.release();
  }
});

// =====================================================
// DELETE EXPENSE
// =====================================================
router.delete('/:id', authenticate, requirePermission('shipment_expenses:delete'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    const companyId = (req as any).user?.companyId || 1;
    
    // Check if expense exists and is not posted
    const existingResult = await pool.query(`
      SELECT * FROM shipment_expenses WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
    `, [id, companyId]);
    
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'Expense not found' } });
    }
    
    if (existingResult.rows[0].is_posted) {
      return res.status(400).json({ success: false, error: { message: 'Cannot delete posted expense' } });
    }
    
    const existing = existingResult.rows[0];
    
    // Soft delete expense
    await pool.query(`
      UPDATE shipment_expenses SET deleted_at = NOW(), updated_by = $1 WHERE id = $2
    `, [userId, id]);
    
    // SYNC: Also delete linked customs declaration if expense type is 8005
    if (existing.expense_type_code === '8005' && existing.customs_declaration_id) {
      await pool.query(`
        UPDATE customs_declarations 
        SET deleted_at = NOW(), updated_by = $1, updated_at = NOW()
        WHERE id = $2 AND company_id = $3 AND deleted_at IS NULL
      `, [userId, existing.customs_declaration_id, companyId]);
      console.log(`Deleted linked customs declaration ${existing.customs_declaration_id} with expense ${id}`);
    }
    
    res.json({ success: true, message: 'Expense deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting expense:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// =====================================================
// APPROVE EXPENSE
// =====================================================
router.post('/:id/approve', authenticate, requirePermission('shipment_expenses:approve'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    const companyId = (req as any).user?.companyId || 1;
    const { approval_notes } = req.body;
    
    const result = await pool.query(`
      UPDATE shipment_expenses SET 
        approval_status = 'approved',
        approved_by = $1,
        approved_at = NOW(),
        approval_notes = $2,
        updated_by = $1,
        updated_at = NOW()
      WHERE id = $3 AND company_id = $4 AND deleted_at IS NULL
      RETURNING *
    `, [userId, approval_notes, id, companyId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'Expense not found' } });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error approving expense:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// =====================================================
// POST EXPENSE TO JOURNAL (Accounting Integration)
// =====================================================
router.post('/:id/post', authenticate, requirePermission('shipment_expenses:post'), async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const userId = (req as any).user?.id;
    const companyId = (req as any).user?.companyId || 1;
    
    // Get expense details with related info
    const expenseResult = await client.query(`
      SELECT 
        se.*,
        et.name as expense_type_name,
        et.name_ar as expense_type_name_ar,
        et.analytic_account_code,
        ls.shipment_number,
        p.code as project_code,
        p.name as project_name,
        acc.code as account_code,
        acc.name as account_name,
        acc.name_ar as account_name_ar
      FROM shipment_expenses se
      JOIN shipment_expense_types et ON se.expense_type_id = et.id
      JOIN logistics_shipments ls ON se.shipment_id = ls.id
      LEFT JOIN projects p ON ls.project_id = p.id
      LEFT JOIN accounts acc ON se.account_id = acc.id
      WHERE se.id = $1 AND se.company_id = $2 AND se.deleted_at IS NULL
    `, [id, companyId]);
    
    if (expenseResult.rows.length === 0) {
      throw new Error('Expense not found');
    }
    
    const expense = expenseResult.rows[0];
    
    // Validate expense is approved
    if (expense.approval_status !== 'approved') {
      throw new Error('Expense must be approved before posting');
    }
    
    // Check if already posted
    if (expense.is_posted || expense.journal_entry_id) {
      throw new Error('Expense is already posted to accounting');
    }
    
    // Ensure account_id is set
    if (!expense.account_id) {
      throw new Error('Expense must have an assigned account from Chart of Accounts');
    }
    
    // Get Accounts Payable account (2111010001)
    const payableResult = await client.query(`
      SELECT id, code, name, name_ar FROM accounts
      WHERE code = '2111010001' AND company_id = $1 AND deleted_at IS NULL
    `, [companyId]);
    
    if (payableResult.rows.length === 0) {
      throw new Error('Accounts Payable account (2111010001) not found');
    }
    const payableAccount = payableResult.rows[0];
    
    // Get VAT Input account if VAT amount exists
    let vatAccount = null;
    if (expense.vat_amount > 0) {
      const vatResult = await client.query(`
        SELECT id, code, name, name_ar FROM accounts
        WHERE code = '1141010001' AND company_id = $1 AND deleted_at IS NULL
      `, [companyId]);
      vatAccount = vatResult.rows[0];
    }
    
    // Generate journal entry number
    const entryNumberResult = await client.query(`
      SELECT 'JE-EXP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
             LPAD((COALESCE(MAX(CAST(SUBSTRING(entry_number FROM '\\d+$') AS INT)), 0) + 1)::TEXT, 4, '0') as entry_number
      FROM journal_entries
      WHERE company_id = $1 AND entry_number LIKE 'JE-EXP-%'
    `, [companyId]);
    const entryNumber = entryNumberResult.rows[0].entry_number;
    
    // Create journal entry
    const journalResult = await client.query(`
      INSERT INTO journal_entries (
        company_id, entry_number, entry_date, 
        description, description_ar,
        source_type, source_id,
        status, created_by, created_at
      ) VALUES (
        $1, $2, $3,
        $4, $5,
        'shipment_expense', $6,
        'posted', $7, NOW()
      ) RETURNING *
    `, [
      companyId,
      entryNumber,
      expense.expense_date,
      `Shipment Expense: ${expense.expense_type_name} - Shipment ${expense.shipment_number}`,
      `مصروف شحنة: ${expense.expense_type_name_ar || expense.expense_type_name} - شحنة ${expense.shipment_number}`,
      expense.id,
      userId
    ]);
    
    const journalEntry = journalResult.rows[0];
    let lineNumber = 1;
    
    // Debit: Expense Account (amount before VAT)
    await client.query(`
      INSERT INTO journal_lines (
        journal_entry_id, line_number, account_id,
        debit_amount, credit_amount, description, description_ar,
        cost_center_id, shipment_expense_id
      ) VALUES ($1, $2, $3, $4, 0, $5, $6, $7, $8)
    `, [
      journalEntry.id,
      lineNumber++,
      expense.account_id,
      expense.amount_before_vat,
      `${expense.expense_type_name} - ${expense.shipment_number}`,
      `${expense.expense_type_name_ar || expense.expense_type_name} - ${expense.shipment_number}`,
      expense.cost_center_id,
      expense.id
    ]);
    
    // Debit: VAT Input (if applicable)
    if (expense.vat_amount > 0 && vatAccount) {
      await client.query(`
        INSERT INTO journal_lines (
          journal_entry_id, line_number, account_id,
          debit_amount, credit_amount, description, description_ar,
          shipment_expense_id
        ) VALUES ($1, $2, $3, $4, 0, $5, $6, $7)
      `, [
        journalEntry.id,
        lineNumber++,
        vatAccount.id,
        expense.vat_amount,
        `VAT on ${expense.expense_type_name}`,
        `ضريبة على ${expense.expense_type_name_ar || expense.expense_type_name}`,
        expense.id
      ]);
    }
    
    // Credit: Accounts Payable (total amount)
    await client.query(`
      INSERT INTO journal_lines (
        journal_entry_id, line_number, account_id,
        debit_amount, credit_amount, description, description_ar,
        shipment_expense_id
      ) VALUES ($1, $2, $3, 0, $4, $5, $6, $7)
    `, [
      journalEntry.id,
      lineNumber,
      payableAccount.id,
      expense.total_amount,
      `Payable for ${expense.expense_type_name}`,
      `مستحقات ${expense.expense_type_name_ar || expense.expense_type_name}`,
      expense.id
    ]);
    
    // Update expense with journal reference
    await client.query(`
      UPDATE shipment_expenses SET
        journal_entry_id = $1,
        is_posted = true,
        posted_at = NOW(),
        posted_by = $2,
        updated_at = NOW()
      WHERE id = $3
    `, [journalEntry.id, userId, expense.id]);
    
    await client.query('COMMIT');
    
    // Return updated expense with journal info
    const updatedResult = await pool.query(`
      SELECT se.*, je.entry_number as journal_entry_number
      FROM shipment_expenses se
      LEFT JOIN journal_entries je ON se.journal_entry_id = je.id
      WHERE se.id = $1
    `, [id]);
    
    res.json({ 
      success: true, 
      data: updatedResult.rows[0],
      message: 'Expense posted to accounting successfully',
      journal_entry: journalEntry
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error posting expense to journal:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  } finally {
    client.release();
  }
});

// =====================================================
// REVERSE EXPENSE JOURNAL ENTRY
// =====================================================
router.post('/:id/reverse', authenticate, requirePermission('shipment_expenses:reverse'), async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const userId = (req as any).user?.id;
    const companyId = (req as any).user?.companyId || 1;
    const { reason } = req.body;
    
    // Get expense with journal entry
    const expenseResult = await client.query(`
      SELECT se.*, je.entry_number, je.id as journal_id
      FROM shipment_expenses se
      LEFT JOIN journal_entries je ON se.journal_entry_id = je.id
      WHERE se.id = $1 AND se.company_id = $2 AND se.deleted_at IS NULL
    `, [id, companyId]);
    
    if (expenseResult.rows.length === 0) {
      throw new Error('Expense not found');
    }
    
    const expense = expenseResult.rows[0];
    
    if (!expense.is_posted || !expense.journal_entry_id) {
      throw new Error('Expense is not posted to accounting');
    }
    
    // Get original journal lines
    const linesResult = await client.query(`
      SELECT * FROM journal_lines WHERE journal_entry_id = $1 ORDER BY line_number
    `, [expense.journal_id]);
    
    // Generate reversal entry number
    const entryNumberResult = await client.query(`
      SELECT 'JE-REV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
             LPAD((COALESCE(MAX(CAST(SUBSTRING(entry_number FROM '\\d+$') AS INT)), 0) + 1)::TEXT, 4, '0') as entry_number
      FROM journal_entries
      WHERE company_id = $1 AND entry_number LIKE 'JE-REV-%'
    `, [companyId]);
    const entryNumber = entryNumberResult.rows[0].entry_number;
    
    // Create reversal journal entry
    const reversalResult = await client.query(`
      INSERT INTO journal_entries (
        company_id, entry_number, entry_date,
        description, description_ar,
        source_type, source_id,
        reversal_of, status, created_by, created_at
      ) VALUES (
        $1, $2, CURRENT_DATE,
        $3, $4,
        'shipment_expense_reversal', $5,
        $6, 'posted', $7, NOW()
      ) RETURNING *
    `, [
      companyId,
      entryNumber,
      `Reversal: ${expense.entry_number} - ${reason || 'Expense reversal'}`,
      `عكس قيد: ${expense.entry_number} - ${reason || 'عكس مصروف'}`,
      expense.id,
      expense.journal_id,
      userId
    ]);
    
    const reversalEntry = reversalResult.rows[0];
    
    // Create reversed journal lines (swap debit/credit)
    for (const line of linesResult.rows) {
      await client.query(`
        INSERT INTO journal_lines (
          journal_entry_id, line_number, account_id,
          debit_amount, credit_amount, description, description_ar,
          shipment_expense_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        reversalEntry.id,
        line.line_number,
        line.account_id,
        line.credit_amount,  // Swap: credit becomes debit
        line.debit_amount,   // Swap: debit becomes credit
        `Reversal: ${line.description || ''}`,
        `عكس: ${line.description_ar || ''}`,
        expense.id
      ]);
    }
    
    // Mark original journal entry as reversed
    await client.query(`
      UPDATE journal_entries SET 
        is_reversed = true,
        reversed_by = $1,
        reversed_at = NOW()
      WHERE id = $2
    `, [reversalEntry.id, expense.journal_id]);
    
    // Update expense - clear posted status
    await client.query(`
      UPDATE shipment_expenses SET
        is_posted = false,
        journal_entry_id = NULL,
        posted_at = NULL,
        posted_by = NULL,
        reversal_reason = $1,
        reversed_at = NOW(),
        reversed_by = $2,
        updated_at = NOW()
      WHERE id = $3
    `, [reason, userId, expense.id]);
    
    await client.query('COMMIT');
    
    res.json({ 
      success: true, 
      message: 'Expense journal entry reversed successfully',
      reversal_entry: reversalEntry
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error reversing expense journal:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  } finally {
    client.release();
  }
});

// =====================================================
// GET COST SUMMARY
// =====================================================
router.get('/summary/:shipmentId', authenticate, async (req: Request, res: Response) => {
  try {
    const { shipmentId } = req.params;
    
    // Trigger recalculation
    await pool.query(`SELECT update_shipment_cost_summary($1)`, [shipmentId]);
    
    // Get summary
    const result = await pool.query(`
      SELECT * FROM shipment_cost_summary WHERE shipment_id = $1
    `, [shipmentId]);
    
    res.json({ success: true, data: result.rows[0] || null });
  } catch (error: any) {
    console.error('Error fetching cost summary:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// =====================================================
// REFERENCE DATA ENDPOINTS
// =====================================================

// Insurance Companies
router.get('/ref/insurance-companies', authenticate, async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user?.companyId || 1;
    const result = await pool.query(`
      SELECT id, code, name, name_ar, contact_person, phone, email
      FROM insurance_companies
      WHERE company_id = $1 AND is_active = true AND deleted_at IS NULL
      ORDER BY name
    `, [companyId]);
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Clearance Offices
router.get('/ref/clearance-offices', authenticate, async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user?.companyId || 1;
    const result = await pool.query(`
      SELECT id, code, name, name_ar, license_number, specialization
      FROM clearance_offices
      WHERE company_id = $1 AND is_active = true AND deleted_at IS NULL
      ORDER BY name
    `, [companyId]);
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Laboratories
router.get('/ref/laboratories', authenticate, async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user?.companyId || 1;
    const result = await pool.query(`
      SELECT id, code, name, name_ar, lab_type, is_saber_certified
      FROM laboratories
      WHERE company_id = $1 AND is_active = true AND deleted_at IS NULL
      ORDER BY name
    `, [companyId]);
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Shipping Agents
router.get('/ref/shipping-agents', authenticate, async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user?.companyId || 1;
    const { type } = req.query;
    
    let query = `
      SELECT id, code, name, name_ar, agent_type, services
      FROM shipping_agents
      WHERE company_id = $1 AND is_active = true AND deleted_at IS NULL
    `;
    const params: any[] = [companyId];
    
    if (type) {
      query += ` AND agent_type = $2`;
      params.push(type);
    }
    
    query += ` ORDER BY name`;
    
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Saudi Ports
router.get('/ref/saudi-ports', authenticate, async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT id, code, name, name_ar, port_type
      FROM ports
      WHERE country_id = (SELECT id FROM countries WHERE code IN ('SA', 'SAU') LIMIT 1)
        AND is_active = true AND deleted_at IS NULL
      ORDER BY name
    `);
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Freight Agents (shipping_line type)
router.get('/ref/freight-agents', authenticate, async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user?.companyId || 1;
    const result = await pool.query(`
      SELECT id, code, name, name_ar, agent_type, services
      FROM shipping_agents
      WHERE company_id = $1 AND is_active = true AND deleted_at IS NULL
        AND agent_type = 'shipping_line'
      ORDER BY name
    `, [companyId]);
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Forwarders (freight_forwarder type)
router.get('/ref/forwarders', authenticate, async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user?.companyId || 1;
    const result = await pool.query(`
      SELECT id, code, name, name_ar, agent_type, services
      FROM shipping_agents
      WHERE company_id = $1 AND is_active = true AND deleted_at IS NULL
        AND agent_type = 'freight_forwarder'
      ORDER BY name
    `, [companyId]);
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Transport Companies
router.get('/ref/transport-companies', authenticate, async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user?.companyId || 1;
    // Use vendors with freight type (includes transport/logistics companies)
    const result = await pool.query(`
      SELECT id, code, name, name_ar
      FROM vendors
      WHERE company_id = $1 AND status = 'active' AND deleted_at IS NULL
        AND vendor_type IN ('freight', 'transport', 'transport_company', 'logistics')
      ORDER BY name
    `, [companyId]);
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// =====================================================
// CALCULATE CUSTOMS DUTIES FOR SHIPMENT
// Calculates customs duty per item based on HS code and tariff rates
// =====================================================
router.get('/shipment/:shipmentId/customs-duty-breakdown', authenticate, async (req: Request, res: Response) => {
  try {
    const { shipmentId } = req.params;
    const companyId = (req as any).user?.companyId || 1;
    const countryCode = (req.query.country_code as string) || 'SA';
    
    // First, get the PO currency and exchange rate from database
    const exchangeRateResult = await pool.query(`
      SELECT 
        po.currency_id,
        cur.code as currency_code,
        COALESCE(
          (SELECT er.rate FROM exchange_rates er 
           WHERE er.from_currency_id = po.currency_id 
             AND er.to_currency_id = (SELECT id FROM currencies WHERE code = 'SAR' AND company_id = $2 LIMIT 1)
             AND er.is_active = true 
             AND er.deleted_at IS NULL
           ORDER BY er.effective_date DESC LIMIT 1),
          CASE WHEN cur.code = 'SAR' THEN 1.0 ELSE 3.75 END
        ) as exchange_rate
      FROM logistics_shipments ls
      JOIN purchase_orders po ON po.id = ls.purchase_order_id AND po.deleted_at IS NULL
      LEFT JOIN currencies cur ON po.currency_id = cur.id
      WHERE ls.id = $1 AND ls.company_id = $2
      LIMIT 1
    `, [shipmentId, companyId]);
    
    // Use exchange rate from DB, or fallback to query param, or default 3.75
    const dbExchangeRate = exchangeRateResult.rows[0]?.exchange_rate;
    const queryExchangeRate = parseFloat(req.query.exchange_rate as string);
    const exchangeRate = dbExchangeRate ? parseFloat(dbExchangeRate) : (queryExchangeRate || 3.75);
    
    console.log(`[customs-duty-breakdown] Shipment ${shipmentId}: DB rate=${dbExchangeRate}, Query rate=${queryExchangeRate}, Using=${exchangeRate}`);
    
    // Get shipment with PO items and their HS codes
    const itemsResult = await pool.query(`
      SELECT 
        poi.id as po_item_id,
        poi.item_id,
        i.code as item_code,
        i.name as item_name,
        i.name_ar as item_name_ar,
        i.hs_code,
        poi.ordered_qty as quantity,
        poi.unit_price,
        poi.line_total as item_total,
        po.currency_id,
        cur.code as currency_code,
        cur.symbol as currency_symbol,
        -- Get customs tariff for this item's HS code
        ct.duty_rate_percent,
        ct.notes_en as tariff_notes_en,
        ct.notes_ar as tariff_notes_ar,
        hs.description_en as hs_description_en,
        hs.description_ar as hs_description_ar
      FROM logistics_shipments ls
      JOIN purchase_orders po ON po.id = ls.purchase_order_id AND po.deleted_at IS NULL
      JOIN purchase_order_items poi ON poi.order_id = po.id
      JOIN items i ON poi.item_id = i.id AND i.deleted_at IS NULL
      LEFT JOIN currencies cur ON po.currency_id = cur.id
      LEFT JOIN customs_tariffs ct ON i.hs_code = ct.hs_code 
        AND ct.company_id = $2 
        AND ct.country_code = $3
        AND ct.is_active = true
        AND ct.deleted_at IS NULL
        AND ct.effective_from <= CURRENT_DATE
        AND (ct.effective_to IS NULL OR ct.effective_to >= CURRENT_DATE)
      LEFT JOIN hs_codes hs ON hs.code = i.hs_code AND hs.company_id = $2 AND hs.deleted_at IS NULL
      WHERE ls.id = $1 AND ls.company_id = $2
      ORDER BY poi.line_number
    `, [shipmentId, companyId, countryCode]);
    
    if (itemsResult.rows.length === 0) {
      return res.json({
        success: true,
        data: {
          items: [],
          summary: {
            total_goods_value: 0,
            total_duty: 0,
            total_duty_local: 0,
            currency_code: 'USD',
            exchange_rate: exchangeRate
          }
        }
      });
    }
    
    // Calculate duty for each item
    const items = itemsResult.rows.map(item => {
      const itemTotal = parseFloat(item.item_total) || 0;
      const dutyRate = parseFloat(item.duty_rate_percent) || 0;
      
      // Check if exempt (rate is 0 or notes contain exempt keywords)
      const notesEn = (item.tariff_notes_en || '').toLowerCase();
      const notesAr = (item.tariff_notes_ar || '').toLowerCase();
      const isExempt = dutyRate === 0 || notesEn.includes('exempt') || notesAr.includes('معف');
      
      const dutyAmount = isExempt ? 0 : Math.round(itemTotal * (dutyRate / 100) * 100) / 100;
      const dutyAmountLocal = Math.round(dutyAmount * exchangeRate * 100) / 100;
      
      return {
        po_item_id: item.po_item_id,
        item_id: item.item_id,
        item_code: item.item_code,
        item_name: item.item_name,
        item_name_ar: item.item_name_ar,
        hs_code: item.hs_code || null,
        hs_description_en: item.hs_description_en,
        hs_description_ar: item.hs_description_ar,
        quantity: parseFloat(item.quantity) || 0,
        unit_price: parseFloat(item.unit_price) || 0,
        item_total: itemTotal,
        currency_code: item.currency_code || 'USD',
        duty_rate_percent: dutyRate,
        is_exempt: isExempt,
        duty_amount: dutyAmount,
        duty_amount_local: dutyAmountLocal,
        tariff_notes_en: item.tariff_notes_en,
        tariff_notes_ar: item.tariff_notes_ar
      };
    });
    
    // Calculate totals
    const totalGoodsValue = items.reduce((sum, item) => sum + item.item_total, 0);
    const totalDuty = items.reduce((sum, item) => sum + item.duty_amount, 0);
    const totalDutyLocal = items.reduce((sum, item) => sum + item.duty_amount_local, 0);
    
    res.json({
      success: true,
      data: {
        items,
        summary: {
          total_goods_value: Math.round(totalGoodsValue * 100) / 100,
          total_duty: Math.round(totalDuty * 100) / 100,
          total_duty_local: Math.round(totalDutyLocal * 100) / 100,
          currency_code: items[0]?.currency_code || 'USD',
          exchange_rate: exchangeRate
        }
      }
    });
  } catch (error: any) {
    console.error('Error calculating customs duty breakdown:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// =====================================================
// GET SHIPMENT PO DETAILS FOR CUSTOMS
// Returns PO totals, items, and shipment info for customs form
// =====================================================
router.get('/shipment/:shipmentId/po-details', authenticate, async (req: Request, res: Response) => {
  try {
    const { shipmentId } = req.params;
    const companyId = (req as any).user?.companyId || 1;
    
    // Get shipment with PO info
    const result = await pool.query(`
      SELECT 
        ls.id as shipment_id,
        ls.shipment_number,
        ls.shipment_type_id,
        st.code as shipment_type_code,
        st.name_en as shipment_type_name,
        st.name_ar as shipment_type_name_ar,
        ls.port_of_discharge_id,
        pod.name as port_of_discharge_name,
        pod.name_ar as port_of_discharge_name_ar,
        ls.port_of_loading_id,
        pol.name as port_of_loading_name,
        pol.name_ar as port_of_loading_name_ar,
        pol.country_id as origin_country_id,
        oc.name as origin_country_name,
        oc.name_ar as origin_country_name_ar,
        oc.code as origin_country_code,
        pod.country_id as destination_country_id,
        COALESCE(dc.name, 'Saudi Arabia') as destination_country_name,
        COALESCE(dc.name_ar, 'المملكة العربية السعودية') as destination_country_name_ar,
        COALESCE(dc.code, 'SA') as destination_country_code,
        ls.total_amount as shipment_value,
        po.id as po_id,
        po.order_number as po_number,
        po.currency_id as po_currency_id,
        poc.code as po_currency_code,
        poc.symbol as po_currency_symbol,
        po.total_amount as po_total,
        po.subtotal as po_subtotal,
        -- Calculate actual item totals
        (SELECT COALESCE(SUM(poi.line_total), 0) 
         FROM purchase_order_items poi 
         WHERE poi.order_id = po.id) as po_items_total,
        -- Get exchange rate from USD to SAR (or from PO currency to base currency)
        (SELECT er.rate FROM exchange_rates er 
         WHERE er.from_currency_id = po.currency_id 
           AND er.to_currency_id = (SELECT id FROM currencies WHERE code = 'SAR' AND company_id = $2 LIMIT 1)
           AND er.is_active = true 
           AND er.deleted_at IS NULL
         ORDER BY er.effective_date DESC LIMIT 1) as exchange_rate_to_base
      FROM logistics_shipments ls
      LEFT JOIN logistics_shipment_types st ON ls.shipment_type_id = st.id
      LEFT JOIN ports pod ON ls.port_of_discharge_id = pod.id
      LEFT JOIN ports pol ON ls.port_of_loading_id = pol.id
      LEFT JOIN countries oc ON pol.country_id = oc.id
      LEFT JOIN countries dc ON pod.country_id = dc.id
      LEFT JOIN purchase_orders po ON po.id = ls.purchase_order_id AND po.deleted_at IS NULL
      LEFT JOIN currencies poc ON po.currency_id = poc.id
      WHERE ls.id = $1 AND ls.company_id = $2
      LIMIT 1
    `, [shipmentId, companyId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'Shipment not found' } });
    }
    
    const data = result.rows[0];
    
    // Calculate FOB from PO items total
    const fobValue = parseFloat(data.po_items_total) || parseFloat(data.po_total) || parseFloat(data.shipment_value) || 0;
    
    res.json({
      success: true,
      data: {
        shipment_id: data.shipment_id,
        shipment_number: data.shipment_number,
        shipment_type: {
          id: data.shipment_type_id,
          code: data.shipment_type_code,
          name_en: data.shipment_type_name,
          name_ar: data.shipment_type_name_ar
        },
        port_of_discharge: {
          id: data.port_of_discharge_id,
          name: data.port_of_discharge_name,
          name_ar: data.port_of_discharge_name_ar
        },
        port_of_loading: {
          id: data.port_of_loading_id,
          name: data.port_of_loading_name,
          name_ar: data.port_of_loading_name_ar
        },
        origin_country: {
          id: data.origin_country_id,
          code: data.origin_country_code,
          name: data.origin_country_name,
          name_ar: data.origin_country_name_ar
        },
        destination_country: {
          id: data.destination_country_id,
          code: data.destination_country_code,
          name: data.destination_country_name,
          name_ar: data.destination_country_name_ar
        },
        purchase_order: data.po_id ? {
          id: data.po_id,
          number: data.po_number,
          currency: {
            id: data.po_currency_id,
            code: data.po_currency_code,
            symbol: data.po_currency_symbol
          },
          total: parseFloat(data.po_total) || 0,
          items_total: fobValue
        } : null,
        // Pre-calculated values for customs form
        fob_value: fobValue,
        currency_code: data.po_currency_code || 'USD',
        exchange_rate: parseFloat(data.exchange_rate_to_base) || 3.75,
        freight_charges: parseFloat(data.freight_charges) || 0,
        insurance_value: parseFloat(data.insurance_value) || 0
      }
    });
  } catch (error: any) {
    console.error('Error fetching shipment PO details:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

export default router;
