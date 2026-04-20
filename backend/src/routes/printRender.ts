/**
 * ============================================================================
 * Print Render Routes
 * ============================================================================
 * Provides print-ready data for any entity type in a standardized format.
 * GET /api/print/data/:entityType/:entityId
 * ============================================================================
 */

import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { loadCompanyContext } from '../middleware/companyContext';
import { sendSuccess, errors } from '../utils/response';
import logger from '../utils/logger';

const router = Router();

// ─── Company Info Helper ────────────────────────────────────────────────────

async function getCompanyInfo(companyId: number) {
  const result = await pool.query(
    `SELECT id, name, name_ar, legal_name, tax_number, registration_number,
            address, phone, email, website, currency, logo, logo_url
     FROM companies WHERE id = $1 AND deleted_at IS NULL`,
    [companyId]
  );
  return result.rows[0] || null;
}

// ─── Approval Actions Helper ────────────────────────────────────────────────

async function getApprovalActions(approvalDocId: number | null, referenceId: number, referenceTable: string) {
  let docId = approvalDocId;
  if (!docId) {
    const docResult = await pool.query(
      `SELECT id FROM approval_documents WHERE reference_id = $1 AND reference_table = $2 ORDER BY created_at DESC LIMIT 1`,
      [referenceId, referenceTable]
    );
    if (!docResult.rows[0]) return [];
    docId = docResult.rows[0].id;
  }

  const result = await pool.query(`
    SELECT
      aa.action,
      aa.acted_at,
      aa.comment,
      aa.step_number,
      u.full_name    AS actor_name,
      u.name_ar      AS actor_name_ar,
      u.signature_image_url AS user_signature_url,
      u.signature_title_en  AS user_title_en,
      u.signature_title_ar  AS user_title_ar,
      ars.step_type,
      ars.label_en   AS step_name,
      ars.label_ar   AS step_name_ar,
      ds.signature_image_url AS sig_image_url,
      ds.signature_name_en,
      ds.signature_name_ar,
      ds.signature_title_en,
      ds.signature_title_ar
    FROM approval_actions aa
    JOIN users u ON u.id = aa.actor_id
    LEFT JOIN approval_route_steps ars ON ars.id = aa.step_id
    LEFT JOIN digital_signatures ds ON ds.id = aa.signature_id
    WHERE aa.document_id = $1
      AND aa.action IN ('submitted', 'reviewed', 'approved', 'posted')
    ORDER BY aa.acted_at ASC
  `, [docId]);

  return result.rows.map(row => ({
    ...row,
    // Use dedicated digital signature image first, fall back to user profile signature
    signature_image_url: row.sig_image_url || row.user_signature_url || null,
    // Use digital signature name if available, else user full_name
    display_name: row.signature_name_en || row.actor_name,
    display_name_ar: row.signature_name_ar || row.actor_name_ar || row.actor_name,
    display_title_en: row.signature_title_en || row.user_title_en || null,
    display_title_ar: row.signature_title_ar || row.user_title_ar || null,
  }));
}

// ─── Entity Data Fetchers ───────────────────────────────────────────────────

