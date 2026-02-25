/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  INVENTORY TRANSFERS ROUTES                                                ║
 * ║  Phase 4 — Module E-02 — Inter-warehouse Stock Transfers                   ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';
import { requireAnyPermission } from '../middleware/rbac';

const router = Router();

router.use(authenticate);

// ── LIST ──────────────────────────────────────────────────────────────
router.get('/', requireAnyPermission(['inventory_transfers:view']), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user?.companyId;
    const { status, from_warehouse_id, to_warehouse_id, search, page = '1', limit = '50' } = req.query;

    let query = `
      SELECT it.*,
             fw.name AS from_warehouse_name, fw.code AS from_warehouse_code,
             tw.name AS to_warehouse_name, tw.code AS to_warehouse_code,
             u.email AS requested_by_email,
             (SELECT COUNT(*) FROM inventory_transfer_lines itl WHERE itl.transfer_id = it.id) AS line_count
      FROM inventory_transfers it
      LEFT JOIN warehouses fw ON fw.id = it.from_warehouse_id
      LEFT JOIN warehouses tw ON tw.id = it.to_warehouse_id
      LEFT JOIN users u ON u.id = it.requested_by
      WHERE it.deleted_at IS NULL
    `;
    const params: any[] = [];
    let paramIdx = 0;

    if (companyId) { params.push(companyId); query += ` AND it.company_id = $${++paramIdx}`; }
    if (status) { params.push(status); query += ` AND it.status = $${++paramIdx}`; }
    if (from_warehouse_id) { params.push(from_warehouse_id); query += ` AND it.from_warehouse_id = $${++paramIdx}`; }
    if (to_warehouse_id) { params.push(to_warehouse_id); query += ` AND it.to_warehouse_id = $${++paramIdx}`; }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (it.transfer_number ILIKE $${++paramIdx} OR it.reason ILIKE $${paramIdx})`;
    }

    const countQuery = query.replace(/SELECT it\.\*[\s\S]*?FROM/, 'SELECT COUNT(*) FROM');
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    params.push(parseInt(limit as string));
    query += ` ORDER BY it.transfer_date DESC, it.created_at DESC LIMIT $${++paramIdx}`;
    params.push(offset);
    query += ` OFFSET $${++paramIdx}`;

    const result = await pool.query(query, params);
    res.json({ data: result.rows, total, page: parseInt(page as string), limit: parseInt(limit as string) });
  } catch (error) {
    console.error('Error fetching inventory transfers:', error);
    res.status(500).json({ error: 'Failed to fetch inventory transfers' });
  }
});

// ── GET ONE ───────────────────────────────────────────────────────────
router.get('/:id', requireAnyPermission(['inventory_transfers:view']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT it.*,
              fw.name AS from_warehouse_name, fw.code AS from_warehouse_code,
              tw.name AS to_warehouse_name, tw.code AS to_warehouse_code
       FROM inventory_transfers it
       LEFT JOIN warehouses fw ON fw.id = it.from_warehouse_id
       LEFT JOIN warehouses tw ON tw.id = it.to_warehouse_id
       WHERE it.id = $1 AND it.deleted_at IS NULL`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transfer not found' });
    }

    const lines = await pool.query(
      `SELECT itl.*,
              i.name_en AS item_name, i.code AS item_code,
              u.name AS unit_name
       FROM inventory_transfer_lines itl
       LEFT JOIN items i ON i.id = itl.item_id
       LEFT JOIN units u ON u.id = itl.unit_id
       WHERE itl.transfer_id = $1 ORDER BY itl.id`,
      [id]
    );

    res.json({ data: { ...result.rows[0], lines: lines.rows } });
  } catch (error) {
    console.error('Error fetching inventory transfer:', error);
    res.status(500).json({ error: 'Failed to fetch inventory transfer' });
  }
});

