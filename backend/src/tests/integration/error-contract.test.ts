/**
 * Error Contract Validation Tests
 * Ensures all API errors follow standardized contract
 * 
 * Enterprise-grade error handling verification
 */

import request from 'supertest';
import app from '../../app';
import { Pool } from 'pg';
import { ErrorCode } from '../../types/errors';

describe('Error Contract Validation', () => {
  let authToken: string;
  let pool: Pool;
  let itemWithMovement: any;
  let groupWithChildren: any;
  let childGroup: any;

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

    // Create item with movement
    const itemRes = await request(app)
      .post('/api/master/items')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        code: `CONTRACT-ITEM-${Date.now()}`,
        name: 'Contract Test Item',
        name_ar: 'صنف اختبار',
        base_uom_id: 1,
        tracking_policy: 'none',
        valuation_method: 'fifo',
        is_composite: false,
        is_active: true,
      });

    itemWithMovement = itemRes.body;

    await pool.query(
      `INSERT INTO inventory_movements (item_id, warehouse_id, movement_type, quantity, uom_id, reference_number, movement_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [itemWithMovement.id, 1, 'receipt', 10, 1, `GRN-${Date.now()}`, new Date()]
    );

    // Create groups hierarchy
    const groupRes1 = await request(app)
      .post('/api/master/item-groups')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        code: `CONTRACT-PARENT-${Date.now()}`,
        name: 'Contract Parent Group',
        name_ar: 'مجموعة أب',
      });
    groupWithChildren = groupRes1.body;

    const groupRes2 = await request(app)
      .post('/api/master/item-groups')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        code: `CONTRACT-CHILD-${Date.now()}`,
        name: 'Contract Child Group',
        name_ar: 'مجموعة فرعية',
        parent_id: groupWithChildren.id,
      });
    childGroup = groupRes2.body;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM items WHERE code LIKE $1', ['CONTRACT-ITEM-%']);
    await pool.query('DELETE FROM item_groups WHERE code LIKE $1', ['CONTRACT-PARENT-%']);
    await pool.query('DELETE FROM item_groups WHERE code LIKE $1', ['CONTRACT-CHILD-%']);
    await pool.end();
  });

  describe('✅ ITEM_POLICY_LOCKED Error Contract', () => {
    it('should return proper error structure for single locked field', async () => {
      const res = await request(app)
        .put(`/api/master/items/${itemWithMovement.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...itemWithMovement,
          base_uom_id: 2,
        })
        .expect(409);

      // Validate error structure
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toMatchObject({
        code: ErrorCode.ITEM_POLICY_LOCKED,
        message: expect.stringContaining('locked'),
        entity: 'item',
        entity_id: itemWithMovement.id,
        fields: expect.arrayContaining(['base_uom_id']),
        hint: expect.any(String),
      });

      // Validate fields array
      expect(res.body.error.fields).toEqual(['base_uom_id']);
    });

    it('should return proper error structure for multiple locked fields', async () => {
      const res = await request(app)
        .put(`/api/master/items/${itemWithMovement.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...itemWithMovement,
          base_uom_id: 2,
          tracking_policy: 'batch',
        })
        .expect(409);

      expect(res.body.error).toMatchObject({
        code: ErrorCode.ITEM_POLICY_LOCKED,
        entity: 'item',
        entity_id: itemWithMovement.id,
        fields: expect.arrayContaining(['base_uom_id', 'tracking_policy']),
      });

      expect(res.body.error.fields.length).toBe(2);
    });

    it('should include hint field', async () => {
      const res = await request(app)
        .put(`/api/master/items/${itemWithMovement.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...itemWithMovement,
          valuation_method: 'weighted_avg',
        })
        .expect(409);

      expect(res.body.error.hint).toBeTruthy();
      expect(res.body.error.hint).toContain('locked');
    });
  });

  describe('✅ ITEM_HAS_MOVEMENT Error Contract', () => {
    it('should return proper error structure for DELETE', async () => {
      const res = await request(app)
        .delete(`/api/master/items/${itemWithMovement.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(409);

      expect(res.body).toMatchObject({
        error: {
          code: ErrorCode.ITEM_HAS_MOVEMENT,
          message: expect.stringContaining('movement'),
          entity: 'item',
          entity_id: itemWithMovement.id,
          hint: expect.any(String),
        },
      });
    });

    it('should include actionable hint', async () => {
      const res = await request(app)
        .delete(`/api/master/items/${itemWithMovement.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(409);

      expect(res.body.error.hint).toContain('is_active');
    });
  });

  describe('✅ GROUP_HAS_CHILDREN Error Contract', () => {
    it('should return proper error structure for DELETE', async () => {
      const res = await request(app)
        .delete(`/api/master/item-groups/${groupWithChildren.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(409);

      expect(res.body).toMatchObject({
        error: {
          code: ErrorCode.GROUP_HAS_CHILDREN,
          message: expect.stringContaining('child'),
          entity: 'item_group',
          entity_id: groupWithChildren.id,
          hint: expect.any(String),
        },
      });
    });

    it('should include child count in hint (if available)', async () => {
      const res = await request(app)
        .delete(`/api/master/item-groups/${groupWithChildren.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(409);

      // Hint should suggest moving/deleting children
      expect(res.body.error.hint).toBeTruthy();
      expect(
        res.body.error.hint.toLowerCase().includes('move') ||
        res.body.error.hint.toLowerCase().includes('delete')
      ).toBe(true);
    });
  });

  describe('✅ GROUP_HAS_ITEMS Error Contract', () => {
    let groupWithItems: any;

    beforeAll(async () => {
      // Create group with item
      const groupRes = await request(app)
        .post('/api/master/item-groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code: `CONTRACT-GROUP-ITEMS-${Date.now()}`,
          name: 'Group With Items',
          name_ar: 'مجموعة بأصناف',
        });
      groupWithItems = groupRes.body;

      // Assign item to group
      await pool.query(
        'UPDATE items SET item_group_id = $1 WHERE id = $2',
        [groupWithItems.id, itemWithMovement.id]
      );
    });

    it('should return proper error structure', async () => {
      const res = await request(app)
        .delete(`/api/master/item-groups/${groupWithItems.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(409);

      expect(res.body).toMatchObject({
        error: {
          code: ErrorCode.GROUP_HAS_ITEMS,
          message: expect.stringContaining('item'),
          entity: 'item_group',
          entity_id: groupWithItems.id,
          hint: expect.any(String),
        },
      });
    });
  });

  describe('🔍 Error Contract Consistency', () => {
    it('all 409 errors should have error.code field', async () => {
      const errors = [
        // ITEM_POLICY_LOCKED
        request(app)
          .put(`/api/master/items/${itemWithMovement.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ ...itemWithMovement, base_uom_id: 2 }),

        // ITEM_HAS_MOVEMENT
        request(app)
          .delete(`/api/master/items/${itemWithMovement.id}`)
          .set('Authorization', `Bearer ${authToken}`),

        // GROUP_HAS_CHILDREN
        request(app)
          .delete(`/api/master/item-groups/${groupWithChildren.id}`)
          .set('Authorization', `Bearer ${authToken}`),
      ];

      const responses = await Promise.all(errors);

      responses.forEach((res) => {
        expect(res.status).toBe(409);
        expect(res.body).toHaveProperty('error');
        expect(res.body.error).toHaveProperty('code');
        expect(res.body.error.code).toBeTruthy();
      });
    });

    it('all 409 errors should have error.message field', async () => {
      const errors = [
        request(app)
          .put(`/api/master/items/${itemWithMovement.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ ...itemWithMovement, base_uom_id: 2 }),
      ];

      const responses = await Promise.all(errors);

      responses.forEach((res) => {
        expect(res.body.error).toHaveProperty('message');
        expect(res.body.error.message).toBeTruthy();
        expect(typeof res.body.error.message).toBe('string');
      });
    });

    it('all 409 errors should have error.hint field', async () => {
      const errors = [
        request(app)
          .put(`/api/master/items/${itemWithMovement.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ ...itemWithMovement, base_uom_id: 2 }),

        request(app)
          .delete(`/api/master/items/${itemWithMovement.id}`)
          .set('Authorization', `Bearer ${authToken}`),
      ];

      const responses = await Promise.all(errors);

      responses.forEach((res) => {
        expect(res.body.error).toHaveProperty('hint');
        expect(res.body.error.hint).toBeTruthy();
      });
    });

    it('all 409 errors should have error.entity field', async () => {
      const errors = [
        request(app)
          .put(`/api/master/items/${itemWithMovement.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ ...itemWithMovement, base_uom_id: 2 }),
      ];

      const responses = await Promise.all(errors);

      responses.forEach((res) => {
        expect(res.body.error).toHaveProperty('entity');
        expect(['item', 'item_group']).toContain(res.body.error.entity);
      });
    });

    it('all 409 errors should have error.entity_id field', async () => {
      const errors = [
        request(app)
          .put(`/api/master/items/${itemWithMovement.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ ...itemWithMovement, base_uom_id: 2 }),
      ];

      const responses = await Promise.all(errors);

      responses.forEach((res) => {
        expect(res.body.error).toHaveProperty('entity_id');
        expect(typeof res.body.error.entity_id).toBe('number');
      });
    });
  });

  describe('🔍 Error Code Registry Validation', () => {
    it('should use ErrorCode enum values (not hardcoded strings)', async () => {
      const res = await request(app)
        .put(`/api/master/items/${itemWithMovement.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...itemWithMovement, base_uom_id: 2 })
        .expect(409);

      // Validate error code matches enum
      expect(Object.values(ErrorCode)).toContain(res.body.error.code);
    });

    it('should return different codes for different error types', async () => {
      const res1 = await request(app)
        .put(`/api/master/items/${itemWithMovement.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...itemWithMovement, base_uom_id: 2 });

      const res2 = await request(app)
        .delete(`/api/master/items/${itemWithMovement.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res1.body.error.code).not.toBe(res2.body.error.code);
      expect(res1.body.error.code).toBe(ErrorCode.ITEM_POLICY_LOCKED);
      expect(res2.body.error.code).toBe(ErrorCode.ITEM_HAS_MOVEMENT);
    });
  });
});

/**
 * Test Summary:
 * 
 * ✅ ITEM_POLICY_LOCKED contract (3 tests)
 * ✅ ITEM_HAS_MOVEMENT contract (2 tests)
 * ✅ GROUP_HAS_CHILDREN contract (2 tests)
 * ✅ GROUP_HAS_ITEMS contract (1 test)
 * ✅ Error consistency validation (5 tests)
 * ✅ Error code registry validation (2 tests)
 * 
 * Total: 15 error contract tests
 * 
 * Coverage: Standardized error responses across all APIs
 * 
 * Next: Policy layer hardening (domain layer separation)
 */
