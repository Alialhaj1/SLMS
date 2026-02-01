/**
 * Integration Tests: DELETE /api/master/items/:id
 * Tests movement lock validation for item deletion
 * 
 * Coverage Target: 80%+ (critical API paths)
 */

import request from 'supertest';
import app from '../../app';
import { Pool } from 'pg';

describe('DELETE /api/master/items/:id - Movement Lock Validation', () => {
  let authToken: string;
  let pool: Pool;
  let itemWithMovement: any;
  let itemWithoutMovement: any;

  beforeAll(async () => {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://slms:slms_pass@localhost:5432/slms_db',
    });

    // Authenticate
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test.phase2@slms.local',
        password: 'secret',
      });

    authToken = loginRes.body.accessToken;

    // Create item WITH movement
    const res1 = await request(app)
      .post('/api/master/items')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        code: `DEL-LOCKED-${Date.now()}`,
        name: 'Item With Movement',
        name_ar: 'صنف بحركة',
        base_uom_id: 1,
        tracking_policy: 'none',
        valuation_method: 'fifo',
        is_composite: false,
        is_active: true,
      });

    itemWithMovement = res1.body;

    // Create inventory movement
    await pool.query(
      `INSERT INTO inventory_movements (item_id, warehouse_id, movement_type, quantity, uom_id, reference_number, movement_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [itemWithMovement.id, 1, 'receipt', 10, 1, `GRN-${Date.now()}`, new Date()]
    );

    // Create item WITHOUT movement
    const res2 = await request(app)
      .post('/api/master/items')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        code: `DEL-UNLOCKED-${Date.now()}`,
        name: 'Item Without Movement',
        name_ar: 'صنف بدون حركة',
        base_uom_id: 1,
        tracking_policy: 'none',
        valuation_method: 'fifo',
        is_composite: false,
        is_active: true,
      });

    itemWithoutMovement = res2.body;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM items WHERE code LIKE $1', ['DEL-%']);
    await pool.end();
  });

  describe('✅ Scenario 1: Delete item WITHOUT movement (should succeed)', () => {
    it('should allow deletion when item has no movements', async () => {
      const res = await request(app)
        .delete(`/api/master/items/${itemWithoutMovement.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('deleted');

      // Verify item is soft-deleted
      const checkRes = await pool.query(
        'SELECT deleted_at FROM items WHERE id = $1',
        [itemWithoutMovement.id]
      );
      expect(checkRes.rows[0].deleted_at).not.toBeNull();
    });
  });

  describe('❌ Scenario 2: Delete item WITH movement (should fail)', () => {
    it('should block deletion when item has inventory movements', async () => {
      const res = await request(app)
        .delete(`/api/master/items/${itemWithMovement.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(409); // Conflict
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toHaveProperty('code', 'ITEM_HAS_MOVEMENT');
      expect(res.body.error.message).toContain('movement');
    });

    it('should return proper error structure', async () => {
      const res = await request(app)
        .delete(`/api/master/items/${itemWithMovement.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.body).toMatchObject({
        error: {
          code: 'ITEM_HAS_MOVEMENT',
          message: expect.any(String),
        },
      });
    });

    it('should NOT soft-delete the item when blocked', async () => {
      await request(app)
        .delete(`/api/master/items/${itemWithMovement.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      // Verify item is NOT deleted
      const checkRes = await pool.query(
        'SELECT deleted_at FROM items WHERE id = $1',
        [itemWithMovement.id]
      );
      expect(checkRes.rows[0].deleted_at).toBeNull();
    });
  });

  describe('🔒 Edge Cases', () => {
    it('should return 404 for non-existent item', async () => {
      const res = await request(app)
        .delete('/api/master/items/99999999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .delete(`/api/master/items/${itemWithMovement.id}`);

      expect(res.status).toBe(401);
    });
  });
});

/**
 * Test Coverage Summary:
 * 
 * ✅ DELETE without movement (1 test)
 * ✅ DELETE with movement - blocked (3 tests)
 * ✅ Edge cases (2 tests)
 * 
 * Total: 6 integration tests
 * 
 * Next Steps:
 * 1. Run: npm test src/tests/integration/items.delete.test.ts
 * 2. Move to item groups validation tests
 */
