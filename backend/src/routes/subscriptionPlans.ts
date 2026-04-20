import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import pool from '../db';

const router = Router();

// GET /api/subscription-plans
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT sp.*,
              (SELECT COUNT(*) FROM tenants t WHERE t.subscription_plan_id = sp.id AND t.deleted_at IS NULL) as tenant_count
       FROM subscription_plans sp
       WHERE sp.deleted_at IS NULL
       ORDER BY sp.sort_order ASC, sp.id ASC`
    );
    const plans = result.rows.map((p: any) => ({
      ...p,
      tenant_count: parseInt(p.tenant_count) || 0,
    }));
    res.json({ success: true, data: plans });
  } catch (err: any) {
    console.error('Error fetching subscription plans:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch subscription plans' });
  }
});

// PUT /api/subscription-plans/:id
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active, name, monthly_price, annual_price, max_users, features } = req.body;
    const sets: string[] = [];
    const vals: any[] = [];
    let idx = 1;
    if (is_active !== undefined) { sets.push(`is_active = $${idx++}`); vals.push(is_active); }
    if (name !== undefined) { sets.push(`name = $${idx++}`); vals.push(name); }
    if (monthly_price !== undefined) { sets.push(`monthly_price = $${idx++}`); vals.push(monthly_price); }
    if (annual_price !== undefined) { sets.push(`annual_price = $${idx++}`); vals.push(annual_price); }
    if (max_users !== undefined) { sets.push(`max_users = $${idx++}`); vals.push(max_users); }
    if (features !== undefined) { sets.push(`features = $${idx++}`); vals.push(JSON.stringify(features)); }
    if (sets.length === 0) return res.status(400).json({ success: false, error: 'No fields to update' });
    sets.push(`updated_at = NOW()`);
    vals.push(id);
    await pool.query(`UPDATE subscription_plans SET ${sets.join(', ')} WHERE id = $${idx} AND deleted_at IS NULL`, vals);
    res.json({ success: true, message: 'Plan updated' });
  } catch (err: any) {
    console.error('Error updating subscription plan:', err);
    res.status(500).json({ success: false, error: 'Failed to update plan' });
  }
});

export default router;
