import { Router, Request, Response } from 'express';
import pool from '../../db';
import { authenticate } from '../../middleware/auth';
import { loadCompanyContext } from '../../middleware/companyContext';
import { requireAnyPermission, requirePermission } from '../../middleware/rbac';
import logger from '../../utils/logger';
import { DocumentNumberService } from '../../services/documentNumberService';
import { VendorComplianceService } from '../../services/vendorComplianceService';
import { ProcurementSettingsService } from '../../services/procurementSettingsService';
import { checkNeedsApproval, createApprovalRequest, isDocumentApproved } from '../../utils/approvalHelpers';
import { syncPurchaseOrderToShipments } from '../../services/purchaseOrderSyncService';

const router = Router();

router.use(authenticate);
router.use(loadCompanyContext);

// ============================================
// PURCHASE ORDER TYPES
// ============================================

router.get('/order-types', requirePermission('purchase_orders:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const result = await pool.query(
      'SELECT * FROM purchase_order_types WHERE company_id = $1 AND deleted_at IS NULL ORDER BY sort_order, name',
      [companyId]
    );
    res.json({ success: true, data: result.rows, total: result.rowCount });
  } catch (error) {
    logger.error('Error fetching PO types:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch PO types' } });
  }
});

// ============================================
// PURCHASE ORDER STATUSES
// ============================================

router.get('/order-statuses', requirePermission('purchase_orders:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const result = await pool.query(
      'SELECT * FROM purchase_order_statuses WHERE company_id = $1 AND deleted_at IS NULL ORDER BY sort_order, name',
      [companyId]
    );
    res.json({ success: true, data: result.rows, total: result.rowCount });
  } catch (error) {
    logger.error('Error fetching PO statuses:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch PO statuses' } });
  }
});

// ============================================
// PURCHASE ORDERS - Full CRUD
// ============================================

// GET /api/procurement/purchase-orders - List purchase orders
router.get('/', requirePermission('purchase_orders:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    if (!companyId) {
      return res.status(400).json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
    }

    const { search, status, status_id, vendor_id, order_type_id, from_date, to_date, page = 1, limit = 20, exclude_with_shipments } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const params: any[] = [companyId];
    let paramIndex = 2;

    let whereClause = 'WHERE po.company_id = $1 AND po.deleted_at IS NULL';
    
    // Exclude POs that already have shipments linked
    if (exclude_with_shipments === 'true') {
      whereClause += ` AND NOT EXISTS (
        SELECT 1 FROM logistics_shipments ls 
        WHERE ls.purchase_order_id = po.id AND ls.deleted_at IS NULL
      )`;
    }

    if (search) {
      whereClause += ` AND (po.order_number ILIKE $${paramIndex} OR po.vendor_name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status_id) {
      whereClause += ` AND po.status_id = $${paramIndex}`;
      params.push(status_id);
      paramIndex++;
    } else if (status) {
      whereClause += ` AND po.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (vendor_id) {
      whereClause += ` AND po.vendor_id = $${paramIndex}`;
      params.push(vendor_id);
      paramIndex++;
    }

    if (order_type_id) {
      whereClause += ` AND po.order_type_id = $${paramIndex}`;
      params.push(order_type_id);
      paramIndex++;
    }

    if (from_date) {
      whereClause += ` AND po.order_date >= $${paramIndex}`;
      params.push(from_date);
      paramIndex++;
    }

    if (to_date) {
      whereClause += ` AND po.order_date <= $${paramIndex}`;
      params.push(to_date);
      paramIndex++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM purchase_orders po ${whereClause}`,
      params
    );

    params.push(Number(limit), offset);
    const query = `
      SELECT 
        po.*,
        v.name as vendor_display_name, v.name_ar as vendor_display_name_ar,
        pot.name as order_type_name, pot.name_ar as order_type_name_ar,
        pos.name as status_name, pos.name_ar as status_name_ar, pos.color as status_color,
        COALESCE(pos.code, UPPER(po.status)) as status_code,
        pos.allows_edit, pos.allows_delete, pos.allows_receive, pos.allows_invoice,
        COALESCE(NULLIF(po.vendor_contract_number, ''), vc.contract_number) as vendor_contract_number_resolved,
        COALESCE(po.vendor_contract_date, vc.contract_date) as vendor_contract_date_resolved,
        proj.code as project_code, proj.name as project_name, proj.name_ar as project_name_ar,
        items.item_count,
        items.item_names,
        items.item_names_ar,
        items.single_uom_code,
        items.single_qty,
        items.single_unit_price,
        c.code as currency_code, c.symbol as currency_symbol,
        w.name as warehouse_name
      FROM purchase_orders po
      LEFT JOIN vendors v ON po.vendor_id = v.id
      LEFT JOIN purchase_order_types pot ON po.order_type_id = pot.id
      LEFT JOIN vendor_contracts vc ON po.contract_id = vc.id
      LEFT JOIN projects proj ON po.project_id = proj.id
      LEFT JOIN purchase_order_statuses pos
        ON (
          (po.status_id = pos.id)
          OR (
            po.status_id IS NULL
            AND pos.company_id = po.company_id
            AND pos.deleted_at IS NULL
            AND UPPER(pos.code) = UPPER(po.status)
          )
        )
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*)::int as item_count,
          STRING_AGG(
            COALESCE(
              NULLIF(poi.item_name, ''),
              NULLIF(i.name, ''),
              NULLIF(i.code, ''),
              NULLIF(poi.item_code, ''),
              ''
            ),
            E'\n' ORDER BY poi.line_number
          ) as item_names,
          STRING_AGG(
            COALESCE(
              NULLIF(poi.item_name_ar, ''),
              NULLIF(i.name_ar, ''),
              NULLIF(poi.item_name, ''),
              NULLIF(i.name, ''),
              NULLIF(i.code, ''),
              NULLIF(poi.item_code, ''),
              ''
            ),
            E'\n' ORDER BY poi.line_number
          ) as item_names_ar,
          CASE WHEN COUNT(*) = 1 THEN MAX(COALESCE(u.code, ubase.code)) END as single_uom_code,
          CASE WHEN COUNT(*) = 1 THEN MAX(poi.ordered_qty) END as single_qty,
          CASE WHEN COUNT(*) = 1 THEN MAX(poi.unit_price) END as single_unit_price
        FROM purchase_order_items poi
        LEFT JOIN items i ON poi.item_id = i.id
        LEFT JOIN units_of_measure u ON poi.uom_id = u.id
        LEFT JOIN units_of_measure ubase ON i.base_uom_id = ubase.id
        WHERE poi.order_id = po.id
      ) items ON true
      LEFT JOIN currencies c ON po.currency_id = c.id
      LEFT JOIN warehouses w ON po.warehouse_id = w.id
      ${whereClause}
      ORDER BY po.order_date DESC, po.order_number DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / Number(limit))
    });
  } catch (error) {
    logger.error('Error fetching purchase orders:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch purchase orders' } });
  }
});

