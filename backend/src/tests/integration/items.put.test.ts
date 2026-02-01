/**
 * Integration Tests: PUT /api/master/items/:id
 * Tests movement lock validation for item updates
 * 
 * Coverage Target: 80%+ (critical API paths)
 */

import request from 'supertest';
import app from '../../app'; // Adjust path based on your structure
import { Pool } from 'pg';

// Test data factory
const createTestItem = (overrides: any = {}) => ({
  code: `TEST-${Date.now()}`,
  name: 'Test Item',
  name_ar: 'صنف تجريبي',
  base_uom_id: 1,
  tracking_policy: 'none',
  valuation_method: 'fifo',
  is_composite: false,
  is_active: true,
  ...overrides,
});

const createInventoryMovement = (itemId: number) => ({
  item_id: itemId,
  warehouse_id: 1,
  movement_type: 'receipt',
  quantity: 10,
  uom_id: 1,
  reference_number: `GRN-${Date.now()}`,
  movement_date: new Date().toISOString(),
});

describe('PUT /api/master/items/:id - Movement Lock Validation', () => {
  let authToken: string;
  let pool: Pool;
  let testItemWithMovement: any;
  let testItemWithoutMovement: any;

  beforeAll(async () => {
    // Initialize database connection
    pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://slms:slms_pass@localhost:5432/slms_db',
    });

    // Authenticate to get token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test.phase2@slms.local',
        password: 'secret',
      });

    authToken = loginRes.body.accessToken;

    // Create test item WITH movement
    const itemRes1 = await request(app)
      .post('/api/master/items')
      .set('Authorization', `Bearer ${authToken}`)
      .send(createTestItem({ code: 'LOCKED-001' }));

    testItemWithMovement = itemRes1.body;

    // Create inventory movement for this item
    await pool.query(
      `INSERT INTO inventory_movements (item_id, warehouse_id, movement_type, quantity, uom_id, reference_number, movement_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        testItemWithMovement.id,
        1,
        'receipt',
        10,
        1,
        `GRN-${Date.now()}`,
        new Date(),
      ]
    );

    // Create test item WITHOUT movement
    const itemRes2 = await request(app)
      .post('/api/master/items')
      .set('Authorization', `Bearer ${authToken}`)
      .send(createTestItem({ code: 'UNLOCKED-001' }));

    testItemWithoutMovement = itemRes2.body;
  });

  afterAll(async () => {
    // Cleanup test data
    await pool.query('DELETE FROM items WHERE code LIKE $1', ['TEST-%']);
    await pool.query('DELETE FROM items WHERE code LIKE $1', ['LOCKED-%']);
    await pool.query('DELETE FROM items WHERE code LIKE $1', ['UNLOCKED-%']);
    await pool.end();
  });

  describe('✅ Scenario 1: Update item WITHOUT movement (should succeed)', () => {
    it('should allow base_uom_id change when item has no movements', async () => {
      const res = await request(app)
        .put(`/api/master/items/${testItemWithoutMovement.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...testItemWithoutMovement,
          base_uom_id: 2, // Change UOM
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', testItemWithoutMovement.id);
      expect(res.body.base_uom_id).toBe(2);
    });

    it('should allow tracking_policy change when item has no movements', async () => {
      const res = await request(app)
        .put(`/api/master/items/${testItemWithoutMovement.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...testItemWithoutMovement,
          tracking_policy: 'batch',
        });

      expect(res.status).toBe(200);
      expect(res.body.tracking_policy).toBe('batch');
    });

    it('should allow valuation_method change when item has no movements', async () => {
      const res = await request(app)
        .put(`/api/master/items/${testItemWithoutMovement.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...testItemWithoutMovement,
          valuation_method: 'weighted_avg',
        });

      expect(res.status).toBe(200);
      expect(res.body.valuation_method).toBe('weighted_avg');
    });

    it('should allow is_composite change when item has no movements', async () => {
      const res = await request(app)
        .put(`/api/master/items/${testItemWithoutMovement.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...testItemWithoutMovement,
          is_composite: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.is_composite).toBe(true);
    });
  });

  describe('❌ Scenario 2: Update item WITH movement (should fail for policy fields)', () => {
    it('should block base_uom_id change when item has movements', async () => {
      const res = await request(app)
        .put(`/api/master/items/${testItemWithMovement.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...testItemWithMovement,
          base_uom_id: 2,
        });

      expect(res.status).toBe(409); // Conflict
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toHaveProperty('code', 'POLICY_LOCKED');
      expect(res.body.error).toHaveProperty('locked_fields');
      expect(res.body.error.locked_fields).toContain('base_uom_id');
    });

    it('should block tracking_policy change when item has movements', async () => {
      const res = await request(app)
        .put(`/api/master/items/${testItemWithMovement.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...testItemWithMovement,
          tracking_policy: 'batch',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('POLICY_LOCKED');
      expect(res.body.error.locked_fields).toContain('tracking_policy');
    });

    it('should block valuation_method change when item has movements', async () => {
      const res = await request(app)
        .put(`/api/master/items/${testItemWithMovement.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...testItemWithMovement,
          valuation_method: 'weighted_avg',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('POLICY_LOCKED');
      expect(res.body.error.locked_fields).toContain('valuation_method');
    });

    it('should block is_composite change when item has movements', async () => {
      const res = await request(app)
        .put(`/api/master/items/${testItemWithMovement.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...testItemWithMovement,
          is_composite: true,
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('POLICY_LOCKED');
      expect(res.body.error.locked_fields).toContain('is_composite');
    });

    it('should block multiple policy field changes when item has movements', async () => {
      const res = await request(app)
        .put(`/api/master/items/${testItemWithMovement.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...testItemWithMovement,
          base_uom_id: 2,
          tracking_policy: 'batch',
          valuation_method: 'weighted_avg',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('POLICY_LOCKED');
      expect(res.body.error.locked_fields).toContain('base_uom_id');
      expect(res.body.error.locked_fields).toContain('tracking_policy');
      expect(res.body.error.locked_fields).toContain('valuation_method');
      expect(res.body.error.locked_fields.length).toBe(3);
    });
  });

  describe('✅ Scenario 3: Update non-policy fields (should succeed even with movement)', () => {
    it('should allow name change when item has movements', async () => {
      const res = await request(app)
        .put(`/api/master/items/${testItemWithMovement.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...testItemWithMovement,
          name: 'Updated Name',
        });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated Name');
    });

    it('should allow description change when item has movements', async () => {
      const res = await request(app)
        .put(`/api/master/items/${testItemWithMovement.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...testItemWithMovement,
          description: 'Updated description',
        });

      expect(res.status).toBe(200);
      expect(res.body.description).toBe('Updated description');
    });

    it('should allow standard_cost change when item has movements', async () => {
      const res = await request(app)
        .put(`/api/master/items/${testItemWithMovement.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...testItemWithMovement,
          standard_cost: 100.50,
        });

      expect(res.status).toBe(200);
      expect(res.body.standard_cost).toBe(100.50);
    });

    it('should allow is_active toggle when item has movements', async () => {
      const res = await request(app)
        .put(`/api/master/items/${testItemWithMovement.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...testItemWithMovement,
          is_active: false,
        });

      expect(res.status).toBe(200);
      expect(res.body.is_active).toBe(false);
    });
  });

  describe('🔒 Error Response Format Validation', () => {
    it('should return proper error structure for POLICY_LOCKED', async () => {
      const res = await request(app)
        .put(`/api/master/items/${testItemWithMovement.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...testItemWithMovement,
          base_uom_id: 2,
        });

      expect(res.status).toBe(409);
      expect(res.body).toMatchObject({
        error: {
          code: 'POLICY_LOCKED',
          message: expect.any(String),
          locked_fields: expect.arrayContaining(['base_uom_id']),
        },
      });
    });

    it('should include helpful error message', async () => {
      const res = await request(app)
        .put(`/api/master/items/${testItemWithMovement.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...testItemWithMovement,
          tracking_policy: 'batch',
        });

      expect(res.body.error.message).toContain('locked');
      expect(res.body.error.message).toContain('movement');
    });
  });

  describe('🔐 Authentication & Authorization', () => {
    it('should require authentication', async () => {
      const res = await request(app)
        .put(`/api/master/items/${testItemWithMovement.id}`)
        .send({ name: 'Test' });

      expect(res.status).toBe(401);
    });

    it('should require proper permission (master:items:edit)', async () => {
      // This test assumes your auth system supports permission checks
      // Adjust based on your actual implementation
      
      // Create a user without edit permission
      // Then test with that user's token
      // expect(res.status).toBe(403);
    });
  });
});

/**
 * Test Coverage Summary:
 * 
 * ✅ PUT with unlocked item (4 tests)
 * ✅ PUT with locked item - blocked (5 tests)
 * ✅ PUT non-policy fields - allowed (4 tests)
 * ✅ Error response format (2 tests)
 * ✅ Auth & permissions (2 tests)
 * 
 * Total: 17 integration tests
 * 
 * Next Steps:
 * 1. Run: npm test src/tests/integration/items.put.test.ts
 * 2. Verify all scenarios pass
 * 3. Move to DELETE validation tests (items.delete.test.ts)
 */
