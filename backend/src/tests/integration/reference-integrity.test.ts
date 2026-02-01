/**
 * Reference Integrity Tests
 * Validates that database referential integrity is enforced at API level
 * 
 * CTO Requirement: "لا يمكن حذف Group مرتبط بـ Items حتى لو API نُسيت"
 * 
 * Purpose:
 * - Ensure API respects foreign key constraints
 * - Verify cascading deletes work correctly
 * - Protect against data orphaning
 * - Complement database-level constraints with application-level checks
 */

import request from 'supertest';
import app from '../../app';
import pool from '../../db';

describe('Reference Integrity Tests', () => {
  let authToken: string;

  beforeAll(async () => {
    // Authenticate
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test.phase2@slms.local',
        password: 'secret',
      });

    authToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('🔗 Item Groups Reference Integrity', () => {
    let parentGroup: any;
    let childGroup: any;
    let itemInGroup: any;

    beforeEach(async () => {
      // Create parent group
      const parentRes = await request(app)
        .post('/api/master/item-groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code: `REF-PARENT-${Date.now()}`,
          name: 'Reference Parent Group',
          name_ar: 'مجموعة مرجعية رئيسية',
        });

      parentGroup = parentRes.body;

      // Create child group
      const childRes = await request(app)
        .post('/api/master/item-groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code: `REF-CHILD-${Date.now()}`,
          name: 'Reference Child Group',
          name_ar: 'مجموعة مرجعية فرعية',
          parent_id: parentGroup.id,
        });

      childGroup = childRes.body;

      // Create item in child group
      const itemRes = await request(app)
        .post('/api/master/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code: `REF-ITEM-${Date.now()}`,
          name: 'Reference Test Item',
          name_ar: 'صنف اختبار مرجعي',
          item_group_id: childGroup.id,
          base_uom_id: 1,
          tracking_policy: 'none',
          valuation_method: 'fifo',
          is_composite: false,
          is_active: true,
        });

      itemInGroup = itemRes.body;
    });

    afterEach(async () => {
      // Cleanup
      await pool.query('DELETE FROM items WHERE code LIKE $1', ['REF-ITEM-%']);
      await pool.query('DELETE FROM item_groups WHERE code LIKE $1', ['REF-CHILD-%']);
      await pool.query('DELETE FROM item_groups WHERE code LIKE $1', ['REF-PARENT-%']);
    });

    it('should NOT allow deleting group with child groups', async () => {
      // Attempt to delete parent group (has child group)
      const res = await request(app)
        .delete(`/api/master/item-groups/${parentGroup.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(409);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error.code).toBe('GROUP_HAS_CHILDREN');

      // Verify parent group still exists
      const verifyRes = await request(app)
        .get(`/api/master/item-groups/${parentGroup.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(verifyRes.body.id).toBe(parentGroup.id);
    });

    it('should NOT allow deleting group with items', async () => {
      // Attempt to delete child group (has item)
      const res = await request(app)
        .delete(`/api/master/item-groups/${childGroup.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(409);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error.code).toBe('GROUP_HAS_ITEMS');

      // Verify child group still exists
      const verifyRes = await request(app)
        .get(`/api/master/item-groups/${childGroup.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(verifyRes.body.id).toBe(childGroup.id);
    });

    it('should allow deleting group after removing items', async () => {
      // First, delete item
      await request(app)
        .delete(`/api/master/items/${itemInGroup.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Now delete child group (should succeed)
      await request(app)
        .delete(`/api/master/item-groups/${childGroup.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify child group is deleted
      await request(app)
        .get(`/api/master/item-groups/${childGroup.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should allow deleting parent after removing child groups', async () => {
      // First, delete item
      await request(app)
        .delete(`/api/master/items/${itemInGroup.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Then, delete child group
      await request(app)
        .delete(`/api/master/item-groups/${childGroup.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Now delete parent group (should succeed)
      await request(app)
        .delete(`/api/master/item-groups/${parentGroup.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify parent group is deleted
      await request(app)
        .get(`/api/master/item-groups/${parentGroup.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('🔗 Items Reference Integrity', () => {
    let itemWithMovement: any;

    beforeEach(async () => {
      // Create item
      const itemRes = await request(app)
        .post('/api/master/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code: `REF-MOV-${Date.now()}`,
          name: 'Item with Movement',
          name_ar: 'صنف بحركة',
          base_uom_id: 1,
          tracking_policy: 'none',
          valuation_method: 'fifo',
          is_composite: false,
          is_active: true,
        });

      itemWithMovement = itemRes.body;

      // Create inventory movement
      await pool.query(
        `INSERT INTO inventory_movements (item_id, warehouse_id, movement_type, quantity, uom_id, reference_number, movement_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [itemWithMovement.id, 1, 'receipt', 10, 1, `GRN-${Date.now()}`, new Date()]
      );
    });

    afterEach(async () => {
      await pool.query('DELETE FROM items WHERE code LIKE $1', ['REF-MOV-%']);
    });

    it('should NOT allow deleting item with inventory movement', async () => {
      // Attempt to delete item (has movement)
      const res = await request(app)
        .delete(`/api/master/items/${itemWithMovement.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(409);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error.code).toBe('ITEM_HAS_MOVEMENT');

      // Verify item still exists
      const verifyRes = await request(app)
        .get(`/api/master/items/${itemWithMovement.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(verifyRes.body.id).toBe(itemWithMovement.id);
    });
  });

  describe('🔗 Database-Level Constraint Validation', () => {
    it('should enforce foreign key constraints at database level', async () => {
      // This test verifies that even if API logic is bypassed,
      // database constraints still protect data integrity

      try {
        // Attempt to insert item with non-existent group (direct DB query)
        await pool.query(
          `INSERT INTO items (code, name, name_ar, item_group_id, base_uom_id, tracking_policy, valuation_method, is_composite, is_active, company_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          ['INVALID', 'Invalid Item', 'صنف غير صالح', 999999, 1, 'none', 'fifo', false, true, 1]
        );

        // Should not reach here
        fail('Expected database constraint violation');
      } catch (error: any) {
        // Expect foreign key constraint violation
        expect(error.code).toBe('23503'); // PostgreSQL foreign key violation code
      }
    });

    it('should prevent orphaned items when group is deleted (if cascading disabled)', async () => {
      // Create group and item
      const groupRes = await request(app)
        .post('/api/master/item-groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code: `ORPHAN-GROUP-${Date.now()}`,
          name: 'Orphan Test Group',
          name_ar: 'مجموعة اختبار',
        });

      const group = groupRes.body;

      const itemRes = await request(app)
        .post('/api/master/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code: `ORPHAN-ITEM-${Date.now()}`,
          name: 'Orphan Test Item',
          name_ar: 'صنف اختبار',
          item_group_id: group.id,
          base_uom_id: 1,
          tracking_policy: 'none',
          valuation_method: 'fifo',
          is_composite: false,
          is_active: true,
        });

      const item = itemRes.body;

      // Attempt to delete group (should fail due to item)
      const deleteRes = await request(app)
        .delete(`/api/master/item-groups/${group.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(409);

      expect(deleteRes.body.error.code).toBe('GROUP_HAS_ITEMS');

      // Verify item still references group
      const verifyItemRes = await request(app)
        .get(`/api/master/items/${item.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(verifyItemRes.body.item_group_id).toBe(group.id);

      // Cleanup
      await pool.query('DELETE FROM items WHERE code LIKE $1', ['ORPHAN-ITEM-%']);
      await pool.query('DELETE FROM item_groups WHERE code LIKE $1', ['ORPHAN-GROUP-%']);
    });
  });
});

/**
 * Test Summary:
 * 
 * ✅ Group with children (cannot delete)
 * ✅ Group with items (cannot delete)
 * ✅ Item with movement (cannot delete)
 * ✅ Cascading deletes (correct order)
 * ✅ Database constraints (foreign key enforcement)
 * ✅ Orphan prevention
 * 
 * Total: 7 reference integrity tests
 * 
 * Coverage:
 * - API-level checks
 * - Database-level constraints
 * - Data consistency validation
 * 
 * Future Tests:
 * - Shipment → Items reference
 * - Expense → Supplier reference
 * - Warehouse → Inventory reference
 * - User → Company reference
 */
