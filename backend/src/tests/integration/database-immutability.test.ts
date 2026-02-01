/**
 * Database State Assertions Tests
 * Verifies DB immutability after failed operations
 * 
 * Enterprise-grade data integrity validation
 */

import request from 'supertest';
import app from '../../app';
import { Pool } from 'pg';

describe('Database State Immutability Tests', () => {
  let authToken: string;
  let pool: Pool;
  let testItem: any;

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

    // Create test item WITH movement
    const res = await request(app)
      .post('/api/master/items')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        code: `IMMUT-${Date.now()}`,
        name: 'Immutability Test Item',
        name_ar: 'صنف اختبار الثبات',
        base_uom_id: 1,
        tracking_policy: 'none',
        valuation_method: 'fifo',
        is_composite: false,
        is_active: true,
        standard_cost: 50.0,
      });

    testItem = res.body;

    // Create inventory movement
    await pool.query(
      `INSERT INTO inventory_movements (item_id, warehouse_id, movement_type, quantity, uom_id, reference_number, movement_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [testItem.id, 1, 'receipt', 10, 1, `GRN-${Date.now()}`, new Date()]
    );
  });

  afterAll(async () => {
    await pool.query('DELETE FROM items WHERE code LIKE $1', ['IMMUT-%']);
    await pool.end();
  });

  describe('🔒 PUT Request Immutability', () => {
    it('should NOT modify DB when PUT fails with ITEM_POLICY_LOCKED', async () => {
      // Capture state BEFORE failed request
      const before = await pool.query(
        'SELECT * FROM items WHERE id = $1',
        [testItem.id]
      );
      const beforeState = before.rows[0];

      // Attempt to change locked field (should fail)
      await request(app)
        .put(`/api/master/items/${testItem.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...testItem,
          base_uom_id: 2, // Try to change locked field
        })
        .expect(409); // Expect conflict

      // Capture state AFTER failed request
      const after = await pool.query(
        'SELECT * FROM items WHERE id = $1',
        [testItem.id]
      );
      const afterState = after.rows[0];

      // Assert NO changes occurred
      expect(afterState).toEqual(beforeState);
      expect(afterState.base_uom_id).toBe(beforeState.base_uom_id);
      expect(afterState.tracking_policy).toBe(beforeState.tracking_policy);
      expect(afterState.valuation_method).toBe(beforeState.valuation_method);
      expect(afterState.updated_at).toEqual(beforeState.updated_at);
    });

    it('should NOT modify DB when PUT fails with multiple locked fields', async () => {
      const before = await pool.query(
        'SELECT base_uom_id, tracking_policy, valuation_method, is_composite, updated_at FROM items WHERE id = $1',
        [testItem.id]
      );
      const beforeState = before.rows[0];

      // Attempt to change multiple locked fields
      await request(app)
        .put(`/api/master/items/${testItem.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...testItem,
          base_uom_id: 2,
          tracking_policy: 'batch',
          valuation_method: 'weighted_avg',
        })
        .expect(409);

      const after = await pool.query(
        'SELECT base_uom_id, tracking_policy, valuation_method, is_composite, updated_at FROM items WHERE id = $1',
        [testItem.id]
      );
      const afterState = after.rows[0];

      // Assert ZERO modifications
      expect(afterState).toEqual(beforeState);
    });

    it('should NOT partially update when some fields are locked', async () => {
      const before = await pool.query(
        'SELECT * FROM items WHERE id = $1',
        [testItem.id]
      );
      const beforeState = before.rows[0];

      // Attempt to update both locked (base_uom_id) and non-locked (name) fields
      await request(app)
        .put(`/api/master/items/${testItem.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...testItem,
          name: 'Updated Name (Should Not Save)',
          base_uom_id: 2, // Locked field causes entire request to fail
        })
        .expect(409);

      const after = await pool.query(
        'SELECT * FROM items WHERE id = $1',
        [testItem.id]
      );
      const afterState = after.rows[0];

      // Assert ENTIRE update was rejected (including non-locked field)
      expect(afterState.name).toBe(beforeState.name);
      expect(afterState.base_uom_id).toBe(beforeState.base_uom_id);
    });
  });

  describe('🔒 DELETE Request Immutability', () => {
    it('should NOT soft-delete when DELETE fails with ITEM_HAS_MOVEMENT', async () => {
      // Capture deleted_at BEFORE failed request
      const before = await pool.query(
        'SELECT deleted_at FROM items WHERE id = $1',
        [testItem.id]
      );
      const beforeDeletedAt = before.rows[0].deleted_at;

      // Attempt to delete item with movements (should fail)
      await request(app)
        .delete(`/api/master/items/${testItem.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(409);

      // Capture deleted_at AFTER failed request
      const after = await pool.query(
        'SELECT deleted_at FROM items WHERE id = $1',
        [testItem.id]
      );
      const afterDeletedAt = after.rows[0].deleted_at;

      // Assert deleted_at remains NULL
      expect(beforeDeletedAt).toBeNull();
      expect(afterDeletedAt).toBeNull();
      expect(afterDeletedAt).toEqual(beforeDeletedAt);
    });

    it('should NOT modify item record when DELETE is blocked', async () => {
      const before = await pool.query(
        'SELECT * FROM items WHERE id = $1',
        [testItem.id]
      );
      const beforeState = before.rows[0];

      // Attempt to delete
      await request(app)
        .delete(`/api/master/items/${testItem.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(409);

      const after = await pool.query(
        'SELECT * FROM items WHERE id = $1',
        [testItem.id]
      );
      const afterState = after.rows[0];

      // Assert ZERO modifications (including timestamps)
      expect(afterState.deleted_at).toBe(beforeState.deleted_at);
      expect(afterState.deleted_by).toBe(beforeState.deleted_by);
      expect(afterState.updated_at).toEqual(beforeState.updated_at);
    });
  });

  describe('🔒 Item Groups Immutability', () => {
    let parentGroup: any;
    let childGroup: any;

    beforeAll(async () => {
      // Create parent group
      const res1 = await request(app)
        .post('/api/master/item-groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code: `IMMUT-PARENT-${Date.now()}`,
          name: 'Immutability Parent Group',
          name_ar: 'مجموعة أب',
        });
      parentGroup = res1.body;

      // Create child group
      const res2 = await request(app)
        .post('/api/master/item-groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code: `IMMUT-CHILD-${Date.now()}`,
          name: 'Immutability Child Group',
          name_ar: 'مجموعة فرعية',
          parent_id: parentGroup.id,
        });
      childGroup = res2.body;
    });

    afterAll(async () => {
      await pool.query('DELETE FROM item_groups WHERE code LIKE $1', ['IMMUT-PARENT-%']);
      await pool.query('DELETE FROM item_groups WHERE code LIKE $1', ['IMMUT-CHILD-%']);
    });

    it('should NOT modify parent_id when reparenting fails (GROUP_HAS_CHILDREN)', async () => {
      const before = await pool.query(
        'SELECT parent_group_id, updated_at FROM item_groups WHERE id = $1',
        [parentGroup.id]
      );
      const beforeState = before.rows[0];

      // Attempt to reparent (should fail because has children)
      await request(app)
        .put(`/api/master/item-groups/${parentGroup.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...parentGroup,
          parent_id: 999, // Try to move under another group
        })
        .expect(409);

      const after = await pool.query(
        'SELECT parent_group_id, updated_at FROM item_groups WHERE id = $1',
        [parentGroup.id]
      );
      const afterState = after.rows[0];

      // Assert NO modifications
      expect(afterState.parent_group_id).toBe(beforeState.parent_group_id);
      expect(afterState.updated_at).toEqual(beforeState.updated_at);
    });

    it('should NOT soft-delete when DELETE fails (GROUP_HAS_CHILDREN)', async () => {
      const before = await pool.query(
        'SELECT deleted_at FROM item_groups WHERE id = $1',
        [parentGroup.id]
      );
      const beforeDeletedAt = before.rows[0].deleted_at;

      // Attempt to delete (should fail because has children)
      await request(app)
        .delete(`/api/master/item-groups/${parentGroup.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(409);

      const after = await pool.query(
        'SELECT deleted_at FROM item_groups WHERE id = $1',
        [parentGroup.id]
      );
      const afterDeletedAt = after.rows[0].deleted_at;

      // Assert deleted_at remains NULL
      expect(beforeDeletedAt).toBeNull();
      expect(afterDeletedAt).toBeNull();
    });
  });

  describe('🔒 Concurrent Modification Safety', () => {
    it('should maintain consistency when multiple PUT requests fail', async () => {
      const before = await pool.query(
        'SELECT * FROM items WHERE id = $1',
        [testItem.id]
      );
      const beforeState = before.rows[0];

      // Simulate concurrent requests (both should fail)
      await Promise.all([
        request(app)
          .put(`/api/master/items/${testItem.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ ...testItem, base_uom_id: 2 })
          .expect(409),
        request(app)
          .put(`/api/master/items/${testItem.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ ...testItem, tracking_policy: 'batch' })
          .expect(409),
      ]);

      const after = await pool.query(
        'SELECT * FROM items WHERE id = $1',
        [testItem.id]
      );
      const afterState = after.rows[0];

      // Assert NO race condition modifications
      expect(afterState).toEqual(beforeState);
    });
  });
});

/**
 * Test Summary:
 * 
 * ✅ PUT immutability (3 tests)
 * ✅ DELETE immutability (2 tests)
 * ✅ Item Groups immutability (2 tests)
 * ✅ Concurrent modification safety (1 test)
 * 
 * Total: 8 data integrity tests
 * 
 * Coverage: Database-level validation (beyond API-level)
 * 
 * Next: Error contract validation tests
 */