// GET /api/procurement/purchase-orders/:id - Get single PO with items
router.get('/:id', requirePermission('purchase_orders:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const { id } = req.params;

    const poResult = await pool.query(`
      SELECT 
        po.*,
        v.name as vendor_display_name, v.name_ar as vendor_display_name_ar,
        pot.name as order_type_name, pot.name_ar as order_type_name_ar,
        pos.name as status_name, pos.name_ar as status_name_ar, pos.color as status_color,
        pos.allows_edit, pos.allows_delete, pos.allows_receive, pos.allows_invoice,
        c.code as currency_code, c.symbol as currency_symbol,
        w.name as warehouse_name,
        vpt.name as payment_terms_name,
        pm.name as payment_method_name, pm.name_ar as payment_method_name_ar,
        dt.name as delivery_terms_name, dt.incoterm_code as incoterm,
        st.name as supply_terms_name,
        proj.code as project_code, proj.name as project_name
      FROM purchase_orders po
      LEFT JOIN vendors v ON po.vendor_id = v.id
      LEFT JOIN purchase_order_types pot ON po.order_type_id = pot.id
      LEFT JOIN purchase_order_statuses pos ON po.status_id = pos.id
      LEFT JOIN currencies c ON po.currency_id = c.id
      LEFT JOIN warehouses w ON po.warehouse_id = w.id
      LEFT JOIN vendor_payment_terms vpt ON po.payment_terms_id = vpt.id
      LEFT JOIN payment_methods pm ON po.payment_method_id = pm.id
      LEFT JOIN delivery_terms dt ON po.delivery_terms_id = dt.id
      LEFT JOIN supply_terms st ON po.supply_terms_id = st.id
      LEFT JOIN projects proj ON po.project_id = proj.id
      WHERE po.id = $1 AND po.company_id = $2 AND po.deleted_at IS NULL
    `, [id, companyId]);

    if (poResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Purchase order not found' } });
    }

    // Get items
    const itemsResult = await pool.query(`
      SELECT 
        poi.*,
        i.code as item_display_code, i.name as item_display_name, i.name_ar as item_display_name_ar,
        u.code as uom_code, u.name as uom_name,
        tr.name as tax_rate_name, tr.rate as tax_rate_value
      FROM purchase_order_items poi
      LEFT JOIN items i ON poi.item_id = i.id
      LEFT JOIN units_of_measure u ON poi.uom_id = u.id
      LEFT JOIN tax_rates tr ON poi.tax_rate_id = tr.id
      WHERE poi.order_id = $1
      ORDER BY poi.line_number
    `, [id]);

    // Map items to consistent format for frontend
    const mappedItems = itemsResult.rows.map(item => ({
      ...item,
      sku: item.item_display_code,
      name_en: item.item_display_name,
      name_ar: item.item_display_name_ar,
      quantity: item.ordered_qty,
      unit_id: item.uom_id,
      unit_code: item.uom_code,
    }));

    res.json({ 
      success: true, 
      data: {
        ...poResult.rows[0],
        items: mappedItems
      }
    });
  } catch (error) {
    logger.error('Error fetching purchase order:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch purchase order' } });
  }
});

