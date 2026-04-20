import { Router, Request, Response } from 'express';
import pool from '../../db';
import { authenticate } from '../../middleware/auth';
import { loadCompanyContext } from '../../middleware/companyContext';
import { requirePermission } from '../../middleware/rbac';
import { sendSuccess, sendError } from '../../utils/response';
import logger from '../../utils/logger';

const router = Router();

router.use(authenticate);
router.use(loadCompanyContext);

// ─── GET /item/:itemId — Barcodes for a specific item ───────────────
router.get(
  '/item/:itemId',
  requirePermission('master:item_barcodes:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      if (!companyId) return sendError(res, 'COMPANY_REQUIRED', 'Company context required', 400);

      const result = await pool.query(
        `SELECT b.*, COALESCE(u.name_en, u.name) AS uom_name, u.name_ar AS uom_name_ar
         FROM item_barcodes b
         LEFT JOIN units_of_measure u ON u.id = b.uom_id AND u.deleted_at IS NULL
         WHERE b.company_id = $1 AND b.item_id = $2 AND b.deleted_at IS NULL
         ORDER BY b.is_primary DESC, b.barcode ASC`,
        [companyId, req.params.itemId]
      );

      sendSuccess(res, result.rows);
    } catch (error) {
      logger.error('Error fetching item barcodes:', error);
      sendError(res, 'FETCH_ERROR', 'Failed to fetch item barcodes', 500);
    }
  }
);

// ─── GET /lookup/:barcode — Lookup by barcode value (for scanning) ──
router.get(
  '/lookup/:barcode',
  requirePermission('master:item_barcodes:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      if (!companyId) return sendError(res, 'COMPANY_REQUIRED', 'Company context required', 400);

      const { barcode } = req.params;
      const result = await pool.query(
        `SELECT b.*, i.code AS item_code, COALESCE(i.name_en, i.name) AS item_name, i.name_ar AS item_name_ar,
                COALESCE(u.name_en, u.name) AS uom_name, u.name_ar AS uom_name_ar,
                i.sales_price, i.purchase_price
         FROM item_barcodes b
         JOIN items i ON i.id = b.item_id AND i.deleted_at IS NULL
         LEFT JOIN units_of_measure u ON u.id = b.uom_id AND u.deleted_at IS NULL
         WHERE b.company_id = $1 AND b.barcode = $2 AND b.deleted_at IS NULL AND b.is_active = TRUE
         ORDER BY b.is_primary DESC
         LIMIT 1`,
        [companyId, barcode]
      );

      if (result.rows.length === 0) {
        return sendError(res, 'NOT_FOUND', 'Barcode not found', 404);
      }
      sendSuccess(res, result.rows[0]);
    } catch (error) {
      logger.error('Error looking up barcode:', error);
      sendError(res, 'FETCH_ERROR', 'Failed to lookup barcode', 500);
    }
  }
);

