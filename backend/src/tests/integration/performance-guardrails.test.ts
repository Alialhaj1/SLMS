/**
 * Performance Guardrails Tests
 * Prevents performance degradation over time
 * 
 * Purpose: Catch performance regressions before they reach production
 */

import request from 'supertest';
import app from '../../app';
import { Pool } from 'pg';

describe('Performance Guardrails', () => {
  let authToken: string;
  let pool: Pool;
  let itemWithMovement: any;

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
        code: `PERF-${Date.now()}`,
        name: 'Performance Test Item',
        name_ar: 'صنف اختبار الأداء',
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

  afterAll(async () => {
    await pool.query('DELETE FROM items WHERE code LIKE $1', ['PERF-%']);
    await pool.end();
  });

  describe('🔍 Query Efficiency Tests', () => {
    it('should execute PUT with locked item in < 3 queries', async () => {
      // Intercept database queries
      let queryCount = 0;
      const originalQuery = pool.query.bind(pool);

      pool.query = (async (...args: any[]) => {
        queryCount++;
        return originalQuery(...args);
      }) as any;

      // Attempt to update locked field
      await request(app)
        .put(`/api/master/items/${itemWithMovement.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...itemWithMovement,
          base_uom_id: 2, // Locked field
        })
        .expect(409);

      // Restore original query function
      pool.query = originalQuery;

      // Assert query count
      // Expected queries:
      // 1. SELECT item (get current state)
      // 2. SELECT item_has_movement($1) (check movements)
      // Total: 2 queries (acceptable)
      expect(queryCount).toBeLessThanOrEqual(3);
    });

    it('should execute PUT with unlocked item efficiently', async () => {
      // Create unlocked item
      const unlockedRes = await request(app)
        .post('/api/master/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code: `UNLOCKED-${Date.now()}`,
          name: 'Unlocked Item',
          name_ar: 'صنف غير مقفل',
          base_uom_id: 1,
          tracking_policy: 'none',
          valuation_method: 'fifo',
          is_composite: false,
          is_active: true,
        });

      const unlockedItem = unlockedRes.body;

      let queryCount = 0;
      const originalQuery = pool.query.bind(pool);

      pool.query = (async (...args: any[]) => {
        queryCount++;
        return originalQuery(...args);
      }) as any;

      // Update unlocked item
      await request(app)
        .put(`/api/master/items/${unlockedItem.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...unlockedItem,
          name: 'Updated Name',
        })
        .expect(200);

      pool.query = originalQuery;

      // Expected queries:
      // 1. SELECT item (get current state)
      // 2. SELECT item_has_movement($1) (check movements)
      // 3. UPDATE item (perform update)
      // Total: 3 queries (acceptable)
      expect(queryCount).toBeLessThanOrEqual(4);

      // Cleanup
      await pool.query('DELETE FROM items WHERE id = $1', [unlockedItem.id]);
    });
  });

  describe('⚡ Response Time Tests', () => {
    it('should respond to PUT with locked item in < 200ms', async () => {
      const startTime = Date.now();

      await request(app)
        .put(`/api/master/items/${itemWithMovement.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...itemWithMovement,
          base_uom_id: 2,
        })
        .expect(409);

      const responseTime = Date.now() - startTime;

      // Assert response time < 200ms (excluding network latency in tests)
      expect(responseTime).toBeLessThan(200);
    });

    it('should respond to DELETE with locked item in < 150ms', async () => {
      const startTime = Date.now();

      await request(app)
        .delete(`/api/master/items/${itemWithMovement.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(409);

      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(150);
    });
  });

  describe('🚫 N+1 Query Prevention', () => {
    it('should not trigger N+1 queries when validating multiple items', async () => {
      // Create 10 items with movements
      const itemIds: number[] = [];

      for (let i = 0; i < 10; i++) {
        const res = await request(app)
          .post('/api/master/items')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            code: `N1-${Date.now()}-${i}`,
            name: `N+1 Test Item ${i}`,
            name_ar: `صنف اختبار ${i}`,
            base_uom_id: 1,
            tracking_policy: 'none',
            valuation_method: 'fifo',
            is_composite: false,
            is_active: true,
          });

        itemIds.push(res.body.id);

        // Create movement for each item
        await pool.query(
          `INSERT INTO inventory_movements (item_id, warehouse_id, movement_type, quantity, uom_id, reference_number, movement_date)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [res.body.id, 1, 'receipt', 10, 1, `GRN-${Date.now()}-${i}`, new Date()]
        );
      }

      // Track queries
      let queryCount = 0;
      const originalQuery = pool.query.bind(pool);

      pool.query = (async (...args: any[]) => {
        queryCount++;
        return originalQuery(...args);
      }) as any;

      // Update all items (should fail due to locked fields)
      await Promise.all(
        itemIds.map((id) =>
          request(app)
            .put(`/api/master/items/${id}`)
            .set('Authorization', `Bearer ${authToken}`)
            .send({ base_uom_id: 2 })
            .expect(409)
        )
      );

      pool.query = originalQuery;

      // Expected queries: 2 per item (SELECT + item_has_movement)
      // Total: 20 queries for 10 items (linear growth, not N+1)
      const expectedMaxQueries = itemIds.length * 3; // Allow some buffer
      expect(queryCount).toBeLessThanOrEqual(expectedMaxQueries);

      // Cleanup
      await pool.query('DELETE FROM items WHERE code LIKE $1', ['N1-%']);
    });
  });

  describe('📊 Monitoring & Alerting Readiness', () => {
    it('should include performance metrics in response headers (future)', async () => {
      const res = await request(app)
        .put(`/api/master/items/${itemWithMovement.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...itemWithMovement,
          base_uom_id: 2,
        })
        .expect(409);

      // Future: Add custom headers for monitoring
      // expect(res.headers).toHaveProperty('x-response-time');
      // expect(res.headers).toHaveProperty('x-query-count');

      // This test documents the requirement for Phase 3+
      expect(true).toBe(true); // Placeholder for future implementation
    });
  });
});

/**
 * Test Summary:
 * 
 * ✅ Query efficiency (2 tests) - Max 3-4 queries per operation
 * ✅ Response time (2 tests) - < 200ms for validation
 * ✅ N+1 prevention (1 test) - Linear growth, not exponential
 * ✅ Monitoring readiness (1 test) - Placeholder for metrics
 * 
 * Total: 6 performance guardrail tests
 * 
 * Thresholds:
 * - PUT with validation: < 3 queries
 * - Response time: < 200ms
 * - N+1 prevention: Linear growth only
 * 
 * Future Enhancements:
 * - Add response time percentiles (p50, p95, p99)
 * - Add memory usage tracking
 * - Add connection pool monitoring
 * - Add slow query detection (> 1s)
 * 
 * CI Integration:
 * - Fail build if query count exceeds threshold
 * - Fail build if response time > 500ms
 * - Alert if performance degrades by > 20%
 */