// ── CREATE ────────────────────────────────────────────────────────────
router.post('/', requireAnyPermission(['inventory_transfers:create']), async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const companyId = (req as any).user?.companyId;
    const userId = (req as any).user?.id;
    const { from_warehouse_id, to_warehouse_id, transfer_date, expected_date, notes, reason, lines } = req.body;

    if (!from_warehouse_id || !to_warehouse_id) {
      return res.status(400).json({ error: 'Source and destination warehouses are required' });
    }
    if (from_warehouse_id === to_warehouse_id) {
      return res.status(400).json({ error: 'Source and destination must be different' });
    }
    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({ error: 'At least one item line is required' });
    }

    await client.query('BEGIN');

    // Generate transfer number
    const seqResult = await client.query(
      `SELECT COALESCE(MAX(CAST(REGEXP_REPLACE(transfer_number, '[^0-9]', '', 'g') AS INTEGER)), 0) + 1 AS next_num
       FROM inventory_transfers WHERE company_id = $1`,
      [companyId]
    );
    const nextNum = seqResult.rows[0]?.next_num || 1;
    const transferNumber = `TR-${new Date().getFullYear()}-${String(nextNum).padStart(5, '0')}`;

    const result = await client.query(
      `INSERT INTO inventory_transfers 
       (company_id, transfer_number, transfer_date, from_warehouse_id, to_warehouse_id,
        expected_date, notes, reason, status, requested_by, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'draft',$9,$9)
       RETURNING *`,
      [companyId, transferNumber, transfer_date || new Date().toISOString().split('T')[0],
       from_warehouse_id, to_warehouse_id, expected_date, notes, reason, userId]
    );

    const transferId = result.rows[0].id;

    for (const line of lines) {
      await client.query(
        `INSERT INTO inventory_transfer_lines 
         (transfer_id, item_id, unit_id, quantity_requested, from_location_id, to_location_id, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [transferId, line.item_id, line.unit_id, line.quantity, line.from_location_id, line.to_location_id, line.notes]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ data: result.rows[0] });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error creating inventory transfer:', error);
    res.status(500).json({ error: 'Failed to create inventory transfer' });
  } finally {
    client.release();
  }
});

// ── APPROVE ───────────────────────────────────────────────────────────
router.post('/:id/approve', requireAnyPermission(['inventory_transfers:approve']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    const result = await pool.query(
      `UPDATE inventory_transfers SET 
        status = 'approved', approved_by = $2, approved_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND status = 'draft' AND deleted_at IS NULL
       RETURNING *`,
      [id, userId]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Cannot approve — transfer is not in draft status' });
    }
    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Error approving transfer:', error);
    res.status(500).json({ error: 'Failed to approve transfer' });
  }
});

// ── SHIP ──────────────────────────────────────────────────────────────
router.post('/:id/ship', requireAnyPermission(['inventory_transfers:ship']), async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    const { shipped_quantities } = req.body; // [{line_id, quantity_shipped}]

    await client.query('BEGIN');

    const transfer = await client.query(
      'SELECT * FROM inventory_transfers WHERE id = $1 AND status = $2 AND deleted_at IS NULL FOR UPDATE',
      [id, 'approved']
    );
    if (transfer.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cannot ship — transfer must be approved' });
    }

    // Update line quantities
    if (shipped_quantities && Array.isArray(shipped_quantities)) {
      for (const sq of shipped_quantities) {
        await client.query(
          'UPDATE inventory_transfer_lines SET quantity_shipped = $2 WHERE id = $1',
          [sq.line_id, sq.quantity_shipped]
        );
      }
    } else {
      // Ship all requested quantities
      await client.query(
        'UPDATE inventory_transfer_lines SET quantity_shipped = quantity_requested WHERE transfer_id = $1',
        [id]
      );
    }

    await client.query(
      `UPDATE inventory_transfers SET 
        status = 'in_transit', shipped_by = $2, shipped_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [id, userId]
    );

    await client.query('COMMIT');
    res.json({ message: 'Transfer shipped' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error shipping transfer:', error);
    res.status(500).json({ error: 'Failed to ship transfer' });
  } finally {
    client.release();
  }
});

// ── RECEIVE ───────────────────────────────────────────────────────────
router.post('/:id/receive', requireAnyPermission(['inventory_transfers:receive']), async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    const { received_quantities } = req.body;

    await client.query('BEGIN');

    const transfer = await client.query(
      'SELECT * FROM inventory_transfers WHERE id = $1 AND status = $2 AND deleted_at IS NULL FOR UPDATE',
      [id, 'in_transit']
    );
    if (transfer.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cannot receive — transfer must be in transit' });
    }

    if (received_quantities && Array.isArray(received_quantities)) {
      for (const rq of received_quantities) {
        await client.query(
          'UPDATE inventory_transfer_lines SET quantity_received = $2 WHERE id = $1',
          [rq.line_id, rq.quantity_received]
        );
      }
    } else {
      await client.query(
        'UPDATE inventory_transfer_lines SET quantity_received = quantity_shipped WHERE transfer_id = $1',
        [id]
      );
    }

    await client.query(
      `UPDATE inventory_transfers SET 
        status = 'received', received_by = $2, received_at = NOW(), received_date = CURRENT_DATE, updated_at = NOW()
       WHERE id = $1`,
      [id, userId]
    );

    await client.query('COMMIT');
    res.json({ message: 'Transfer received' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error receiving transfer:', error);
    res.status(500).json({ error: 'Failed to receive transfer' });
  } finally {
    client.release();
  }
});

// ── CANCEL ────────────────────────────────────────────────────────────
router.post('/:id/cancel', requireAnyPermission(['inventory_transfers:edit']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE inventory_transfers SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1 AND status IN ('draft', 'approved') AND deleted_at IS NULL
       RETURNING *`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Cannot cancel — only draft or approved transfers can be cancelled' });
    }
    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Error cancelling transfer:', error);
    res.status(500).json({ error: 'Failed to cancel transfer' });
  }
});

// ── DELETE ─────────────────────────────────────────────────────────────
router.delete('/:id', requireAnyPermission(['inventory_transfers:delete']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const check = await pool.query('SELECT status FROM inventory_transfers WHERE id=$1 AND deleted_at IS NULL', [id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    if (check.rows[0].status !== 'draft') {
      return res.status(400).json({ error: 'Only draft transfers can be deleted' });
    }
    await pool.query('UPDATE inventory_transfers SET deleted_at = NOW() WHERE id = $1', [id]);
    res.json({ message: 'Transfer deleted' });
  } catch (error) {
    console.error('Error deleting transfer:', error);
    res.status(500).json({ error: 'Failed to delete transfer' });
  }
});

export default router;
