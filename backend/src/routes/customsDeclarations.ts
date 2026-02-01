import { Router, Request, Response } from 'express';
import { z } from 'zod';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { loadCompanyContext } from '../middleware/companyContext';
import { requirePermission } from '../middleware/rbac';
import { auditLog, captureBeforeState } from '../middleware/auditLog';
import logger from '../utils/logger';
import { DocumentNumberService } from '../services/documentNumberService';

const router = Router();

router.use(authenticate);
router.use(loadCompanyContext);

function parsePagination(query: any) {
  const page = Math.max(1, parseInt(String(query.page ?? '1'), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit ?? '20'), 10) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function getCompanyId(req: Request): number {
  const companyId = (req as any).companyId ?? (req as any).companyContext?.companyId;
  if (!companyId) {
    throw new Error('Company context required');
  }
  return Number(companyId);
}

async function resolveStatusIdByCode(companyId: number, code: string): Promise<number | null> {
  const result = await pool.query(
    `SELECT id
     FROM customs_declaration_statuses
     WHERE deleted_at IS NULL
       AND UPPER(code) = UPPER($2)
       AND (company_id = $1 OR company_id IS NULL)
     ORDER BY (company_id IS NULL) ASC, id ASC
     LIMIT 1`,
    [companyId, code]
  );
  return result.rows[0]?.id ?? null;
}

async function resolveInitialStatusId(companyId: number): Promise<number> {
  const result = await pool.query(
    `SELECT id
     FROM customs_declaration_statuses
     WHERE deleted_at IS NULL
       AND is_initial = TRUE
       AND (company_id = $1 OR company_id IS NULL)
     ORDER BY (company_id IS NULL) ASC, stage_order ASC
     LIMIT 1`,
    [companyId]
  );

  const id = result.rows[0]?.id;
  if (!id) {
    throw new Error('No initial customs declaration status configured');
  }
  return id;
}

async function ensureDeclarationCompany(companyId: number, declarationId: number) {
  const result = await pool.query(
    `SELECT id, company_id, status_id
     FROM customs_declarations
     WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
    [declarationId, companyId]
  );
  return result.rows[0] as { id: number; company_id: number; status_id: number } | undefined;
}

async function recalcDeclarationTotals(client: any, companyId: number, declarationId: number) {
  const sums = await client.query(
    `SELECT
       COALESCE(SUM(COALESCE(cif_value, 0)), 0)::numeric AS total_cif_value,
       COALESCE(SUM(COALESCE(fob_value, 0)), 0)::numeric AS total_fob_value,
       COALESCE(SUM(COALESCE(freight_value, 0)), 0)::numeric AS freight_value,
       COALESCE(SUM(COALESCE(insurance_value, 0)), 0)::numeric AS insurance_value,
       COALESCE(SUM(COALESCE(duty_amount, 0)), 0)::numeric AS total_customs_duty,
       COALESCE(SUM(COALESCE(vat_amount, 0)), 0)::numeric AS total_vat,
       COALESCE(SUM(COALESCE(other_fees, 0)), 0)::numeric AS total_other_fees,
       COALESCE(SUM(COALESCE(total_fees, 0)), 0)::numeric AS total_fees,
       COALESCE(SUM(COALESCE(gross_weight, 0)), 0)::numeric AS total_gross_weight,
       COALESCE(SUM(COALESCE(net_weight, 0)), 0)::numeric AS total_net_weight,
       COALESCE(SUM(COALESCE(packages, 0)), 0)::int AS total_packages
     FROM customs_declaration_items
     WHERE company_id = $1 AND declaration_id = $2`,
    [companyId, declarationId]
  );

  const s = sums.rows[0] || {};

  await client.query(
    `UPDATE customs_declarations
     SET
       total_cif_value = $3,
       total_fob_value = $4,
       freight_value = $5,
       insurance_value = $6,
       total_customs_duty = $7,
       total_vat = $8,
       total_other_fees = $9,
       total_fees = $10,
       total_gross_weight = $11,
       total_net_weight = $12,
       total_packages = $13,
       updated_at = NOW()
     WHERE company_id = $1 AND id = $2 AND deleted_at IS NULL`,
    [
      companyId,
      declarationId,
      s.total_cif_value,
      s.total_fob_value,
      s.freight_value,
      s.insurance_value,
      s.total_customs_duty,
      s.total_vat,
      s.total_other_fees,
      s.total_fees,
      s.total_gross_weight,
      s.total_net_weight,
      s.total_packages,
    ]
  );
}

// =====================================================
// Meta endpoints
// =====================================================

router.get('/types', requirePermission('customs_declarations:view'), async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);

    const result = await pool.query(
      `SELECT DISTINCT ON (code)
         id, company_id, code, name_en, name_ar, description_en, description_ar,
         direction, requires_inspection, is_active, sort_order
       FROM customs_declaration_types
       WHERE deleted_at IS NULL
         AND is_active = TRUE
         AND (company_id = $1 OR company_id IS NULL)
       ORDER BY code, (company_id IS NULL) ASC, sort_order ASC, id ASC`,
      [companyId]
    );

    res.json({ success: true, data: result.rows, total: result.rowCount });
  } catch (error) {
    logger.error('Error fetching customs declaration types:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch customs declaration types' } });
  }
});

router.get('/statuses', requirePermission('customs_declarations:view'), async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);

    const result = await pool.query(
      `SELECT DISTINCT ON (code)
         id, company_id, code, name_en, name_ar,
         stage_order, is_initial, is_final, color, is_active
       FROM customs_declaration_statuses
       WHERE deleted_at IS NULL
         AND is_active = TRUE
         AND (company_id = $1 OR company_id IS NULL)
       ORDER BY code, (company_id IS NULL) ASC, stage_order ASC, id ASC`,
      [companyId]
    );

    res.json({ success: true, data: result.rows, total: result.rowCount });
  } catch (error) {
    logger.error('Error fetching customs declaration statuses:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch customs declaration statuses' } });
  }
});

// =====================================================
// List
// =====================================================

router.get('/', requirePermission('customs_declarations:view'), async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const { page, limit, offset } = parsePagination(req.query);

    const search = (req.query.search as string | undefined)?.trim();
    const statusId = req.query.status_id ? Number(req.query.status_id) : undefined;
    const typeId = req.query.declaration_type_id ? Number(req.query.declaration_type_id) : undefined;
    const direction = (req.query.direction as string | undefined)?.trim();
    const dateFrom = (req.query.date_from as string | undefined)?.trim();
    const dateTo = (req.query.date_to as string | undefined)?.trim();
    const shipmentId = req.query.shipment_id ? Number(req.query.shipment_id) : undefined;
    const projectId = req.query.project_id ? Number(req.query.project_id) : undefined;
    const originCountryId = req.query.origin_country_id ? Number(req.query.origin_country_id) : undefined;

    const where: string[] = ['cd.company_id = $1', 'cd.deleted_at IS NULL'];
    const params: any[] = [companyId];
    let paramIndex = 2;

    if (search) {
      where.push(
        `(cd.declaration_number ILIKE $${paramIndex}
          OR cd.customs_office_name ILIKE $${paramIndex}
          OR cd.bl_number ILIKE $${paramIndex}
          OR cd.awb_number ILIKE $${paramIndex})`
      );
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (statusId) {
      where.push(`cd.status_id = $${paramIndex}`);
      params.push(statusId);
      paramIndex++;
    }

    if (typeId) {
      where.push(`cd.declaration_type_id = $${paramIndex}`);
      params.push(typeId);
      paramIndex++;
    }

    if (direction) {
      where.push(`dt.direction = $${paramIndex}`);
      params.push(direction);
      paramIndex++;
    }

    if (dateFrom) {
      where.push(`cd.declaration_date >= $${paramIndex}`);
      params.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      where.push(`cd.declaration_date <= $${paramIndex}`);
      params.push(dateTo);
      paramIndex++;
    }

    if (shipmentId) {
      where.push(`cd.shipment_id = $${paramIndex}`);
      params.push(shipmentId);
      paramIndex++;
    }

    if (projectId) {
      where.push(`cd.project_id = $${paramIndex}`);
      params.push(projectId);
      paramIndex++;
    }

    if (originCountryId) {
      where.push(`cd.origin_country_id = $${paramIndex}`);
      params.push(originCountryId);
      paramIndex++;
    }

    const whereSql = `WHERE ${where.join(' AND ')}`;

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM customs_declarations cd
       LEFT JOIN customs_declaration_types dt ON dt.id = cd.declaration_type_id
       ${whereSql}`,
      params
    );

    const total = countResult.rows[0]?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const listResult = await pool.query(
      `SELECT
         cd.id,
         cd.company_id,
         cd.declaration_number,
         cd.declaration_date,
         cd.submission_date,
         cd.clearance_date,

         cd.declaration_type_id,
         dt.code AS declaration_type_code,
         dt.name_en AS declaration_type_name_en,
         dt.name_ar AS declaration_type_name_ar,
         dt.direction AS declaration_direction,

         cd.status_id,
         ds.code AS status_code,
         ds.name_en AS status_name_en,
         ds.name_ar AS status_name_ar,
         ds.color AS status_color,
         ds.stage_order AS status_stage_order,

         cd.shipment_id,
         s.shipment_number,
         cd.purchase_order_id,
         po.order_number AS purchase_order_number,
         cd.commercial_invoice_id,
         pi.invoice_number AS commercial_invoice_number,
         cd.project_id,
         p.name AS project_name,

         cd.customs_office_name,
         cd.entry_point_name,
         cd.transport_mode,
         cd.bl_number,
         cd.awb_number,

         cd.origin_country_id,
         oc.name AS origin_country_name,

         cd.currency_id,
         c.code AS currency_code,
         cd.exchange_rate,

         cd.total_cif_value,
         cd.total_fob_value,
         cd.total_fees,

         cd.total_gross_weight,
         cd.total_net_weight,
         cd.total_packages,

         cd.created_at,
         cd.updated_at
       FROM customs_declarations cd
       LEFT JOIN customs_declaration_types dt ON dt.id = cd.declaration_type_id
       LEFT JOIN customs_declaration_statuses ds ON ds.id = cd.status_id
       LEFT JOIN logistics_shipments s ON s.id = cd.shipment_id
       LEFT JOIN purchase_orders po ON po.id = cd.purchase_order_id
       LEFT JOIN purchase_invoices pi ON pi.id = cd.commercial_invoice_id
       LEFT JOIN projects p ON p.id = cd.project_id
       LEFT JOIN currencies c ON c.id = cd.currency_id
       LEFT JOIN countries oc ON oc.id = cd.origin_country_id
       ${whereSql}
       ORDER BY cd.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    res.json({
      success: true,
      data: listResult.rows,
      total,
      page,
      limit,
      totalPages,
    });
  } catch (error) {
    logger.error('Error fetching customs declarations:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch customs declarations' } });
  }
});

// =====================================================
// Detail
// =====================================================

router.get('/:id', requirePermission('customs_declarations:view'), async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const declarationId = Number(req.params.id);

    const declarationResult = await pool.query(
      `SELECT
         cd.*,
         dt.code AS declaration_type_code,
         dt.name_en AS declaration_type_name_en,
         dt.name_ar AS declaration_type_name_ar,
         dt.direction AS declaration_direction,
         ds.code AS status_code,
         ds.name_en AS status_name_en,
         ds.name_ar AS status_name_ar,
         ds.color AS status_color,
         c.code AS currency_code,
         c.symbol AS currency_symbol,
         s.shipment_number,
         po.order_number AS purchase_order_number,
         pi.invoice_number AS commercial_invoice_number,
         p.name AS project_name,
         oc.name AS origin_country_name,
         dc.name AS destination_country_name,
         pt.name AS port_name,
         pt.name_ar AS port_name_ar,
         pt.code AS port_code
       FROM customs_declarations cd
       LEFT JOIN customs_declaration_types dt ON dt.id = cd.declaration_type_id
       LEFT JOIN customs_declaration_statuses ds ON ds.id = cd.status_id
       LEFT JOIN currencies c ON c.id = cd.currency_id
       LEFT JOIN logistics_shipments s ON s.id = cd.shipment_id
       LEFT JOIN purchase_orders po ON po.id = cd.purchase_order_id
       LEFT JOIN purchase_invoices pi ON pi.id = cd.commercial_invoice_id
       LEFT JOIN projects p ON p.id = cd.project_id
       LEFT JOIN countries oc ON oc.id = cd.origin_country_id
       LEFT JOIN countries dc ON dc.id = cd.destination_country_id
       LEFT JOIN ports pt ON pt.id = cd.port_id
       WHERE cd.id = $1 AND cd.company_id = $2 AND cd.deleted_at IS NULL`,
      [declarationId, companyId]
    );

    if (declarationResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Customs declaration not found' } });
    }

    const declaration = declarationResult.rows[0];

    const [parties, items, containers, fees, inspections, payments, attachments, history] = await Promise.all([
      pool.query(
        `SELECT p.*, c.name AS country_name
         FROM customs_declaration_parties p
         LEFT JOIN countries c ON c.id = p.country_id
         WHERE p.company_id = $1 AND p.declaration_id = $2
         ORDER BY p.is_primary DESC, p.id ASC`,
        [companyId, declarationId]
      ),
      pool.query(
        `SELECT i.*,
                it.code AS item_code_resolved,
                COALESCE(NULLIF(i.item_description, ''), NULLIF(it.name, ''), NULLIF(it.code, '')) AS item_description_resolved,
                u.code AS unit_code,
                u.name AS unit_name,
                c.name AS origin_country_name
         FROM customs_declaration_items i
         LEFT JOIN items it ON it.id = i.item_id
         LEFT JOIN units_of_measure u ON u.id = i.unit_id
         LEFT JOIN countries c ON c.id = i.origin_country_id
         WHERE i.company_id = $1 AND i.declaration_id = $2
         ORDER BY i.line_number ASC`,
        [companyId, declarationId]
      ),
      pool.query(
        `SELECT *
         FROM customs_declaration_containers
         WHERE company_id = $1 AND declaration_id = $2
         ORDER BY id ASC`,
        [companyId, declarationId]
      ),
      pool.query(
        `SELECT f.*
         FROM customs_declaration_fees f
         WHERE f.company_id = $1 AND f.declaration_id = $2
         ORDER BY f.id ASC`,
        [companyId, declarationId]
      ),
      pool.query(
        `SELECT *
         FROM customs_declaration_inspections
         WHERE company_id = $1 AND declaration_id = $2
         ORDER BY inspection_date DESC, id DESC`,
        [companyId, declarationId]
      ),
      pool.query(
        `SELECT p.*, c.code AS currency_code
         FROM customs_declaration_payments p
         LEFT JOIN currencies c ON c.id = p.currency_id
         WHERE p.company_id = $1 AND p.declaration_id = $2
         ORDER BY payment_date DESC, id DESC`,
        [companyId, declarationId]
      ),
      pool.query(
        `SELECT *
         FROM customs_declaration_attachments
         WHERE company_id = $1 AND declaration_id = $2
         ORDER BY created_at DESC, id DESC`,
        [companyId, declarationId]
      ),
      pool.query(
        `SELECT h.*, u.full_name AS performed_by_name, u.email AS performed_by_email
         FROM customs_declaration_history h
         LEFT JOIN users u ON u.id = h.performed_by
         WHERE h.company_id = $1 AND h.declaration_id = $2
         ORDER BY h.performed_at DESC, h.id DESC`,
        [companyId, declarationId]
      ),
    ]);

    res.json({
      success: true,
      data: {
        ...declaration,
        parties: parties.rows,
        items: items.rows,
        containers: containers.rows,
        fees: fees.rows,
        inspections: inspections.rows,
        payments: payments.rows,
        attachments: attachments.rows,
        history: history.rows,
      },
    });
  } catch (error: any) {
    console.error('Error fetching customs declaration details:', error);
    logger.error('Error fetching customs declaration details:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: error?.message || 'Failed to fetch customs declaration details' } });
  }
});

// =====================================================
// Create / Update / Delete
// =====================================================

const createSchema = z.object({
  declaration_type_id: z.number().int().positive(),
  status_id: z.number().int().positive().optional().nullable(),
  declaration_date: z.string().min(1),

  shipment_id: z.number().int().positive().optional().nullable(),
  purchase_order_id: z.number().int().positive().optional().nullable(),
  commercial_invoice_id: z.number().int().positive().optional().nullable(),
  project_id: z.number().int().positive().optional().nullable(),

  customs_office_code: z.string().max(30).optional().nullable(),
  customs_office_name: z.string().max(255).optional().nullable(),
  entry_point_code: z.string().max(30).optional().nullable(),
  entry_point_name: z.string().max(255).optional().nullable(),

  transport_mode: z.string().max(30).optional().nullable(),
  vessel_name: z.string().max(255).optional().nullable(),
  voyage_number: z.string().max(60).optional().nullable(),
  bl_number: z.string().max(60).optional().nullable(),
  awb_number: z.string().max(60).optional().nullable(),
  manifest_number: z.string().max(60).optional().nullable(),

  origin_country_id: z.number().int().positive().optional().nullable(),
  destination_country_id: z.number().int().positive().optional().nullable(),
  final_destination: z.string().max(255).optional().nullable(),

  incoterm: z.string().max(20).optional().nullable(),

  currency_id: z.number().int().positive(),
  exchange_rate: z.number().positive().optional().nullable(),

  freight_value: z.number().nonnegative().optional().nullable(),
  insurance_value: z.number().nonnegative().optional().nullable(),
  other_charges: z.number().nonnegative().optional().nullable(),

  package_type: z.string().max(50).optional().nullable(),

  notes: z.string().optional().nullable(),
  internal_notes: z.string().optional().nullable(),
});

const updateSchema = createSchema.partial();

router.post('/', requirePermission('customs_declarations:create'), auditLog, async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const companyId = getCompanyId(req);
    const userId = (req as any).user?.id;

    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
    }

    await client.query('BEGIN');

    const v = parsed.data;
    // Use provided status_id or resolve initial status
    const statusId = v.status_id ?? await resolveInitialStatusId(companyId);

    // Generate number (falls back to safe prefix if service ever fails)
    let declarationNumber: string;
    try {
      const generated = await DocumentNumberService.generateNumber(companyId, 'customs_declaration' as any);
      declarationNumber = generated.number;
    } catch (e) {
      declarationNumber = `CD-${new Date().getFullYear()}-${Date.now()}`;
    }

    const insertResult = await client.query(
      `INSERT INTO customs_declarations (
         company_id,
         declaration_number,
         declaration_type_id,
         status_id,
         declaration_date,
         shipment_id,
         purchase_order_id,
         commercial_invoice_id,
         project_id,
         customs_office_code,
         customs_office_name,
         entry_point_code,
         entry_point_name,
         transport_mode,
         vessel_name,
         voyage_number,
         bl_number,
         awb_number,
         manifest_number,
         origin_country_id,
         destination_country_id,
         final_destination,
         incoterm,
         currency_id,
         exchange_rate,
         freight_value,
         insurance_value,
         other_charges,
         package_type,
         notes,
         internal_notes,
         created_by,
         updated_by
       ) VALUES (
         $1,$2,$3,$4,$5,
         $6,$7,$8,$9,
         $10,$11,$12,$13,
         $14,$15,$16,$17,$18,$19,
         $20,$21,$22,
         $23,
         $24,$25,
         $26,$27,$28,
         $29,
         $30,$31,
         $32,$33
       ) RETURNING *`,
      [
        companyId,
        declarationNumber,
        v.declaration_type_id,
        statusId,
        v.declaration_date,
        v.shipment_id ?? null,
        v.purchase_order_id ?? null,
        v.commercial_invoice_id ?? null,
        v.project_id ?? null,
        v.customs_office_code ?? null,
        v.customs_office_name ?? null,
        v.entry_point_code ?? null,
        v.entry_point_name ?? null,
        v.transport_mode ?? null,
        v.vessel_name ?? null,
        v.voyage_number ?? null,
        v.bl_number ?? null,
        v.awb_number ?? null,
        v.manifest_number ?? null,
        v.origin_country_id ?? null,
        v.destination_country_id ?? null,
        v.final_destination ?? null,
        v.incoterm ?? null,
        v.currency_id,
        v.exchange_rate ?? 1,
        v.freight_value ?? 0,
        v.insurance_value ?? 0,
        v.other_charges ?? 0,
        v.package_type ?? null,
        v.notes ?? null,
        v.internal_notes ?? null,
        userId ?? null,
        userId ?? null,
      ]
    );

    const declarationId = insertResult.rows[0].id;
    const newDeclaration = insertResult.rows[0];

    await client.query(
      `INSERT INTO customs_declaration_history (
         company_id, declaration_id, action,
         old_status_id, new_status_id,
         notes, performed_by, performed_at, ip_address
       ) VALUES ($1,$2,'create',NULL,$3,$4,$5,NOW(),$6)`,
      [companyId, declarationId, statusId, null, userId ?? null, req.ip]
    );

    // =====================================================
    // SYNC: Auto-create shipment expense 8005 if shipment_id provided
    // =====================================================
    if (v.shipment_id && (newDeclaration.total_fees > 0 || newDeclaration.total_customs_duty > 0)) {
      // Check if expense 8005 already exists for this shipment
      const existingExpense = await client.query(`
        SELECT id FROM shipment_expenses 
        WHERE shipment_id = $1 AND company_id = $2 
          AND expense_type_code = '8005' AND deleted_at IS NULL
        LIMIT 1
      `, [v.shipment_id, companyId]);
      
      if (existingExpense.rows.length === 0) {
        // Get expense type 8005
        const expenseTypeResult = await client.query(`
          SELECT id, code, name, analytic_account_code, default_vat_rate
          FROM shipment_expense_types WHERE code = '8005' LIMIT 1
        `);
        
        if (expenseTypeResult.rows.length > 0) {
          const expenseType = expenseTypeResult.rows[0];
          const customsDuty = parseFloat(newDeclaration.total_customs_duty) || 0;
          const vatAmount = parseFloat(newDeclaration.total_vat) || 0;
          const totalAmount = customsDuty + vatAmount;
          
          // Get shipment details for project_id and bl_no
          const shipmentInfo = await client.query(`
            SELECT project_id, bl_no FROM logistics_shipments WHERE id = $1 AND company_id = $2
          `, [v.shipment_id, companyId]);
          const shipmentData = shipmentInfo.rows[0];
          
          await client.query(`
            INSERT INTO shipment_expenses (
              company_id, shipment_id, project_id,
              expense_type_id, expense_type_code, expense_type_name, analytic_account_code,
              amount_before_vat, vat_rate, vat_amount, total_amount,
              currency_id, exchange_rate,
              amount_in_base_currency, vat_in_base_currency, total_in_base_currency,
              bl_number, customs_declaration_id, customs_declaration_number,
              declaration_date,
              notes, expense_date, approval_status,
              created_by, created_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, 'draft', $23, NOW()
            )
          `, [
            companyId, v.shipment_id, shipmentData?.project_id || null,
            expenseType.id, expenseType.code, expenseType.name, expenseType.analytic_account_code,
            customsDuty, expenseType.default_vat_rate || 15, vatAmount, totalAmount,
            v.currency_id, v.exchange_rate || 1,
            totalAmount, vatAmount, totalAmount,
            shipmentData?.bl_no || newDeclaration.bl_number,
            declarationId, newDeclaration.declaration_number,
            newDeclaration.declaration_date,
            `Auto-created from customs declaration ${newDeclaration.declaration_number}`,
            newDeclaration.declaration_date || new Date().toISOString().split('T')[0],
            userId
          ]);
          
          console.log(`Auto-created shipment expense 8005 from customs declaration ${newDeclaration.declaration_number}`);
        }
      }
    }

    await client.query('COMMIT');

    res.status(201).json({ success: true, data: insertResult.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error creating customs declaration:', error);
    res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: 'Failed to create customs declaration' } });
  } finally {
    client.release();
  }
});

router.put('/:id', requirePermission('customs_declarations:update'), auditLog, async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const companyId = getCompanyId(req);
    const userId = (req as any).user?.id;
    const declarationId = Number(req.params.id);

    await captureBeforeState(req as any, 'customs_declarations', declarationId);

    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
    }

    const v = parsed.data;

    await client.query('BEGIN');

    const exists = await client.query(
      `SELECT id FROM customs_declarations WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
      [declarationId, companyId]
    );

    if (exists.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Customs declaration not found' } });
    }

    const fields: string[] = [];
    const values: any[] = [companyId, declarationId];
    let idx = 3;

    const set = (name: string, value: any) => {
      fields.push(`${name} = $${idx}`);
      values.push(value);
      idx++;
    };

    for (const [key, value] of Object.entries(v)) {
      set(key, value === undefined ? null : value);
    }

    set('updated_by', userId ?? null);
    fields.push('updated_at = NOW()');

    const updateResult = await client.query(
      `UPDATE customs_declarations
       SET ${fields.join(', ')}
       WHERE company_id = $1 AND id = $2 AND deleted_at IS NULL
       RETURNING *`,
      values
    );

    await client.query(
      `INSERT INTO customs_declaration_history (
         company_id, declaration_id, action,
         old_status_id, new_status_id,
         notes, performed_by, performed_at, ip_address
       ) VALUES ($1,$2,'update',NULL,NULL,$3,$4,NOW(),$5)`,
      [companyId, declarationId, null, userId ?? null, req.ip]
    );

    // =====================================================
    // SYNC: Update linked shipment expense if exists
    // =====================================================
    const updatedDeclaration = updateResult.rows[0];
    
    // Calculate total amount for expense (customs_duty + vat)
    const customsDuty = parseFloat(updatedDeclaration.total_customs_duty) || 0;
    const vatAmount = parseFloat(updatedDeclaration.total_vat) || 0;
    const handlingFees = parseFloat(updatedDeclaration.handling_fees) || 0;
    const groundFees = parseFloat(updatedDeclaration.ground_fees) || 0;
    const otherCharges = parseFloat(updatedDeclaration.other_charges) || 0;
    const exchangeRate = parseFloat(updatedDeclaration.exchange_rate) || 1;
    
    // Total before VAT = customs_duty + handling + ground + other charges
    const amountBeforeVat = customsDuty + handlingFees + groundFees + otherCharges;
    const totalAmount = amountBeforeVat + vatAmount;
    
    // Calculate in base currency
    const amountInBaseCurrency = amountBeforeVat * exchangeRate;
    const vatInBaseCurrency = vatAmount * exchangeRate;
    const totalInBaseCurrency = totalAmount * exchangeRate;
    
    // Update existing expense linked to this declaration
    await client.query(`
      UPDATE shipment_expenses
      SET 
        customs_declaration_number = $1,
        declaration_date = $2,
        port_id = $3,
        currency_id = COALESCE($4, currency_id),
        exchange_rate = $5,
        amount_before_vat = $6,
        vat_amount = $7,
        total_amount = $8,
        amount_in_base_currency = $9,
        vat_in_base_currency = $10,
        total_in_base_currency = $11,
        updated_at = NOW(),
        updated_by = $12
      WHERE customs_declaration_id = $13 AND company_id = $14 AND deleted_at IS NULL
    `, [
      updatedDeclaration.declaration_number, 
      updatedDeclaration.declaration_date,
      updatedDeclaration.port_id,
      updatedDeclaration.currency_id,
      exchangeRate,
      amountBeforeVat,
      vatAmount,
      totalAmount,
      amountInBaseCurrency,
      vatInBaseCurrency,
      totalInBaseCurrency,
      userId ?? null,
      declarationId, 
      companyId
    ]);
    
    console.log(`Synced shipment expense with customs declaration ${declarationId}`);

    await client.query('COMMIT');

    res.json({ success: true, data: updateResult.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error updating customs declaration:', error);
    res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: 'Failed to update customs declaration' } });
  } finally {
    client.release();
  }
});