// POST /api/procurement/purchase-orders - Create purchase order
router.post('/', requirePermission('purchase_orders:create'), async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const {
      order_date, expected_date, vendor_id, order_type_id, contract_id, quotation_id,
      warehouse_id, currency_id, exchange_rate, payment_terms_id, payment_method_id, delivery_terms_id, supply_terms_id,
      discount_amount, freight_amount, ship_to_address, notes, internal_notes, cost_center_id,
      vendor_contract_number, vendor_contract_date,
      status_id, project_id,
      origin_country_id, origin_city_id, destination_country_id, destination_city_id,
      port_of_loading_id, port_of_loading_text, port_of_discharge_id,
      items
    } = req.body;

    // Validate required fields
    if (!order_date || !vendor_id) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Order date and vendor are required' } });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'At least one item is required' } });
    }

    // Check vendor status allows POs
    const vendorCheck = await client.query(`
      SELECT
        v.id,
        v.code,
        v.name,
        v.name_ar,
        COALESCE(vs.allows_purchase_orders, true) as allows_purchase_orders
      FROM vendors v
      LEFT JOIN vendor_statuses vs ON v.status_id = vs.id
      WHERE v.id = $1 AND v.company_id = $2 AND v.deleted_at IS NULL
    `, [vendor_id, companyId]);

    if (vendorCheck.rows.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_VENDOR', message: 'Vendor not found' } });
    }

    if (vendorCheck.rows[0].allows_purchase_orders === false) {
      return res.status(400).json({ success: false, error: { code: 'VENDOR_BLOCKED', message: 'Cannot create PO for this vendor status' } });
    }

    // ═══════════════════════════════════════════════════
    // 🛡️ VENDOR COMPLIANCE & RISK CHECK (NEW)
    // ═══════════════════════════════════════════════════
    const complianceStatus = await VendorComplianceService.getComplianceStatus(vendor_id, companyId);
    
    // Block if vendor is blacklisted or critical risk
    if (complianceStatus.is_blacklisted) {
      return res.status(400).json({ 
        success: false, 
        error: { 
          code: 'VENDOR_BLACKLISTED', 
          message: `Vendor is blacklisted: ${complianceStatus.warnings[0]}` 
        } 
      });
    }
    
    if (!complianceStatus.can_create_po) {
      return res.status(400).json({ 
        success: false, 
        error: { 
          code: 'VENDOR_COMPLIANCE_FAILED', 
          message: `Cannot create PO: ${complianceStatus.warnings.join(', ')}` 
        } 
      });
    }
    
    // High risk vendors may need additional approval (stored for later workflow)
    const requiresRiskApproval = complianceStatus.risk_level === 'high';

    await client.query('BEGIN');

    // ═══════════════════════════════════════════════════
    // 🔢 DOCUMENT NUMBERING SERVICE (NEW)
    // ═══════════════════════════════════════════════════
    const generatedNumber = await DocumentNumberService.generateNumber(companyId, 'purchase_order');
    const orderNumber = generatedNumber.number;

    // Resolve status (default Draft)
    let resolvedStatusId: number | null = null;
    let resolvedStatusText: string | null = null;

    if (status_id) {
      const statusRes = await client.query(
        `
        SELECT id, code
        FROM purchase_order_statuses
        WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
      `,
        [status_id, companyId]
      );
      if (statusRes.rows.length > 0) {
        resolvedStatusId = Number(statusRes.rows[0].id);
        resolvedStatusText = String(statusRes.rows[0].code || '').toLowerCase() || null;
      }
    }

    if (!resolvedStatusId) {
      const defaultStatus = await client.query(
        'SELECT id, code FROM purchase_order_statuses WHERE company_id = $1 AND code = $2 AND deleted_at IS NULL',
        [companyId, 'DRAFT']
      );
      resolvedStatusId = defaultStatus.rows[0]?.id ? Number(defaultStatus.rows[0].id) : null;
      resolvedStatusText = defaultStatus.rows[0]?.code ? String(defaultStatus.rows[0].code).toLowerCase() : 'draft';
    }

    // Calculate totals
    let subtotal = 0;
    let taxAmount = 0;
    
    for (const item of items) {
      const lineTotal = (item.quantity || 0) * (item.unit_price || 0);
      const itemDiscount = item.discount_amount || (lineTotal * (item.discount_percent || 0) / 100);
      const itemTax = (lineTotal - itemDiscount) * (item.tax_rate || 0) / 100;
      subtotal += lineTotal - itemDiscount;
      taxAmount += itemTax;
    }

    const totalAmount = subtotal - (discount_amount || 0) + taxAmount + (freight_amount || 0);

    let resolvedContractNumber: string | null = vendor_contract_number || null;
    let resolvedContractDate: string | null = vendor_contract_date || null;
    if (contract_id && (!resolvedContractNumber || !resolvedContractDate)) {
      const contractRes = await client.query(
        `
        SELECT contract_number, contract_date
        FROM vendor_contracts
        WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
      `,
        [contract_id, companyId]
      );
      if (contractRes.rows.length > 0) {
        resolvedContractNumber = resolvedContractNumber || contractRes.rows[0].contract_number || null;
        resolvedContractDate = resolvedContractDate || contractRes.rows[0].contract_date || null;
      }
    }

    // Insert PO
    const poResult = await client.query(`
      INSERT INTO purchase_orders (
        company_id, order_number, order_date, expected_date,
        vendor_id, vendor_code, vendor_name,
        order_type_id, contract_id, quotation_id, warehouse_id,
        vendor_contract_number, vendor_contract_date,
        currency_id, exchange_rate, payment_terms_id, payment_method_id, delivery_terms_id, supply_terms_id,
        subtotal, discount_amount, tax_amount, freight_amount, total_amount,
        status_id, status, ship_to_address, notes, internal_notes, cost_center_id, project_id,
        origin_country_id, origin_city_id, destination_country_id, destination_city_id,
        port_of_loading_id, port_of_loading_text, port_of_discharge_id,
        created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19,
        $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39
      ) RETURNING *
    `, [
      companyId, orderNumber, order_date, expected_date,
      vendor_id, vendorCheck.rows[0].code, vendorCheck.rows[0].name,
      order_type_id, contract_id, quotation_id, warehouse_id,
      resolvedContractNumber, resolvedContractDate,
      currency_id, exchange_rate || 1, payment_terms_id, payment_method_id, delivery_terms_id, supply_terms_id,
      subtotal, discount_amount || 0, taxAmount, freight_amount || 0, totalAmount,
      resolvedStatusId, resolvedStatusText,
      ship_to_address, notes, internal_notes, cost_center_id, project_id,
      origin_country_id, origin_city_id, destination_country_id, destination_city_id,
      port_of_loading_id, port_of_loading_text, port_of_discharge_id,
      userId
    ]);

    const orderId = poResult.rows[0].id;

    // Insert items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const lineTotal = (item.quantity || 0) * (item.unit_price || 0);
      const itemDiscount = item.discount_amount || (lineTotal * (item.discount_percent || 0) / 100);
      const itemTax = (lineTotal - itemDiscount) * (item.tax_rate || 0) / 100;

      await client.query(`
        INSERT INTO purchase_order_items (
          order_id, line_number, item_id, item_code, item_name, item_name_ar,
          uom_id, ordered_qty, unit_price, discount_percent, discount_amount,
          tax_rate_id, tax_rate, tax_amount, line_total,
          warehouse_id, cost_center_id, expense_account_id, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      `, [
        orderId, i + 1, item.item_id, item.item_code, item.item_name, item.item_name_ar,
        item.uom_id, item.quantity, item.unit_price, item.discount_percent || 0, itemDiscount,
        item.tax_rate_id, item.tax_rate || 0, itemTax, lineTotal - itemDiscount + itemTax,
        item.warehouse_id || warehouse_id, item.cost_center_id || cost_center_id, item.expense_account_id, item.notes
      ]);
    }

    await client.query('COMMIT');

    logger.info('Purchase order created', { orderId, orderNumber, userId });
    res.status(201).json({ success: true, data: poResult.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error creating purchase order:', error);
    res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: 'Failed to create purchase order' } });
  } finally {
    client.release();
  }
});