// ─── GET / — List barcodes with item & UOM info, pagination, search ──
router.get(
  '/',
  requirePermission('master:item_barcodes:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      if (!companyId) return sendError(res, 'COMPANY_REQUIRED', 'Company context required', 400);

      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(500, Math.max(1, parseInt(req.query.limit as string) || 50));
      const offset = (page - 1) * limit;
      const search = (req.query.search as string || '').trim();
      const itemId = req.query.item_id ? parseInt(req.query.item_id as string) : null;

      let where = `b.company_id = $1 AND b.deleted_at IS NULL`;
      const params: any[] = [companyId];
      let paramIdx = 2;

      if (search) {
        where += ` AND (b.barcode ILIKE $${paramIdx} OR COALESCE(i.name_en, i.name) ILIKE $${paramIdx} OR i.name_ar ILIKE $${paramIdx} OR i.code ILIKE $${paramIdx})`;
        params.push(`%${search}%`);
        paramIdx++;
      }

      if (itemId) {
        where += ` AND b.item_id = $${paramIdx}`;
        params.push(itemId);
        paramIdx++;
      }

      const countRes = await pool.query(
        `SELECT count(*) FROM item_barcodes b JOIN items i ON i.id = b.item_id WHERE ${where}`,
        params
      );
      const total = parseInt(countRes.rows[0].count);

      const dataRes = await pool.query(
        `SELECT b.id, b.item_id, b.uom_id, b.barcode, b.barcode_type, b.is_primary, b.is_active, b.notes,
                b.created_at, b.updated_at,
                i.code AS item_code, COALESCE(i.name_en, i.name) AS item_name, i.name_ar AS item_name_ar,
                COALESCE(u.name_en, u.name) AS uom_name, u.name_ar AS uom_name_ar,
                COALESCE(bu.name_en, bu.name) AS base_uom_name
         FROM item_barcodes b
         JOIN items i ON i.id = b.item_id
         LEFT JOIN units_of_measure u ON u.id = b.uom_id AND u.deleted_at IS NULL
         LEFT JOIN units_of_measure bu ON bu.id = i.base_uom_id AND bu.deleted_at IS NULL
         WHERE ${where}
         ORDER BY i.code ASC, b.is_primary DESC, b.barcode ASC
         LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
        [...params, limit, offset]
      );

      sendSuccess(res, dataRes.rows, 200, { total, page, limit, pages: Math.ceil(total / limit) });
    } catch (error) {
      logger.error('Error listing item barcodes:', error);
      sendError(res, 'FETCH_ERROR', 'Failed to fetch barcodes', 500);
    }
  }
);

// ─── GET /:id — Single barcode detail ───────────────────────────────
router.get(
  '/:id',
  requirePermission('master:item_barcodes:view'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      if (!companyId) return sendError(res, 'COMPANY_REQUIRED', 'Company context required', 400);

      const result = await pool.query(
        `SELECT b.*, i.code AS item_code, COALESCE(i.name_en, i.name) AS item_name, i.name_ar AS item_name_ar,
                COALESCE(u.name_en, u.name) AS uom_name, u.name_ar AS uom_name_ar
         FROM item_barcodes b
         JOIN items i ON i.id = b.item_id
         LEFT JOIN units_of_measure u ON u.id = b.uom_id AND u.deleted_at IS NULL
         WHERE b.id = $1 AND b.company_id = $2 AND b.deleted_at IS NULL`,
        [req.params.id, companyId]
      );

      if (result.rows.length === 0) {
        return sendError(res, 'NOT_FOUND', 'Barcode not found', 404);
      }
      sendSuccess(res, result.rows[0]);
    } catch (error) {
      logger.error('Error fetching barcode:', error);
      sendError(res, 'FETCH_ERROR', 'Failed to fetch barcode', 500);
    }
  }
);

// ─── POST / — Create barcode ────────────────────────────────────────
router.post(
  '/',
  requirePermission('master:item_barcodes:create'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      const userId = (req as any).user?.id;
      if (!companyId) return sendError(res, 'COMPANY_REQUIRED', 'Company context required', 400);

      const { item_id, uom_id, barcode, barcode_type, is_primary, notes } = req.body;

      if (!item_id || !barcode?.trim()) {
        return sendError(res, 'VALIDATION_ERROR', 'item_id and barcode are required', 400);
      }

      // Validate item exists
      const itemCheck = await pool.query(
        'SELECT id, base_uom_id FROM items WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
        [item_id, companyId]
      );
      if (itemCheck.rows.length === 0) {
        return sendError(res, 'VALIDATION_ERROR', 'Item not found', 400);
      }

      // Check barcode uniqueness
      const dupCheck = await pool.query(
        'SELECT id FROM item_barcodes WHERE company_id = $1 AND barcode = $2 AND deleted_at IS NULL',
        [companyId, barcode.trim()]
      );
      if (dupCheck.rows.length > 0) {
        return sendError(res, 'DUPLICATE', 'Barcode already exists', 409);
      }

      // If setting as primary, unset other primaries for this item
      if (is_primary) {
        await pool.query(
          `UPDATE item_barcodes SET is_primary = FALSE, updated_at = NOW()
           WHERE company_id = $1 AND item_id = $2 AND deleted_at IS NULL AND is_primary = TRUE`,
          [companyId, item_id]
        );
      }

      const result = await pool.query(
        `INSERT INTO item_barcodes (company_id, item_id, uom_id, barcode, barcode_type, is_primary, is_active, notes, created_by, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7, $8, $8)
         RETURNING *`,
        [companyId, item_id, uom_id || itemCheck.rows[0].base_uom_id, barcode.trim(),
         barcode_type || 'EAN-13', is_primary || false, notes || null, userId]
      );

      // Reverse sync: if this new barcode is primary, update items.barcode
      if (is_primary) {
        try {
          await pool.query(
            'UPDATE items SET barcode = $1, updated_at = NOW() WHERE id = $2 AND company_id = $3 AND deleted_at IS NULL',
            [barcode.trim(), item_id, companyId]
          );
        } catch (e) { logger.warn('Reverse sync (create primary) failed:', e); }
      }

      sendSuccess(res, result.rows[0], 201, undefined, 'Barcode created successfully');
    } catch (error) {
      logger.error('Error creating barcode:', error);
      sendError(res, 'CREATE_ERROR', 'Failed to create barcode', 500);
    }
  }
);

// ─── PUT /:id — Update barcode ──────────────────────────────────────
router.put(
  '/:id',
  requirePermission('master:item_barcodes:edit'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      const userId = (req as any).user?.id;
      if (!companyId) return sendError(res, 'COMPANY_REQUIRED', 'Company context required', 400);

      const { id } = req.params;
      const { barcode, barcode_type, uom_id, is_primary, is_active, notes } = req.body;

      // Check exists
      const existing = await pool.query(
        'SELECT * FROM item_barcodes WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
        [id, companyId]
      );
      if (existing.rows.length === 0) {
        return sendError(res, 'NOT_FOUND', 'Barcode not found', 404);
      }

      const row = existing.rows[0];
      const newBarcode = barcode?.trim() || row.barcode;

      // Check uniqueness if barcode changed
      if (newBarcode !== row.barcode) {
        const dupCheck = await pool.query(
          'SELECT id FROM item_barcodes WHERE company_id = $1 AND barcode = $2 AND deleted_at IS NULL AND id != $3',
          [companyId, newBarcode, id]
        );
        if (dupCheck.rows.length > 0) {
          return sendError(res, 'DUPLICATE', 'Barcode already exists', 409);
        }
      }

      // If setting as primary, unset others
      const setPrimary = is_primary !== undefined ? is_primary : row.is_primary;
      if (setPrimary && !row.is_primary) {
        await pool.query(
          `UPDATE item_barcodes SET is_primary = FALSE, updated_at = NOW()
           WHERE company_id = $1 AND item_id = $2 AND deleted_at IS NULL AND is_primary = TRUE AND id != $3`,
          [companyId, row.item_id, id]
        );
      }

      const result = await pool.query(
        `UPDATE item_barcodes
         SET barcode = $1, barcode_type = $2, uom_id = $3, is_primary = $4, is_active = $5, notes = $6,
             updated_by = $7, updated_at = NOW()
         WHERE id = $8 AND company_id = $9
         RETURNING *`,
        [newBarcode, barcode_type || row.barcode_type, uom_id !== undefined ? uom_id : row.uom_id,
         setPrimary, is_active !== undefined ? is_active : row.is_active,
         notes !== undefined ? notes : row.notes, userId, id, companyId]
      );

      // Reverse sync: update items.barcode when primary barcode changes
      if (setPrimary) {
        try {
          await pool.query(
            'UPDATE items SET barcode = $1, updated_at = NOW() WHERE id = $2 AND company_id = $3 AND deleted_at IS NULL',
            [newBarcode, row.item_id, companyId]
          );
        } catch (e) { logger.warn('Reverse sync (update primary) failed:', e); }
      }

      sendSuccess(res, result.rows[0], 200, undefined, 'Barcode updated successfully');
    } catch (error) {
      logger.error('Error updating barcode:', error);
      sendError(res, 'UPDATE_ERROR', 'Failed to update barcode', 500);
    }
  }
);

// ─── DELETE /:id — Soft-delete barcode ──────────────────────────────
router.delete(
  '/:id',
  requirePermission('master:item_barcodes:delete'),
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      if (!companyId) return sendError(res, 'COMPANY_REQUIRED', 'Company context required', 400);

      // Fetch barcode before deleting to check if it's primary
      const existing = await pool.query(
        'SELECT id, item_id, barcode, is_primary FROM item_barcodes WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
        [req.params.id, companyId]
      );
      if (existing.rows.length === 0) {
        return sendError(res, 'NOT_FOUND', 'Barcode not found', 404);
      }
      const deletedRow = existing.rows[0];

      const result = await pool.query(
        `UPDATE item_barcodes SET deleted_at = NOW(), updated_at = NOW()
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
         RETURNING id`,
        [req.params.id, companyId]
      );

      // Reverse sync: if deleted barcode was primary, update items.barcode
      if (deletedRow.is_primary) {
        try {
          // Find next active barcode for this item, or clear
          const next = await pool.query(
            'SELECT barcode FROM item_barcodes WHERE item_id = $1 AND company_id = $2 AND deleted_at IS NULL AND is_active = TRUE ORDER BY id ASC LIMIT 1',
            [deletedRow.item_id, companyId]
          );
          const nextBarcode = next.rows.length > 0 ? next.rows[0].barcode : null;
          await pool.query(
            'UPDATE items SET barcode = $1, updated_at = NOW() WHERE id = $2 AND company_id = $3 AND deleted_at IS NULL',
            [nextBarcode, deletedRow.item_id, companyId]
          );
          // If there's a next barcode, make it primary
          if (next.rows.length > 0) {
            await pool.query(
              'UPDATE item_barcodes SET is_primary = TRUE, updated_at = NOW() WHERE item_id = $1 AND company_id = $2 AND barcode = $3 AND deleted_at IS NULL',
              [deletedRow.item_id, companyId, nextBarcode]
            );
          }
        } catch (e) { logger.warn('Reverse sync (delete primary) failed:', e); }
      }

      sendSuccess(res, { id: result.rows[0].id }, 200, undefined, 'Barcode deleted successfully');
    } catch (error) {
      logger.error('Error deleting barcode:', error);
      sendError(res, 'DELETE_ERROR', 'Failed to delete barcode', 500);
    }
  }
);

export default router;
