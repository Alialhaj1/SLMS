/**
 * Customs Reports — Aggregated reporting endpoint
 * /api/reports/customs
 */
import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/auth';
import { loadCompanyContext } from '../../middleware/companyContext';
import { requireAnyPermission } from '../../middleware/rbac';
import pool from '../../db';

const router = Router();
router.use(authenticate, loadCompanyContext);

// GET /summary
router.get('/summary', requireAnyPermission(['customs_declarations:view', 'master:view']), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const { date_from, date_to } = req.query;
    const params: any[] = [];
    let dateFilter = '';
    if (companyId) { params.push(companyId); dateFilter += ` AND cd.company_id = $${params.length}`; }
    if (date_from) { params.push(date_from); dateFilter += ` AND cd.declaration_date >= $${params.length}`; }
    if (date_to) { params.push(date_to); dateFilter += ` AND cd.declaration_date <= $${params.length}`; }

    // Summary stats
    const summary = await pool.query(`
      SELECT
        COUNT(*) as total_declarations,
        COUNT(*) FILTER (WHERE cds.code = 'COMPLETED' OR cds.code = 'CLEARED') as cleared,
        COUNT(*) FILTER (WHERE cds.code = 'PENDING' OR cds.code = 'SUBMITTED') as pending,
        COUNT(*) FILTER (WHERE cds.code = 'REJECTED') as rejected,
        COALESCE(SUM(cd.total_customs_duty), 0) as total_duties,
        COALESCE(SUM(cd.total_vat), 0) as total_taxes,
        COALESCE(SUM(cd.total_fees), 0) as total_fees,
        COALESCE(SUM(cd.total_cif_value), 0) as total_value
      FROM customs_declarations cd
      LEFT JOIN customs_declaration_statuses cds ON cds.id = cd.status_id
      WHERE cd.deleted_at IS NULL ${dateFilter}
    `, params);

    // By declaration type
    const byType = await pool.query(`
      SELECT cdt.name_en as type_name, cdt.name_ar as type_name_ar,
             COUNT(*) as count, COALESCE(SUM(cd.total_cif_value),0) as total_value
      FROM customs_declarations cd
      LEFT JOIN customs_declaration_types cdt ON cdt.id = cd.declaration_type_id
      LEFT JOIN customs_declaration_statuses cds ON cds.id = cd.status_id
      WHERE cd.deleted_at IS NULL ${dateFilter}
      GROUP BY cdt.name_en, cdt.name_ar
      ORDER BY count DESC
    `, params);

    // By status
    const byStatus = await pool.query(`
      SELECT cds.name_en as status_name, cds.name_ar as status_name_ar, cds.color,
             COUNT(*) as count
      FROM customs_declarations cd
      LEFT JOIN customs_declaration_statuses cds ON cds.id = cd.status_id
      WHERE cd.deleted_at IS NULL ${dateFilter}
      GROUP BY cds.name_en, cds.name_ar, cds.color
      ORDER BY count DESC
    `, params);

    // Monthly trend (last 12 months)
    const monthly = await pool.query(`
      SELECT TO_CHAR(cd.declaration_date, 'YYYY-MM') as month,
             COUNT(*) as count,
             COALESCE(SUM(cd.total_customs_duty),0) as duties,
             COALESCE(SUM(cd.total_cif_value),0) as value
      FROM customs_declarations cd
      WHERE cd.deleted_at IS NULL AND cd.declaration_date >= NOW() - INTERVAL '12 months'
        ${companyId ? `AND cd.company_id = $1` : ''}
      GROUP BY month ORDER BY month
    `, companyId ? [companyId] : []);

    // Top HS codes
    const topHsCodes = await pool.query(`
      SELECT ci.hs_code, COALESCE(h.description_en, ci.hs_code_description) as description_en,
             COALESCE(h.description_ar, '') as description_ar,
             COUNT(DISTINCT ci.declaration_id) as declaration_count,
             COALESCE(SUM(ci.cif_value),0) as total_value
      FROM customs_declaration_items ci
      LEFT JOIN hs_codes h ON h.code = ci.hs_code AND h.company_id = ci.company_id
      JOIN customs_declarations cd ON cd.id = ci.declaration_id
      WHERE cd.deleted_at IS NULL ${companyId ? `AND cd.company_id = $1` : ''}
      GROUP BY ci.hs_code, h.description_en, ci.hs_code_description, h.description_ar
      ORDER BY total_value DESC LIMIT 10
    `, companyId ? [companyId] : []);

    res.json({
      success: true,
      data: {
        summary: summary.rows[0],
        by_type: byType.rows,
        by_status: byStatus.rows,
        monthly_trend: monthly.rows,
        top_hs_codes: topHsCodes.rows
      }
    });
  } catch (e: any) { res.status(500).json({ success: false, error: { message: e.message } }); }
});

// GET /declarations — paginated list for reports
router.get('/declarations', requireAnyPermission(['customs_declarations:view', 'master:view']), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyContext?.companyId;
    const { date_from, date_to, status, page = 1, limit = 25 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const params: any[] = [];
    let where = 'WHERE cd.deleted_at IS NULL';
    if (companyId) { params.push(companyId); where += ` AND cd.company_id = $${params.length}`; }
    if (date_from) { params.push(date_from); where += ` AND cd.declaration_date >= $${params.length}`; }
    if (date_to) { params.push(date_to); where += ` AND cd.declaration_date <= $${params.length}`; }
    if (status) { params.push(status); where += ` AND cds.code = $${params.length}`; }

    const countQ = await pool.query(`SELECT COUNT(*) FROM customs_declarations cd LEFT JOIN customs_declaration_statuses cds ON cds.id=cd.status_id ${where}`, params);
    params.push(Number(limit), offset);
    const dataQ = await pool.query(`
      SELECT cd.id, cd.declaration_number, cd.declaration_date,
             cdt.name_en as type_name, cds.name_en as status_name, cds.color,
             cd.total_value, cd.total_duties, cd.total_taxes, cd.total_fees,
             cd.created_at
      FROM customs_declarations cd
      LEFT JOIN customs_declaration_types cdt ON cdt.id = cd.declaration_type_id
      LEFT JOIN customs_declaration_statuses cds ON cds.id = cd.status_id
      ${where}
      ORDER BY cd.declaration_date DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    res.json({ success: true, data: dataQ.rows, total: parseInt(countQ.rows[0].count), page: Number(page), limit: Number(limit) });
  } catch (e: any) { res.status(500).json({ success: false, error: { message: e.message } }); }
});

export default router;