router.delete('/:id', requirePermission('customs_declarations:delete'), auditLog, async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const companyId = getCompanyId(req);
    const userId = (req as any).user?.id;
    const declarationId = Number(req.params.id);

    await captureBeforeState(req as any, 'customs_declarations', declarationId);

    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE customs_declarations
       SET deleted_at = NOW(), updated_at = NOW(), updated_by = $3
       WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [declarationId, companyId, userId ?? null]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Customs declaration not found' } });
    }

    // SYNC: Also delete linked shipment expense 8005
    await client.query(`
      UPDATE shipment_expenses 
      SET deleted_at = NOW(), updated_by = $1, updated_at = NOW()
      WHERE customs_declaration_id = $2 AND company_id = $3 AND deleted_at IS NULL
    `, [userId ?? null, declarationId, companyId]);
    console.log(`Deleted linked shipment expense for customs declaration ${declarationId}`);

    await client.query(
      `INSERT INTO customs_declaration_history (
         company_id, declaration_id, action,
         old_status_id, new_status_id,
         notes, performed_by, performed_at, ip_address
       ) VALUES ($1,$2,'delete',NULL,NULL,$3,$4,NOW(),$5)`,
      [companyId, declarationId, null, userId ?? null, req.ip]
    );

    await client.query('COMMIT');

    res.json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error deleting customs declaration:', error);
    res.status(500).json({ success: false, error: { code: 'DELETE_ERROR', message: 'Failed to delete customs declaration' } });
  } finally {
    client.release();
  }
});