// PUT /api/procurement/purchase-orders/:id - Update purchase order (Draft only)
router.put(
  '/:id',
  requireAnyPermission(['purchase_orders:edit', 'purchase_orders:update']),
  async (req: Request, res: Response) => {
    const client = await pool.connect();

    try {
      const companyId = (req as any).companyContext?.companyId;
      const userId = (req as any).user?.id;
      const userRoles: string[] = Array.isArray((req as any).user?.roles) ? (req as any).user.roles : [];
      const isSuperAdmin = userRoles.includes('super_admin');
      const { id } = req.params;

      if (!companyId) {
        return res.status(400).json({ success: false, error: { code: 'COMPANY_REQUIRED', message: 'Company context required' } });
      }

      const {
        order_date,
        expected_date,
        vendor_id,
        vendor_contract_number,
        vendor_contract_date,
        status_id,
        order_type_id,
        contract_id,
        quotation_id,
        warehouse_id,
        currency_id,
        exchange_rate,
        payment_terms_id,
        payment_method_id,
        delivery_terms_id,
        supply_terms_id,
        discount_amount,
        freight_amount,
        ship_to_address,
        notes,
        internal_notes,
        cost_center_id,
        project_id,
        origin_country_id,
        origin_city_id,
        destination_country_id,
        destination_city_id,
        port_of_loading_id,
        port_of_loading_text,
        port_of_discharge_id,
        items,
      } = req.body;

      if (!order_date || !vendor_id) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Order date and vendor are required' } });
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'At least one item is required' } });
      }

      // Load existing PO and ensure it can be edited
      const existingRes = await client.query(
        `
        SELECT po.id, po.status, po.status_id, pos.allows_edit
        FROM purchase_orders po
        LEFT JOIN purchase_order_statuses pos ON po.status_id = pos.id
        WHERE po.id = $1 AND po.company_id = $2 AND po.deleted_at IS NULL
      `,
        [id, companyId]
      );

      if (existingRes.rows.length === 0) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Purchase order not found' } });
      }

      const existing = existingRes.rows[0];
      if (!isSuperAdmin && existing.allows_edit === false) {
        return res.status(400).json({
          success: false,
          error: { code: 'NOT_EDITABLE', message: 'Purchase order cannot be edited in its current status' },
        });
      }

      // Check vendor validity (same as create)
      const vendorCheck = await client.query(
        `
        SELECT
          v.id,
          v.code,
          v.name,
          v.name_ar,
          COALESCE(vs.allows_purchase_orders, true) as allows_purchase_orders
        FROM vendors v
        LEFT JOIN vendor_statuses vs ON v.status_id = vs.id
        WHERE v.id = $1 AND v.company_id = $2 AND v.deleted_at IS NULL
      `,
        [vendor_id, companyId]
      );

      if (vendorCheck.rows.length === 0) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_VENDOR', message: 'Vendor not found' } });
      }

      if (vendorCheck.rows[0].allows_purchase_orders === false) {
        return res.status(400).json({ success: false, error: { code: 'VENDOR_BLOCKED', message: 'Cannot create PO for this vendor status' } });
      }

      let resolvedContractNumber: string | null = vendor_contract_number || null;
      let resolvedContractDate: string | null = vendor_contract_date || null;
      if (contract_id && (!resolvedContractNumber || !resolvedContractDate)) {
        const contractRes = await client.query(
          `
          SELECT contract_number, contract_date
          FROM vendor_contracts
          WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
        `,
          [contract_id, companyId]
        );
        if (contractRes.rows.length > 0) {
          resolvedContractNumber = resolvedContractNumber || contractRes.rows[0].contract_number || null;
          resolvedContractDate = resolvedContractDate || contractRes.rows[0].contract_date || null;
        }
      }

      await client.query('BEGIN');

      // Recalculate totals
      let subtotal = 0;
      let taxAmount = 0;

      for (const item of items) {
        const lineTotal = (item.quantity || 0) * (item.unit_price || 0);
        const itemDiscount = item.discount_amount || (lineTotal * (item.discount_percent || 0) / 100);
        const itemTax = (lineTotal - itemDiscount) * (item.tax_rate || 0) / 100;
        subtotal += lineTotal - itemDiscount;
        taxAmount += itemTax;
      }

      const totalAmount = subtotal - (discount_amount || 0) + taxAmount + (freight_amount || 0);

      // Resolve status - if omitted, keep current
      let resolvedStatusId: number | null = null;
      let resolvedStatusText: string | null = null;

      if (status_id) {
        const statusRes = await client.query(
          `
          SELECT id, code
          FROM purchase_order_statuses
          WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
        `,
          [status_id, companyId]
        );
        if (statusRes.rows.length > 0) {
          const code = String(statusRes.rows[0].code || '');
          resolvedStatusId = Number(statusRes.rows[0].id);
          resolvedStatusText = code ? code.toLowerCase() : null;
        }
      }

      const updateRes = await client.query(
        `
        UPDATE purchase_orders
        SET
          order_date = $1,
          expected_date = $2,
          vendor_id = $3,
          vendor_code = $4,
          vendor_name = $5,
          vendor_contract_number = $6,
          vendor_contract_date = $7,
          order_type_id = $8,
          contract_id = $9,
          quotation_id = $10,
          warehouse_id = $11,
          currency_id = $12,
          exchange_rate = $13,
          payment_terms_id = $14,
          payment_method_id = $15,
          delivery_terms_id = $16,
          supply_terms_id = $17,
          subtotal = $18,
          discount_amount = $19,
          tax_amount = $20,
          freight_amount = $21,
          total_amount = $22,
          ship_to_address = $23,
          notes = $24,
          internal_notes = $25,
          cost_center_id = $26,
          project_id = $27,
          origin_country_id = $28,
          origin_city_id = $29,
          destination_country_id = $30,
          destination_city_id = $31,
          port_of_loading_id = $32,
          port_of_loading_text = $33,
          port_of_discharge_id = $34,
          status_id = COALESCE($35, status_id),
          status = COALESCE($36, status),
          updated_by = $37,
          updated_at = NOW()
        WHERE id = $38 AND company_id = $39 AND deleted_at IS NULL
        RETURNING *
      `,
        [
          order_date,
          expected_date,
          vendor_id,
          vendorCheck.rows[0].code,
          vendorCheck.rows[0].name,
          resolvedContractNumber,
          resolvedContractDate,
          order_type_id,
          contract_id,
          quotation_id,
          warehouse_id,
          currency_id,
          exchange_rate || 1,
          payment_terms_id,
          payment_method_id,
          delivery_terms_id,
          supply_terms_id,
          subtotal,
          discount_amount || 0,
          taxAmount,
          freight_amount || 0,
          totalAmount,
          ship_to_address,
          notes,
          internal_notes,
          cost_center_id,
          project_id,
          origin_country_id,
          origin_city_id,
          destination_country_id,
          destination_city_id,
          port_of_loading_id,
          port_of_loading_text,
          port_of_discharge_id,
          resolvedStatusId,
          resolvedStatusText,
          userId,
          id,
          companyId,
        ]
      );

      // Replace items (safe because Draft-only edit)
      await client.query('DELETE FROM purchase_order_items WHERE order_id = $1', [id]);

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const lineTotal = (item.quantity || 0) * (item.unit_price || 0);
        const itemDiscount = item.discount_amount || (lineTotal * (item.discount_percent || 0) / 100);
        const itemTax = (lineTotal - itemDiscount) * (item.tax_rate || 0) / 100;

        await client.query(
          `
          INSERT INTO purchase_order_items (
            order_id, line_number, item_id, item_code, item_name, item_name_ar,
            uom_id, ordered_qty, unit_price, discount_percent, discount_amount,
            tax_rate_id, tax_rate, tax_amount, line_total,
            warehouse_id, cost_center_id, expense_account_id, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        `,
          [
            id,
            i + 1,
            item.item_id,
            item.item_code,
            item.item_name,
            item.item_name_ar,
            item.uom_id,
            item.quantity,
            item.unit_price,
            item.discount_percent || 0,
            itemDiscount,
            item.tax_rate_id,
            item.tax_rate || 0,
            itemTax,
            lineTotal - itemDiscount + itemTax,
            item.warehouse_id || warehouse_id,
            item.cost_center_id || cost_center_id,
            item.expense_account_id,
            item.notes,
          ]
        );
      }

      await client.query('COMMIT');

      // ══════════════════════════════════════════════════════════════════
      // AUTO-SYNC: Update related shipments with the new PO data
      // This ensures vendor, project, currency, ports, items, etc. stay in sync
      // ══════════════════════════════════════════════════════════════════
      try {
        const syncResult = await syncPurchaseOrderToShipments(Number(id), companyId, userId);
        if (syncResult.shipmentsUpdated > 0) {
          logger.info(`PO ${id} sync: updated ${syncResult.shipmentsUpdated} shipments, ${syncResult.itemsUpdated} items`);
        }
        if (syncResult.errors.length > 0) {
          logger.warn(`PO ${id} sync warnings:`, syncResult.errors);
        }
      } catch (syncError) {
        // Non-blocking - log but don't fail the PO update
        logger.error(`Failed to sync PO ${id} to shipments:`, syncError);
      }

      logger.info('Purchase order updated', { orderId: id, userId });
      return res.json({ success: true, data: updateRes.rows[0] });
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error updating purchase order:', error);
      return res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: 'Failed to update purchase order' } });
    } finally {
      client.release();
    }
  }
);