async function getExpenseRequestData(id: number, companyId: number) {
  const result = await pool.query(`
    SELECT
      er.id, er.request_number, er.request_date, er.total_amount, er.notes,
      er.created_at,
      rs.name as status_name, rs.name_ar as status_name_ar,
      COALESCE(sel.name, et.name) as expense_type_name,
      COALESCE(sel.name_ar, et.name_ar) as expense_type_name_ar,
      p.name as project_name, p.code as project_code,
      s.shipment_number, s.bl_no as shipment_bl_number,
      po.order_number as vendor_po_number,
      sv.name as shipment_vendor_name, sv.name_ar as shipment_vendor_name_ar,
      v.name as vendor_name, v.name_ar as vendor_name_ar,
      c.code as currency_code, c.symbol as currency_symbol,
      u.full_name as requested_by_name,
      approver.full_name as approved_by_name,
      creator.full_name as created_by_name,
      se.invoice_number as source_invoice_number,
      se.expense_date as source_invoice_date,
      se.entity_name as source_entity_name,
      se.description as source_description,
      se.bl_number as source_bl_number,
      ins_co.name as source_insurance_company,
      ship_agent.name as source_shipping_agent,
      clear_off.name as source_clearance_office
    FROM expense_requests er
    LEFT JOIN request_statuses rs ON rs.id = er.status_id
    LEFT JOIN request_expense_types et ON et.id = er.expense_type_id
    LEFT JOIN shipment_expense_types sel ON sel.id = er.expense_type_id
    LEFT JOIN projects p ON p.id = er.project_id
    LEFT JOIN logistics_shipments s ON s.id = er.shipment_id
    LEFT JOIN purchase_orders po ON po.id = s.purchase_order_id
    LEFT JOIN vendors sv ON sv.id = s.vendor_id
    LEFT JOIN vendors v ON v.id = er.vendor_id
    LEFT JOIN currencies c ON c.id = er.currency_id
    LEFT JOIN users u ON u.id = er.requested_by
    LEFT JOIN users approver ON approver.id = er.approved_by
    LEFT JOIN users creator ON creator.id = er.created_by
    LEFT JOIN shipment_expenses se ON se.id = er.source_shipment_expense_id
    LEFT JOIN insurance_companies ins_co ON ins_co.id = se.insurance_company_id
    LEFT JOIN shipping_agents ship_agent ON ship_agent.id = se.shipping_agent_id
    LEFT JOIN clearance_offices clear_off ON clear_off.id = se.clearance_office_id
    WHERE er.id = $1 AND er.company_id = $2 AND er.deleted_at IS NULL
  `, [id, companyId]);

  if (!result.rows[0]) return null;
  const row = result.rows[0];

  // Fetch shipment items if linked to a shipment
  let items: any[] = [];
  if (row.shipment_number) {
    const itemsResult = await pool.query(`
      SELECT si.id, COALESCE(i.code, si.item_code) as item_code,
             COALESCE(i.name, si.item_name) as item_name,
             COALESCE(i.name_ar, si.item_name_ar) as item_name_ar,
             si.quantity, si.unit_cost, si.line_total as total_cost,
             u.code as uom_code, u.name as uom_name
      FROM logistics_shipment_items si
      LEFT JOIN items i ON i.id = si.item_id
      LEFT JOIN units_of_measure u ON u.id = si.uom_id
      WHERE si.shipment_id = (SELECT id FROM logistics_shipments WHERE shipment_number = $1 AND company_id = $2 LIMIT 1)
      ORDER BY si.id
    `, [row.shipment_number, companyId]);
    items = itemsResult.rows;
  }

  const approvalActions = await getApprovalActions(null, id, 'expense_requests');
  return { ...row, items, approval_actions: approvalActions };
}

async function getShipmentExpenseData(id: number, companyId: number) {
  const result = await pool.query(`
    SELECT
      se.id, se.shipment_id, se.expense_date, se.total_amount, se.vat_amount,
      se.total_in_base_currency, se.invoice_number, se.description,
      se.entity_name, se.bl_number, se.approval_status, se.is_posted,
      se.exchange_rate, se.notes, se.created_at, se.approval_document_id,
      s.shipment_number, s.bl_no as shipment_bl_number,
      sel.code as expense_type_code,
      sel.name as expense_type_name, sel.name_ar as expense_type_name_ar,
      sel.category,
      c.code as currency_code, c.symbol as currency_symbol,
      creator.full_name as created_by_name,
      p.name as project_name, p.code as project_code,
      v.name as vendor_name, v.name_ar as vendor_name_ar
    FROM shipment_expenses se
    LEFT JOIN logistics_shipments s ON s.id = se.shipment_id
    LEFT JOIN shipment_expense_types sel ON sel.id = se.expense_type_id
    LEFT JOIN currencies c ON c.id = se.currency_id
    LEFT JOIN users creator ON creator.id = se.created_by
    LEFT JOIN projects p ON p.id = s.project_id
    LEFT JOIN vendors v ON v.id = s.vendor_id
    WHERE se.id = $1 AND se.company_id = $2 AND se.deleted_at IS NULL
  `, [id, companyId]);

  if (!result.rows[0]) return null;
  const row = result.rows[0];

  const approvalActions = await getApprovalActions(row.approval_document_id || null, id, 'shipment_expenses');
  return { ...row, approval_actions: approvalActions };
}