// =====================================================
// Workflow: set status
// =====================================================

const setStatusSchema = z.object({
  status_code: z.string().min(1).max(30),
  notes: z.string().optional().nullable(),
});

router.post('/:id/status', requirePermission('customs_declarations:change_status'), auditLog, async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const companyId = getCompanyId(req);
    const userId = (req as any).user?.id;
    const declarationId = Number(req.params.id);

    await captureBeforeState(req as any, 'customs_declarations', declarationId);

    const parsed = setStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
    }

    const newStatusId = await resolveStatusIdByCode(companyId, parsed.data.status_code);
    if (!newStatusId) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: 'Invalid status code' } });
    }

    await client.query('BEGIN');

    const current = await client.query(
      `SELECT status_id FROM customs_declarations WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
      [declarationId, companyId]
    );

    if (current.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Customs declaration not found' } });
    }

    const oldStatusId = current.rows[0].status_id as number;

    const updateFields: string[] = ['status_id = $3', 'updated_at = NOW()', 'updated_by = $4'];
    const updateParams: any[] = [declarationId, companyId, newStatusId, userId ?? null];

    // Auto-fill key workflow timestamps
    const codeUpper = parsed.data.status_code.toUpperCase();
    if (codeUpper === 'SUBMITTED') {
      updateFields.push('submitted_by = COALESCE(submitted_by, $4)');
      updateFields.push('submitted_at = COALESCE(submitted_at, NOW())');
      updateFields.push('submission_date = COALESCE(submission_date, CURRENT_DATE)');
    }
    if (codeUpper === 'CLEARED') {
      updateFields.push('approved_by = COALESCE(approved_by, $4)');
      updateFields.push('approved_at = COALESCE(approved_at, NOW())');
      updateFields.push('clearance_date = COALESCE(clearance_date, CURRENT_DATE)');
    }
    if (codeUpper === 'UNDER_REVIEW') {
      updateFields.push('reviewed_by = COALESCE(reviewed_by, $4)');
      updateFields.push('reviewed_at = COALESCE(reviewed_at, NOW())');
    }

    const updated = await client.query(
      `UPDATE customs_declarations
       SET ${updateFields.join(', ')}
       WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
       RETURNING *`,
      updateParams
    );

    await client.query(
      `INSERT INTO customs_declaration_history (
         company_id, declaration_id, action,
         old_status_id, new_status_id,
         notes, performed_by, performed_at, ip_address
       ) VALUES ($1,$2,'status_change',$3,$4,$5,$6,NOW(),$7)`,
      [companyId, declarationId, oldStatusId, newStatusId, parsed.data.notes ?? null, userId ?? null, req.ip]
    );

    await client.query('COMMIT');

    res.json({ success: true, data: updated.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error changing customs declaration status:', error);
    res.status(500).json({ success: false, error: { code: 'STATUS_CHANGE_ERROR', message: 'Failed to change status' } });
  } finally {
    client.release();
  }
});

// =====================================================
// Parties (bulk replace)
// =====================================================

const partySchema = z.object({
  party_type: z.string().min(1).max(30),
  party_name: z.string().min(1).max(255),
  party_name_ar: z.string().max(255).optional().nullable(),
  tax_number: z.string().max(50).optional().nullable(),
  commercial_register: z.string().max(50).optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  country_id: z.number().int().positive().optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  email: z.string().max(255).optional().nullable(),
  broker_license_number: z.string().max(50).optional().nullable(),
  is_primary: z.boolean().optional().default(false),
});

const replacePartiesSchema = z.object({
  parties: z.array(partySchema).default([]),
});

router.put('/:id/parties', requirePermission('customs_declarations:update'), auditLog, async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const companyId = getCompanyId(req);
    const userId = (req as any).user?.id;
    const declarationId = Number(req.params.id);

    const parsed = replacePartiesSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
    }

    const exists = await ensureDeclarationCompany(companyId, declarationId);
    if (!exists) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Customs declaration not found' } });
    }

    await client.query('BEGIN');

    await client.query(
      `DELETE FROM customs_declaration_parties
       WHERE company_id = $1 AND declaration_id = $2`,
      [companyId, declarationId]
    );

    for (const p of parsed.data.parties) {
      await client.query(
        `INSERT INTO customs_declaration_parties (
           company_id, declaration_id,
           party_type, party_name, party_name_ar,
           tax_number, commercial_register,
           address, city, country_id, phone, email,
           broker_license_number, is_primary,
           created_at, updated_at
         ) VALUES (
           $1,$2,
           $3,$4,$5,
           $6,$7,
           $8,$9,$10,$11,$12,
           $13,$14,
           NOW(), NOW()
         )`,
        [
          companyId,
          declarationId,
          p.party_type,
          p.party_name,
          p.party_name_ar ?? null,
          p.tax_number ?? null,
          p.commercial_register ?? null,
          p.address ?? null,
          p.city ?? null,
          p.country_id ?? null,
          p.phone ?? null,
          p.email ?? null,
          p.broker_license_number ?? null,
          p.is_primary ?? false,
        ]
      );
    }

    await client.query(
      `INSERT INTO customs_declaration_history (
         company_id, declaration_id, action,
         old_status_id, new_status_id,
         notes, performed_by, performed_at, ip_address
       ) VALUES ($1,$2,'update_parties',NULL,NULL,$3,$4,NOW(),$5)`,
      [companyId, declarationId, null, userId ?? null, req.ip]
    );

    await client.query('COMMIT');

    const refreshed = await pool.query(
      `SELECT p.*, c.name AS country_name
       FROM customs_declaration_parties p
       LEFT JOIN countries c ON c.id = p.country_id
       WHERE p.company_id = $1 AND p.declaration_id = $2
       ORDER BY p.is_primary DESC, p.id ASC`,
      [companyId, declarationId]
    );

    res.json({ success: true, data: refreshed.rows });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error replacing customs declaration parties:', error);
    res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: 'Failed to update parties' } });
  } finally {
    client.release();
  }
});

// =====================================================
// Items (bulk replace + totals recalc)
// =====================================================

const itemSchema = z.object({
  line_number: z.number().int().positive(),
  item_id: z.number().int().positive().optional().nullable(),
  item_code: z.string().max(50).optional().nullable(),
  item_description: z.string().min(1).max(500),
  item_description_ar: z.string().max(500).optional().nullable(),
  hs_code: z.string().min(1).max(20),
  hs_code_description: z.string().max(500).optional().nullable(),
  origin_country_id: z.number().int().positive().optional().nullable(),
  quantity: z.number().positive(),
  unit_id: z.number().int().positive().optional().nullable(),
  gross_weight: z.number().nonnegative().optional().nullable(),
  net_weight: z.number().nonnegative().optional().nullable(),
  packages: z.number().int().nonnegative().optional().nullable(),
  unit_price: z.number().nonnegative(),
  fob_value: z.number().nonnegative().optional().nullable(),
  freight_value: z.number().nonnegative().optional().nullable(),
  insurance_value: z.number().nonnegative().optional().nullable(),
  cif_value: z.number().nonnegative().optional().nullable(),
  duty_rate: z.number().nonnegative().optional().nullable(),
  duty_amount: z.number().nonnegative().optional().nullable(),
  vat_rate: z.number().nonnegative().optional().nullable(),
  vat_amount: z.number().nonnegative().optional().nullable(),
  other_fees: z.number().nonnegative().optional().nullable(),
  total_fees: z.number().nonnegative().optional().nullable(),
  exemption_id: z.number().int().positive().optional().nullable(),
  exemption_rate: z.number().nonnegative().optional().nullable(),
  inspection_required: z.boolean().optional().default(false),
  inspection_result: z.string().max(30).optional().nullable(),
  inspection_notes: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const replaceItemsSchema = z.object({
  items: z.array(itemSchema).default([]),
});

router.put('/:id/items', requirePermission('customs_declarations:update'), auditLog, async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const companyId = getCompanyId(req);
    const userId = (req as any).user?.id;
    const declarationId = Number(req.params.id);

    const parsed = replaceItemsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
    }

    const exists = await ensureDeclarationCompany(companyId, declarationId);
    if (!exists) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Customs declaration not found' } });
    }

    await client.query('BEGIN');

    await client.query(
      `DELETE FROM customs_declaration_items
       WHERE company_id = $1 AND declaration_id = $2`,
      [companyId, declarationId]
    );

    for (const i of parsed.data.items) {
      await client.query(
        `INSERT INTO customs_declaration_items (
           company_id, declaration_id,
           line_number,
           item_id, item_code, item_description, item_description_ar,
           hs_code, hs_code_description,
           origin_country_id,
           quantity, unit_id,
           gross_weight, net_weight, packages,
           unit_price,
           fob_value, freight_value, insurance_value, cif_value,
           duty_rate, duty_amount,
           vat_rate, vat_amount,
           other_fees, total_fees,
           exemption_id, exemption_rate,
           inspection_required, inspection_result, inspection_notes,
           notes,
           created_at, updated_at
         ) VALUES (
           $1,$2,
           $3,
           $4,$5,$6,$7,
           $8,$9,
           $10,
           $11,$12,
           $13,$14,$15,
           $16,
           $17,$18,$19,$20,
           $21,$22,
           $23,$24,
           $25,$26,
           $27,$28,
           $29,$30,$31,
           $32,
           NOW(), NOW()
         )`,
        [
          companyId,
          declarationId,
          i.line_number,
          i.item_id ?? null,
          i.item_code ?? null,
          i.item_description,
          i.item_description_ar ?? null,
          i.hs_code,
          i.hs_code_description ?? null,
          i.origin_country_id ?? null,
          i.quantity,
          i.unit_id ?? null,
          i.gross_weight ?? 0,
          i.net_weight ?? 0,
          i.packages ?? 0,
          i.unit_price,
          i.fob_value ?? 0,
          i.freight_value ?? 0,
          i.insurance_value ?? 0,
          i.cif_value ?? 0,
          i.duty_rate ?? 0,
          i.duty_amount ?? 0,
          i.vat_rate ?? 0,
          i.vat_amount ?? 0,
          i.other_fees ?? 0,
          i.total_fees ?? 0,
          i.exemption_id ?? null,
          i.exemption_rate ?? 0,
          i.inspection_required ?? false,
          i.inspection_result ?? null,
          i.inspection_notes ?? null,
          i.notes ?? null,
        ]
      );
    }

    await recalcDeclarationTotals(client, companyId, declarationId);

    await client.query(
      `UPDATE customs_declarations
       SET updated_by = $3
       WHERE company_id = $1 AND id = $2 AND deleted_at IS NULL`,
      [companyId, declarationId, userId ?? null]
    );

    await client.query(
      `INSERT INTO customs_declaration_history (
         company_id, declaration_id, action,
         old_status_id, new_status_id,
         notes, performed_by, performed_at, ip_address
       ) VALUES ($1,$2,'update_items',NULL,NULL,$3,$4,NOW(),$5)`,
      [companyId, declarationId, null, userId ?? null, req.ip]
    );

    await client.query('COMMIT');

    const refreshed = await pool.query(
      `SELECT i.*,
              it.code AS item_code_resolved,
              COALESCE(NULLIF(i.item_description, ''), NULLIF(it.name, ''), NULLIF(it.code, '')) AS item_description_resolved,
              u.code AS unit_code,
              u.name AS unit_name,
              c.name AS origin_country_name
       FROM customs_declaration_items i
       LEFT JOIN items it ON it.id = i.item_id
       LEFT JOIN units_of_measure u ON u.id = i.unit_id
       LEFT JOIN countries c ON c.id = i.origin_country_id
       WHERE i.company_id = $1 AND i.declaration_id = $2
       ORDER BY i.line_number ASC`,
      [companyId, declarationId]
    );

    res.json({ success: true, data: refreshed.rows });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error replacing customs declaration items:', error);
    res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: 'Failed to update items' } });
  } finally {
    client.release();
  }
});

export default router;
