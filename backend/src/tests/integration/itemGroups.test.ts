/**
 * Integration Tests: Item Groups Hierarchical Protection
 * Tests reparenting and deletion protection for groups with children/items
 * 
 * Coverage Target: 80%+ (critical business logic)
 */

import request from 'supertest';
import app from '../../app';
import { Pool } from 'pg';

describe('Item Groups - Hierarchical Protection', () => {
  let authToken: string;
  let pool: Pool;
  let parentGroup: any;
  let childGroup: any;
  let emptyGroup: any;
  let groupWithItems: any;
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

    // Create parent group
    const res1 = await request(app)
      .post('/api/master/item-groups')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        code: `PARENT-${Date.now()}`,
        name: 'Parent Group',
        name_ar: 'مجموعة أب',
      });
    parentGroup = res1.body;

    // Create child group under parent
    const res2 = await request(app)
      .post('/api/master/item-groups')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        code: `CHILD-${Date.now()}`,
        name: 'Child Group',
        name_ar: 'مجموعة فرعية',
        parent_id: parentGroup.id,
      });
    childGroup = res2.body;

    // Create empty group
    const res3 = await request(app)
      .post('/api/master/item-groups')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        code: `EMPTY-${Date.now()}`,
        name: 'Empty Group',
        name_ar: 'مجموعة فارغة',
      });
    emptyGroup = res3.body;

    // Create group with items
    const res4 = await request(app)
      .post('/api/master/item-groups')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        code: `WITH-ITEMS-${Date.now()}`,
        name: 'Group With Items',
        name_ar: 'مجموعة بأصناف',
      });
    groupWithItems = res4.body;

    // Create item in this group
    const itemRes = await request(app)
      .post('/api/master/items')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        code: `ITEM-${Date.now()}`,
        name: 'Test Item',
        name_ar: 'صنف تجريبي',
        item_group_id: groupWithItems.id,
        base_uom_id: 1,
        tracking_policy: 'none',
        valuation_method: 'fifo',
        is_composite: false,
        is_active: true,
      });
    testItem = itemRes.body;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM items WHERE code LIKE $1', ['ITEM-%']);
    await pool.query('DELETE FROM item_groups WHERE code LIKE $1', ['PARENT-%']);
    await pool.query('DELETE FROM item_groups WHERE code LIKE $1', ['CHILD-%']);
    await pool.query('DELETE FROM item_groups WHERE code LIKE $1', ['EMPTY-%']);
    await pool.query('DELETE FROM item_groups WHERE code LIKE $1', ['WITH-ITEMS-%']);
    await pool.end();
  });

  describe('❌ PUT - Reparenting Protection', () => {
    it('should block reparenting when group has child groups', async () => {
      const res = await request(app)
        .put(`/api/master/item-groups/${parentGroup.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...parentGroup,
          parent_id: emptyGroup.id, // Try to move parent under another group
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toHaveProperty('code', 'GROUP_HAS_CHILDREN');
      expect(res.body.error.message).toContain('child');
    });

    it('should block reparenting when group has items', async () => {
      const res = await request(app)
        .put(`/api/master/item-groups/${groupWithItems.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...groupWithItems,
          parent_id: emptyGroup.id,
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toHaveProperty('code', 'GROUP_HAS_ITEMS');
      expect(res.body.error.message).toContain('item');
    });
  });

  describe('✅ PUT - Allowed Changes', () => {
    it('should allow reparenting empty group', async () => {
      const res = await request(app)
        .put(`/api/master/item-groups/${emptyGroup.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...emptyGroup,
          parent_id: parentGroup.id,
        });

      expect(res.status).toBe(200);
      expect(res.body.parent_id).toBe(parentGroup.id);
    });

    it('should allow name change even when group has children', async () => {
      const res = await request(app)
        .put(`/api/master/item-groups/${parentGroup.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...parentGroup,
          name: 'Updated Parent Name',
        });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated Parent Name');
    });

    it('should allow description change when group has items', async () => {
      const res = await request(app)
        .put(`/api/master/item-groups/${groupWithItems.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...groupWithItems,
          description: 'Updated description',
        });

      expect(res.status).toBe(200);
      expect(res.body.description).toBe('Updated description');
    });
  });

  describe('❌ DELETE - Deletion Protection', () => {
    it('should block deletion when group has child groups', async () => {
      const res = await request(app)
        .delete(`/api/master/item-groups/${parentGroup.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(409);
      expect(res.body.error).toHaveProperty('code', 'GROUP_HAS_CHILDREN');
    });

    it('should block deletion when group has items', async () => {
      const res = await request(app)
        .delete(`/api/master/item-groups/${groupWithItems.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(409);
      expect(res.body.error).toHaveProperty('code', 'GROUP_HAS_ITEMS');
    });

    it('should NOT soft-delete when blocked', async () => {
      await request(app)
        .delete(`/api/master/item-groups/${parentGroup.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      // Verify NOT deleted
      const checkRes = await pool.query(
        'SELECT deleted_at FROM item_groups WHERE id = $1',
        [parentGroup.id]
      );
      expect(checkRes.rows[0].deleted_at).toBeNull();
    });
  });

  describe('✅ DELETE - Allowed Deletions', () => {
    it('should allow deletion of empty group', async () => {
      // First, remove empty group from parent (we reparented it earlier)
      await request(app)
        .put(`/api/master/item-groups/${emptyGroup.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...emptyGroup,
          parent_id: null,
        });

      const res = await request(app)
        .delete(`/api/master/item-groups/${emptyGroup.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('deleted');

      // Verify soft-deleted
      const checkRes = await pool.query(
        'SELECT deleted_at FROM item_groups WHERE id = $1',
        [emptyGroup.id]
      );
      expect(checkRes.rows[0].deleted_at).not.toBeNull();
    });
  });

  describe('🔒 Error Response Format', () => {
    it('should return proper error structure for GROUP_HAS_CHILDREN', async () => {
      const res = await request(app)
        .delete(`/api/master/item-groups/${parentGroup.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.body).toMatchObject({
        error: {
          code: 'GROUP_HAS_CHILDREN',
          message: expect.any(String),
        },
      });
    });

    it('should return proper error structure for GROUP_HAS_ITEMS', async () => {
      const res = await request(app)
        .delete(`/api/master/item-groups/${groupWithItems.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.body).toMatchObject({
        error: {
          code: 'GROUP_HAS_ITEMS',
          message: expect.any(String),
        },
      });
    });
  });

  describe('🔐 Edge Cases', () => {
    it('should require authentication for PUT', async () => {
      const res = await request(app)
        .put(`/api/master/item-groups/${parentGroup.id}`)
        .send({ name: 'Test' });

      expect(res.status).toBe(401);
    });

    it('should require authentication for DELETE', async () => {
      const res = await request(app)
        .delete(`/api/master/item-groups/${parentGroup.id}`);

      expect(res.status).toBe(401);
    });

    it('should return 404 for non-existent group', async () => {
      const res = await request(app)
        .delete('/api/master/item-groups/99999999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });
  });
});

/**
 * Test Coverage Summary:
 * 
 * ✅ PUT reparenting - blocked (2 tests)
 * ✅ PUT allowed changes (3 tests)
 * ✅ DELETE protection - blocked (3 tests)
 * ✅ DELETE allowed (1 test)
 * ✅ Error format validation (2 tests)
 * ✅ Edge cases (3 tests)
 * 
 * Total: 14 integration tests
 * 
 * Backend Integration Tests Complete!
 * Next Steps:
 * 1. Run all backend tests: npm test
 * 2. Move to frontend component tests (ItemProfileSlideOver.test.tsx)
 */