// PUT /api/procurement/purchase-orders/:id/approve - Approve PO
router.put('/:id/approve', requirePermission('purchase_orders:approve'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const { id } = req.params;

    // Get approved status
    const approvedStatus = await pool.query(
      'SELECT id FROM purchase_order_statuses WHERE company_id = $1 AND code = $2 AND deleted_at IS NULL',
      [companyId, 'APPROVED']
    );

    if (approvedStatus.rows.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'CONFIG_ERROR', message: 'Approved status not configured' } });
    }

    // Check current status allows approval
    const currentPO = await pool.query(`
      SELECT po.*, pos.allows_edit
      FROM purchase_orders po
      LEFT JOIN purchase_order_statuses pos ON po.status_id = pos.id
      WHERE po.id = $1 AND po.company_id = $2 AND po.deleted_at IS NULL
    `, [id, companyId]);

    if (currentPO.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Purchase order not found' } });
    }

    if (currentPO.rows[0].status === 'approved') {
      return res.status(400).json({ success: false, error: { code: 'ALREADY_APPROVED', message: 'PO is already approved' } });
    }

    const po = currentPO.rows[0];

    // ═══════════════════════════════════════════════════
    // BUSINESS RULE: Require project_id for approval
    // ═══════════════════════════════════════════════════
    if (!po.project_id) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'PROJECT_REQUIRED',
          message: 'Purchase order must have a project assigned before approval'
        }
      });
    }

    // Check if approval is required
    const approvalCheck = await checkNeedsApproval(
      companyId,
      'purchase_orders',
      parseFloat(po.total_amount)
    );

    if (approvalCheck.needsApproval) {
      // Check if already approved through approval matrix
      const isApproved = await isDocumentApproved('purchase_orders', parseInt(id));
      
      if (!isApproved) {
        // Create approval request if not exists
        const existingApproval = await pool.query(
          `SELECT id FROM approval_requests 
           WHERE document_type = 'purchase_order' AND document_id = $1 
           AND company_id = $2 AND status = 'pending' AND deleted_at IS NULL`,
          [id, companyId]
        );

        if (existingApproval.rows.length === 0) {
          await createApprovalRequest(
            companyId,
            approvalCheck.workflowId!,
            'purchase_order',
            parseInt(id),
            po.po_number,
            parseFloat(po.total_amount),
            userId,
            'Auto-generated approval request on approval attempt'
          );
        }

        return res.status(403).json({
          success: false,
          error: {
            code: 'APPROVAL_REQUIRED',
            message: 'Approval from approval matrix required before PO approval',
            message_ar: 'مطلوب اعتماد من مصفوفة الاعتمادات قبل اعتماد أمر الشراء',
            approval_required: true,
            workflow_name: approvalCheck.workflowName,
            required_role: approvalCheck.approvalRole
          }
        });
      }
    }

    const result = await pool.query(`
      UPDATE purchase_orders 
      SET status_id = $1, status = 'approved', approved_by = $2, approved_at = CURRENT_TIMESTAMP, updated_by = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND company_id = $4 AND deleted_at IS NULL
      RETURNING *
    `, [approvedStatus.rows[0].id, userId, id, companyId]);

    logger.info('Purchase order approved', { orderId: id, userId });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error('Error approving PO:', error);
    res.status(500).json({ success: false, error: { code: 'APPROVE_ERROR', message: 'Failed to approve purchase order' } });
  }
});

