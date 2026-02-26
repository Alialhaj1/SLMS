import { Router } from 'express';
import { sendSuccess } from '../utils/response';
import pool from '../db';

const router = Router();

// GET /api/lookup - List available lookup types
router.get('/', async (req, res) => {
  sendSuccess(res, { 
    message: 'Lookup Data API',
    available: ['countries', 'currencies', 'cities', 'units', 'payment-terms', 'payment-methods']
  });
});

// GET /api/lookup/:type - Get lookup data by type
router.get('/:type', async (req, res) => {
  const { type } = req.params;
  try {
    let tableName = '';
    switch (type) {
      case 'countries': tableName = 'countries'; break;
      case 'currencies': tableName = 'currencies'; break;
      case 'cities': tableName = 'cities'; break;
      case 'units': tableName = 'units'; break;
      default:
        return sendSuccess(res, { data: [] });
    }
    const result = await pool.query(
      `SELECT id, name_en, name_ar FROM ${tableName} WHERE deleted_at IS NULL ORDER BY name_en LIMIT 500`
    );
    sendSuccess(res, { data: result.rows });
  } catch {
    sendSuccess(res, { data: [] });
  }
});

export default router;