async function getShipmentData(id: number, companyId: number) {
  const result = await pool.query(`
    SELECT
      s.id, s.shipment_number, s.bl_no, s.status_code,
      s.departure_date, s.expected_arrival_date as arrival_date, s.actual_arrival_date, s.total_amount,
      s.notes, s.created_at,
      st.name_en as shipment_type_name, st.name_ar as shipment_type_name_ar,
      v.name as vendor_name, v.name_ar as vendor_name_ar, v.code as vendor_code,
      po.order_number as purchase_order_number, po.vendor_contract_number,
      po_c.code as po_currency_code,
      p.name as project_name, p.code as project_code,
      pod.name_en as port_of_discharge_name,
      pol.name_en as port_of_loading_name,
      o_city.name as origin_city_name,
      d_city.name as destination_city_name,
      creator.full_name as created_by_name
    FROM logistics_shipments s
    LEFT JOIN shipment_types st ON st.id = s.shipment_type_id
    LEFT JOIN vendors v ON v.id = s.vendor_id
    LEFT JOIN purchase_orders po ON po.id = s.purchase_order_id
    LEFT JOIN currencies po_c ON po_c.id = po.currency_id
    LEFT JOIN projects p ON p.id = s.project_id
    LEFT JOIN ports pod ON pod.id = s.port_of_discharge_id
    LEFT JOIN ports pol ON pol.id = s.port_of_loading_id
    LEFT JOIN cities o_city ON o_city.id = s.origin_location_id
    LEFT JOIN cities d_city ON d_city.id = s.destination_location_id
    LEFT JOIN users creator ON creator.id = s.created_by
    WHERE s.id = $1 AND s.company_id = $2 AND s.deleted_at IS NULL
  `, [id, companyId]);

  if (!result.rows[0]) return null;
  const row = result.rows[0];

  // Fetch items
  const itemsResult = await pool.query(`
    SELECT si.id, COALESCE(i.code, si.item_code) as item_code,
           COALESCE(i.name, si.item_name) as item_name,
           COALESCE(i.name_ar, si.item_name_ar) as item_name_ar,
           si.quantity, si.unit_cost, si.line_total as total_cost,
           u.code as uom_code, u.name as uom_name
    FROM logistics_shipment_items si
    LEFT JOIN items i ON i.id = si.item_id
    LEFT JOIN units_of_measure u ON u.id = si.uom_id
    WHERE si.shipment_id = $1
    ORDER BY si.id
  `, [id]);

  // Fetch expenses summary
  const expensesResult = await pool.query(`
    SELECT se.id, sel.name as expense_type_name, sel.name_ar as expense_type_name_ar,
           se.total_amount, se.vat_amount, se.total_in_base_currency,
           c.code as currency_code, se.entity_name, se.invoice_number
    FROM shipment_expenses se
    LEFT JOIN shipment_expense_types sel ON sel.id = se.expense_type_id
    LEFT JOIN currencies c ON c.id = se.currency_id
    WHERE se.shipment_id = $1 AND se.company_id = $2 AND se.deleted_at IS NULL
    ORDER BY se.id
  `, [id, companyId]);

  const approvalActions = await getApprovalActions(null, id, 'logistics_shipments');
  return { ...row, items: itemsResult.rows, expenses: expensesResult.rows, approval_actions: approvalActions };
}

// ─── Main Route ─────────────────────────────────────────────────────────────

router.get('/data/:entityType/:entityId', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return errors.invalidInput(res, 'Company context required');

    const { entityType, entityId } = req.params;
    const id = parseInt(entityId, 10);
    if (isNaN(id)) return errors.invalidInput(res, 'Invalid entity ID');

    // Fetch company info
    const company = await getCompanyInfo(companyId);
    if (!company) return errors.notFound(res, 'Company not found');

    // Fetch entity data based on type
    let document: any = null;
    let documentType = entityType;

    switch (entityType) {
      case 'expense-request':
        document = await getExpenseRequestData(id, companyId);
        break;
      case 'shipment-expense':
        document = await getShipmentExpenseData(id, companyId);
        break;
      case 'shipment':
        document = await getShipmentData(id, companyId);
        break;
      default:
        return errors.invalidInput(res, `Unsupported entity type: ${entityType}`);
    }

    if (!document) return errors.notFound(res, `${entityType} not found`);

    // Get current user info
    const userId = (req as any).user?.id;
    const userResult = await pool.query(
      'SELECT full_name, email FROM users WHERE id = $1', [userId]
    );
    const currentUser = userResult.rows[0] || { full_name: 'Unknown', email: '' };

    sendSuccess(res, {
      entityType: documentType,
      company,
      document,
      printedBy: currentUser.full_name || currentUser.email,
    });
  } catch (err) {
    logger.error('Print data error:', err);
    errors.internal(res, 'Failed to fetch print data');
  }
});

// ─── Available Templates Route ──────────────────────────────────────────────

router.get('/templates/:templateType', authenticate, loadCompanyContext, async (req: Request, res: Response) => {
  try {
    const companyId = req.companyId;
    if (!companyId) return errors.invalidInput(res, 'Company context required');

    const { templateType } = req.params;

    const result = await pool.query(`
      SELECT id, name_en, name_ar, template_type, is_default, paper_size, orientation,
             header_html, footer_html, css
      FROM printed_templates
      WHERE company_id = $1 AND template_type = $2 AND is_active = true AND deleted_at IS NULL
      ORDER BY is_default DESC, name_en
    `, [companyId, templateType]);

    sendSuccess(res, result.rows);
  } catch (err) {
    logger.error('Print templates error:', err);
    errors.internal(res, 'Failed to fetch print templates');
  }
});

export default router;