// POST /api/procurement/purchase-orders/:id/receive - Receive goods
router.post('/:id/receive', requirePermission('purchase_orders:receive'), async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const { items } = req.body; // Array of { po_item_id, quantity_received }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Items required' } });
    }

    await client.query('BEGIN');

    // Get PO details
    const poResult = await client.query(`
      SELECT po.*, pos.allows_receive
      FROM purchase_orders po
      LEFT JOIN purchase_order_statuses pos ON po.status_id = pos.id
      WHERE po.id = $1 AND po.company_id = $2 AND po.deleted_at IS NULL
    `, [id, companyId]);

    if (poResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Purchase order not found' } });
    }

    const po = poResult.rows[0];
    if (!po.allows_receive) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: { code: 'RECEIVE_NOT_ALLOWED', message: 'PO status does not allow receiving' } });
    }

    // Update received quantities
    let allFullyReceived = true;
    for (const item of items) {
      const updateResult = await client.query(`
        UPDATE purchase_order_items 
        SET received_quantity = COALESCE(received_quantity, 0) + $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2 AND order_id = $3
        RETURNING quantity, received_quantity
      `, [item.quantity_received, item.po_item_id, id]);

      if (updateResult.rows.length > 0) {
        const { quantity, received_quantity } = updateResult.rows[0];
        if (received_quantity < quantity) {
          allFullyReceived = false;
        }
      }
    }

    // Update PO status
    const newStatus = allFullyReceived ? 'fully_received' : 'partially_received';
    await client.query(`
      UPDATE purchase_orders 
      SET status = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [newStatus, userId, id]);

    await client.query('COMMIT');

    logger.info('Goods received', { orderId: id, items: items.length, status: newStatus, userId });
    res.json({ 
      success: true, 
      message: 'Goods received successfully',
      new_status: newStatus
    });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error receiving goods:', error);
    res.status(500).json({ success: false, error: { code: 'RECEIVE_ERROR', message: 'Failed to receive goods' } });
  } finally {
    client.release();
  }
});

// POST /api/procurement/purchase-orders/:id/cancel - Cancel PO
router.post('/:id/cancel', requirePermission('purchase_orders:cancel'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const { id } = req.params;

    // Check PO not already received
    const currentPO = await pool.query(`
      SELECT po.status
      FROM purchase_orders po
      WHERE po.id = $1 AND po.company_id = $2 AND po.deleted_at IS NULL
    `, [id, companyId]);

    if (currentPO.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Purchase order not found' } });
    }

    if (['fully_received', 'closed', 'cancelled'].includes(currentPO.rows[0].status)) {
      return res.status(400).json({ success: false, error: { code: 'CANCEL_NOT_ALLOWED', message: 'Cannot cancel PO in this status' } });
    }

    const result = await pool.query(`
      UPDATE purchase_orders 
      SET status = 'cancelled', updated_by = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND company_id = $3 AND deleted_at IS NULL
      RETURNING *
    `, [userId, id, companyId]);

    logger.info('Purchase order cancelled', { orderId: id, userId });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error('Error cancelling PO:', error);
    res.status(500).json({ success: false, error: { code: 'CANCEL_ERROR', message: 'Failed to cancel purchase order' } });
  }
});

// DELETE /api/procurement/purchase-orders/:id - Soft delete (only if Draft)
router.delete('/:id', requirePermission('purchase_orders:delete'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const userId = (req as any).user?.id;
    const userRoles: string[] = Array.isArray((req as any).user?.roles) ? (req as any).user.roles : [];
    const isSuperAdmin = userRoles.includes('super_admin');
    const isAdmin = userRoles.includes('admin');
    const { id } = req.params;

    // Check if purchase order exists
    const currentPO = await pool.query(`
      SELECT
        po.*,
        pos.code as status_code,
        pos.allows_delete
      FROM purchase_orders po
      LEFT JOIN purchase_order_statuses pos ON po.status_id = pos.id
      WHERE po.id = $1 AND po.company_id = $2 AND po.deleted_at IS NULL
    `, [id, companyId]);

    if (currentPO.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Purchase order not found' } });
    }

    const statusCode = String(currentPO.rows[0].status_code || currentPO.rows[0].status || '').toLowerCase();
    const canSoftDelete = ['draft', 'pending_approval'].includes(statusCode);

    // Super admin and admin can delete any purchase order regardless of status
    if (!isSuperAdmin && !isAdmin) {
      // For other users, check status
      if (!canSoftDelete) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'DELETE_NOT_ALLOWED',
            message: 'Cannot delete purchase order unless it is in Draft or Pending Approval status'
          }
        });
      }

      const allowsDeleteEffective =
        currentPO.rows[0].allows_delete === true ||
        (currentPO.rows[0].allows_delete == null && canSoftDelete);

      if (!allowsDeleteEffective) {
        return res.status(400).json({ success: false, error: { code: 'DELETE_NOT_ALLOWED', message: 'Cannot delete PO in this status' } });
      }
    }

    // For super_admin and admin, bypass the constraint by setting deleted_at directly
    // without triggering the check constraint
    const result = await pool.query(
      'UPDATE purchase_orders SET deleted_at = CURRENT_TIMESTAMP, updated_by = $1 WHERE id = $2 AND company_id = $3 RETURNING id',
      [userId, id, companyId]
    );

    logger.info('Purchase order deleted', { orderId: id, userId, userRoles, bypassedConstraint: isSuperAdmin || isAdmin });
    res.json({ success: true, message: 'Purchase order deleted successfully' });
  } catch (error: any) {
    // Database constraint error - only applies to non-admin users
    if (error?.code === '23514' && error?.constraint === 'prevent_delete_received_po') {
      const userRoles: string[] = Array.isArray((req as any).user?.roles) ? (req as any).user.roles : [];
      const isSuperAdmin = userRoles.includes('super_admin');
      const isAdmin = userRoles.includes('admin');
      
      // If super_admin or admin hit this, log but don't reject (shouldn't happen)
      if (isSuperAdmin || isAdmin) {
        logger.warn('Super admin or admin hit constraint, this should not happen', { error });
      }
      
      return res.status(400).json({
        success: false,
        error: {
          code: 'DELETE_NOT_ALLOWED',
          message: 'Cannot delete purchase order unless it is in Draft or Pending Approval status'
        }
      });
    }

    logger.error('Error deleting PO:', error);
    res.status(500).json({ success: false, error: { code: 'DELETE_ERROR', message: 'Failed to delete purchase order' } });
  }
});

export default router;
