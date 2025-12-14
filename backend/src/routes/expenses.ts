import { Router } from 'express';
import pool from '../db';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Update expense (Accountant, Admin)
router.put('/:id', authenticate, authorize('Accountant', 'Admin'), async (req, res) => {
  const id = Number(req.params.id);
  const { amount, currency, description } = req.body;
  const client = await pool.connect();
  try {
    const r = await client.query(
      `UPDATE expenses SET amount=$1, currency=$2, description=$3, updated_at=now() WHERE id=$4 RETURNING *`,
      [amount, currency, description, id]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'not found' });
    res.json(r.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed to update expense' });
  } finally { client.release(); }
});

// Delete expense (Admin)
router.delete('/:id', authenticate, authorize('Admin'), async (req, res) => {
  const id = Number(req.params.id);
  const client = await pool.connect();
  try {
    await client.query('DELETE FROM expenses WHERE id=$1', [id]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed to delete expense' });
  } finally { client.release(); }
});

export default router;
