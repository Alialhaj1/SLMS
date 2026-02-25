import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate, authorize } from '../middleware/auth';
import { loadCompanyContext, requireCompany } from '../middleware/companyContext';
import { getPaginationParams, sendPaginated } from '../utils/response';

const router = Router();

// Apply authentication and company context to all routes
router.use(authenticate);
router.use(loadCompanyContext);

// Create shipment (Admin, Logistics) - SECURED with company_id
router.post('/', requireCompany, authorize('Admin', 'Logistics'), async (req: Request, res: Response) => {
  const { supplier_id, tracking_number, status, origin, destination, est_arrival, notes } = req.body;
  const companyId = req.companyId;
  const client = await pool.connect();
  try {
    // Set company context for RLS
    await client.query('SELECT set_company_context($1, $2)', [companyId, (req as any).user?.id]);
    
    const r = await client.query(
      `INSERT INTO shipments(tenant_id, company_id, supplier_id, tracking_number, status, origin, destination, est_arrival, notes) 
       VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [(req as any).companyContext?.tenant_id, companyId, supplier_id, tracking_number, status || 'created', origin, destination, est_arrival, notes]
    );
    res.json(r.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed to create shipment' });
  } finally { client.release(); }
});

// List shipments (any authenticated user) - SECURED with company_id
router.get('/', requireCompany, authorize(), async (req: Request, res: Response) => {
  const { page, limit, offset } = getPaginationParams(req.query);
  const companyId = req.companyId;
  const shipmentNumber = typeof req.query.shipment_number === 'string' ? req.query.shipment_number.trim() : undefined;
  const containerNo = typeof req.query.container_no === 'string' ? req.query.container_no.trim() : undefined;
  const blNo = typeof req.query.bl_no === 'string' ? req.query.bl_no.trim() : undefined;
  const trackingNumber = typeof req.query.tracking_number === 'string' ? req.query.tracking_number.trim() : undefined;

  // NOTE: legacy shipments table currently stores a single identifier in tracking_number.
  // These are accepted as aliases for now to support Tracking UI requirements.
  const refFilter = shipmentNumber || containerNo || blNo || trackingNumber;
  const client = await pool.connect();
  try {
    // Set company context for RLS
    await client.query('SELECT set_company_context($1, $2)', [companyId, (req as any).user?.id]);
    
    // Get total count - FILTERED BY COMPANY
    const countResult = refFilter
      ? await client.query(
          'SELECT COUNT(*) as total FROM shipments WHERE company_id = $1 AND tracking_number ILIKE $2', 
          [companyId, `%${refFilter}%`]
        )
      : await client.query(
          'SELECT COUNT(*) as total FROM shipments WHERE company_id = $1', 
          [companyId]
        );
    const total = parseInt(countResult.rows[0].total);

    // Get paginated data - FILTERED BY COMPANY
    const r = refFilter
      ? await client.query(
          `SELECT s.*, sp.name as supplier_name
           FROM shipments s
           LEFT JOIN suppliers sp ON sp.id = s.supplier_id
           WHERE s.company_id = $1 AND s.tracking_number ILIKE $2
           ORDER BY s.created_at DESC
           LIMIT $3 OFFSET $4`,
          [companyId, `%${refFilter}%`, limit, offset]
        )
      : await client.query(
          `SELECT s.*, sp.name as supplier_name 
           FROM shipments s 
           LEFT JOIN suppliers sp ON sp.id = s.supplier_id 
           WHERE s.company_id = $1
           ORDER BY s.created_at DESC 
           LIMIT $2 OFFSET $3`,
          [companyId, limit, offset]
        );
    return sendPaginated(res, r.rows, page, limit, total);
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'failed to list shipments' });
  } finally { client.release(); }
});

// Get shipment details including expenses - SECURED with company_id
router.get('/:id', requireCompany, authorize(), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const companyId = req.companyId;
  const client = await pool.connect();
  try {
    // Set company context for RLS
    await client.query('SELECT set_company_context($1, $2)', [companyId, (req as any).user?.id]);
    
    // CRITICAL: Filter by company_id to prevent cross-tenant access
    const r = await client.query(
      'SELECT * FROM shipments WHERE id = $1 AND company_id = $2', 
      [id, companyId]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'not found' });
    const shipment = r.rows[0];
    const er = await client.query(
      'SELECT * FROM expenses WHERE shipment_id = $1 AND company_id = $2 ORDER BY created_at', 
      [id, companyId]
    );
    shipment.expenses = er.rows;
    res.json(shipment);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed to fetch shipment' });
  } finally { client.release(); }
});

// Update shipment (Admin, Logistics) - SECURED with company_id
router.put('/:id', requireCompany, authorize('Admin', 'Logistics'), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const companyId = req.companyId;
  const { supplier_id, tracking_number, status, origin, destination, est_arrival, notes } = req.body;
  const client = await pool.connect();
  try {
    // Set company context for RLS
    await client.query('SELECT set_company_context($1, $2)', [companyId, (req as any).user?.id]);
    
    // CRITICAL: Filter by company_id to prevent cross-tenant modification
    const r = await client.query(
      `UPDATE shipments 
       SET supplier_id=$1, tracking_number=$2, status=$3, origin=$4, destination=$5, est_arrival=$6, notes=$7, updated_at=now() 
       WHERE id=$8 AND company_id=$9 
       RETURNING *`,
      [supplier_id, tracking_number, status, origin, destination, est_arrival, notes, id, companyId]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'not found' });
    res.json(r.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed to update shipment' });
  } finally { client.release(); }
});

// Delete shipment (Admin only) - SECURED with company_id
router.delete('/:id', requireCompany, authorize('Admin'), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const companyId = req.companyId;
  const client = await pool.connect();
  try {
    // Set company context for RLS
    await client.query('SELECT set_company_context($1, $2)', [companyId, (req as any).user?.id]);
    
    // CRITICAL: Filter by company_id to prevent cross-tenant deletion
    const result = await client.query(
      'DELETE FROM shipments WHERE id = $1 AND company_id = $2', 
      [id, companyId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'not found or access denied' });
    }
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed to delete shipment' });
  } finally { client.release(); }
});

// Create expense for a shipment (Accountant, Admin) - SECURED with company_id
router.post('/:id/expenses', requireCompany, authorize('Accountant', 'Admin'), async (req: Request, res: Response) => {
  const shipmentId = Number(req.params.id);
  const companyId = req.companyId;
  const { amount, currency, description } = req.body;
  const createdBy = (req as any).user?.id || (req as any).user?.sub;
  const client = await pool.connect();
  try {
    // Set company context for RLS
    await client.query('SELECT set_company_context($1, $2)', [companyId, (req as any).user?.id]);
    
    // First verify shipment belongs to this company
    const shipmentCheck = await client.query(
      'SELECT id FROM shipments WHERE id = $1 AND company_id = $2',
      [shipmentId, companyId]
    );
    if (shipmentCheck.rowCount === 0) {
      return res.status(404).json({ error: 'shipment not found or access denied' });
    }
    
    const r = await client.query(
      'INSERT INTO expenses(tenant_id, shipment_id, company_id, amount, currency, description, created_by) VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING *', 
      [(req as any).companyContext?.tenant_id, shipmentId, companyId, amount, currency || 'USD', description, createdBy]
    );
    res.json(r.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed to create expense' });
  } finally { client.release(); }
});

// List expenses for a shipment (any authenticated user) - SECURED with company_id
router.get('/:id/expenses', requireCompany, authorize(), async (req: Request, res: Response) => {
  const shipmentId = Number(req.params.id);
  const companyId = req.companyId;
  const client = await pool.connect();
  try {
    // Set company context for RLS
    await client.query('SELECT set_company_context($1, $2)', [companyId, (req as any).user?.id]);
    
    // CRITICAL: Filter by company_id to prevent cross-tenant access
    const r = await client.query(
      `SELECT e.*, u.email as created_by_email 
       FROM expenses e 
       LEFT JOIN users u ON u.id = e.created_by 
       WHERE e.shipment_id = $1 AND e.company_id = $2
       ORDER BY e.created_at`, 
      [shipmentId, companyId]
    );
    res.json(r.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed to list expenses' });
  } finally { client.release(); }
});

export default router;
