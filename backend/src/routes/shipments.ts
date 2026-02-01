import { Router } from 'express';
import pool from '../db';
import { authenticate, authorize } from '../middleware/auth';
import { getPaginationParams, sendPaginated } from '../utils/response';

const router = Router();

// Create shipment (Admin, Logistics)
router.post('/', authenticate, authorize('Admin', 'Logistics'), async (req, res) => {
  const { supplier_id, tracking_number, status, origin, destination, est_arrival, notes } = req.body;
  const client = await pool.connect();
  try {
    const r = await client.query(
      `INSERT INTO shipments(supplier_id,tracking_number,status,origin,destination,est_arrival,notes) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [supplier_id, tracking_number, status || 'created', origin, destination, est_arrival, notes]
    );
    res.json(r.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed to create shipment' });
  } finally { client.release(); }
});

// List shipments (any authenticated user)
router.get('/', authenticate, authorize(), async (req, res) => {
  const { page, limit, offset } = getPaginationParams(req.query);
  const shipmentNumber = typeof req.query.shipment_number === 'string' ? req.query.shipment_number.trim() : undefined;
  const containerNo = typeof req.query.container_no === 'string' ? req.query.container_no.trim() : undefined;
  const blNo = typeof req.query.bl_no === 'string' ? req.query.bl_no.trim() : undefined;
  const trackingNumber = typeof req.query.tracking_number === 'string' ? req.query.tracking_number.trim() : undefined;

  // NOTE: legacy shipments table currently stores a single identifier in tracking_number.
  // These are accepted as aliases for now to support Tracking UI requirements.
  const refFilter = shipmentNumber || containerNo || blNo || trackingNumber;
  const client = await pool.connect();
  try {
    // Get total count
    const countResult = refFilter
      ? await client.query('SELECT COUNT(*) as total FROM shipments WHERE tracking_number ILIKE $1', [`%${refFilter}%`])
      : await client.query('SELECT COUNT(*) as total FROM shipments');
    const total = parseInt(countResult.rows[0].total);

    // Get paginated data
    const r = refFilter
      ? await client.query(
          `SELECT s.*, sp.name as supplier_name
           FROM shipments s
           LEFT JOIN suppliers sp ON sp.id = s.supplier_id
           WHERE s.tracking_number ILIKE $1
           ORDER BY s.created_at DESC
           LIMIT $2 OFFSET $3`,
          [`%${refFilter}%`, limit, offset]
        )
      : await client.query(
          `SELECT s.*, sp.name as supplier_name FROM shipments s LEFT JOIN suppliers sp ON sp.id = s.supplier_id ORDER BY s.created_at DESC LIMIT $1 OFFSET $2`,
          [limit, offset]
        );
    return sendPaginated(res, r.rows, page, limit, total);
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'failed to list shipments' });
  } finally { client.release(); }
});

// Get shipment details including expenses
router.get('/:id', authenticate, authorize(), async (req, res) => {
  const id = Number(req.params.id);
  const client = await pool.connect();
  try {
    const r = await client.query('SELECT * FROM shipments WHERE id=$1', [id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'not found' });
    const shipment = r.rows[0];
    const er = await client.query('SELECT * FROM expenses WHERE shipment_id=$1 ORDER BY created_at', [id]);
    shipment.expenses = er.rows;
    res.json(shipment);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed to fetch shipment' });
  } finally { client.release(); }
});

// Update shipment (Admin, Logistics)
router.put('/:id', authenticate, authorize('Admin', 'Logistics'), async (req, res) => {
  const id = Number(req.params.id);
  const { supplier_id, tracking_number, status, origin, destination, est_arrival, notes } = req.body;
  const client = await pool.connect();
  try {
    const r = await client.query(
      `UPDATE shipments SET supplier_id=$1, tracking_number=$2, status=$3, origin=$4, destination=$5, est_arrival=$6, notes=$7, updated_at=now() WHERE id=$8 RETURNING *`,
      [supplier_id, tracking_number, status, origin, destination, est_arrival, notes, id]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'not found' });
    res.json(r.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed to update shipment' });
  } finally { client.release(); }
});

// Delete shipment (Admin only)
router.delete('/:id', authenticate, authorize('Admin'), async (req, res) => {
  const id = Number(req.params.id);
  const client = await pool.connect();
  try {
    await client.query('DELETE FROM shipments WHERE id=$1', [id]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed to delete shipment' });
  } finally { client.release(); }
});

// Create expense for a shipment (Accountant, Admin)
router.post('/:id/expenses', authenticate, authorize('Accountant', 'Admin'), async (req, res) => {
  const shipmentId = Number(req.params.id);
  const { amount, currency, description } = req.body;
  const createdBy = (req as any).user && (req as any).user.sub;
  const client = await pool.connect();
  try {
    const r = await client.query('INSERT INTO expenses(shipment_id,amount,currency,description,created_by) VALUES($1,$2,$3,$4,$5) RETURNING *', [shipmentId, amount, currency || 'USD', description, createdBy]);
    res.json(r.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed to create expense' });
  } finally { client.release(); }
});

// List expenses for a shipment (any authenticated user)
router.get('/:id/expenses', authenticate, authorize(), async (req, res) => {
  const shipmentId = Number(req.params.id);
  const client = await pool.connect();
  try {
    const r = await client.query('SELECT e.*, u.email as created_by_email FROM expenses e LEFT JOIN users u ON u.id = e.created_by WHERE shipment_id=$1 ORDER BY created_at', [shipmentId]);
    res.json(r.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed to list expenses' });
  } finally { client.release(); }
});

export default router;
