/**
 * §13.3.6 — Document Management Service
 *
 * Cross-entity document/file attachments.
 * Stores metadata in `documents` table (migration 413).
 * Files are stored on disk under /uploads/documents/{entity_type}/{entity_id}/
 *
 * Replaces the stub `shipmentDocuments.ts` route with a full implementation
 * that supports documents attached to any entity type.
 */

import pool from '../db';
import { logger } from '../utils/logger';
import path from 'path';
import fs from 'fs';

const UPLOAD_BASE = path.join(process.cwd(), 'uploads', 'documents');

export class DocumentService {
  /**
   * List documents for an entity.
   */
  static async listByEntity(
    entityType: string,
    entityId: number,
    tenantId: number | null
  ): Promise<unknown[]> {
    const params: unknown[] = [entityType, entityId];
    let tenantFilter = '';
    if (tenantId) {
      tenantFilter = ' AND tenant_id = $3';
      params.push(tenantId);
    }

    const result = await pool.query(
      `SELECT id, entity_type, entity_id, file_name, original_name, mime_type,
              file_size, file_path, category, description, uploaded_by, created_at
       FROM documents
       WHERE entity_type = $1 AND entity_id = $2 AND deleted_at IS NULL${tenantFilter}
       ORDER BY created_at DESC`,
      params
    );
    return result.rows;
  }

  /**
   * Get a single document by ID.
   */
  static async getById(id: number, tenantId: number | null): Promise<unknown | null> {
    const params: unknown[] = [id];
    let tenantFilter = '';
    if (tenantId) {
      tenantFilter = ' AND tenant_id = $2';
      params.push(tenantId);
    }

    const result = await pool.query(
      `SELECT * FROM documents WHERE id = $1 AND deleted_at IS NULL${tenantFilter}`,
      params
    );
    return result.rows[0] || null;
  }

  /**
   * Create a document record (after file upload via multer).
   */
  static async create(data: {
    entity_type: string;
    entity_id: number;
    file_name: string;
    original_name: string;
    mime_type: string;
    file_size: number;
    file_path: string;
    category?: string;
    description?: string;
    uploaded_by: number;
    tenant_id: number | null;
  }): Promise<unknown> {
    const result = await pool.query(
      `INSERT INTO documents (entity_type, entity_id, file_name, original_name, mime_type,
                              file_size, file_path, category, description, uploaded_by, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        data.entity_type,
        data.entity_id,
        data.file_name,
        data.original_name,
        data.mime_type,
        data.file_size,
        data.file_path,
        data.category || null,
        data.description || null,
        data.uploaded_by,
        data.tenant_id,
      ]
    );
    return result.rows[0];
  }

  /**
   * Update document metadata (description, category).
   */
  static async update(id: number, data: { description?: string; category?: string }, tenantId: number | null): Promise<unknown | null> {
    const fields: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (data.description !== undefined) {
      fields.push(`description = $${idx++}`);
      params.push(data.description);
    }
    if (data.category !== undefined) {
      fields.push(`category = $${idx++}`);
      params.push(data.category);
    }

    if (fields.length === 0) return null;

    fields.push(`updated_at = NOW()`);
    params.push(id);
    let tenantFilter = '';
    if (tenantId) {
      params.push(tenantId);
      tenantFilter = ` AND tenant_id = $${idx + 1}`;
    }

    const result = await pool.query(
      `UPDATE documents SET ${fields.join(', ')} WHERE id = $${idx} AND deleted_at IS NULL${tenantFilter} RETURNING *`,
      params
    );
    return result.rows[0] || null;
  }

  /**
   * Soft delete a document and remove the file from disk.
   */
  static async delete(id: number, tenantId: number | null): Promise<boolean> {
    const params: unknown[] = [id];
    let tenantFilter = '';
    if (tenantId) {
      tenantFilter = ' AND tenant_id = $2';
      params.push(tenantId);
    }

    // Get file path before deleting
    const doc = await pool.query(
      `SELECT file_path FROM documents WHERE id = $1 AND deleted_at IS NULL${tenantFilter}`,
      params
    );

    if (doc.rows.length === 0) return false;

    // Soft delete
    await pool.query(
      `UPDATE documents SET deleted_at = NOW() WHERE id = $1${tenantFilter}`,
      params
    );

    // Try to remove physical file (non-blocking)
    const filePath = doc.rows[0].file_path;
    if (filePath) {
      try {
        const fullPath = path.join(UPLOAD_BASE, filePath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      } catch (err) {
        logger.warn('Failed to delete document file from disk', { id, filePath, error: err });
      }
    }

    return true;
  }

  /**
   * Count documents per entity type (for dashboards).
   */
  static async countByEntityType(tenantId: number | null): Promise<Record<string, number>> {
    const params: unknown[] = [];
    let tenantFilter = '';
    if (tenantId) {
      tenantFilter = ' AND tenant_id = $1';
      params.push(tenantId);
    }

    const result = await pool.query(
      `SELECT entity_type, COUNT(*)::int AS count
       FROM documents WHERE deleted_at IS NULL${tenantFilter}
       GROUP BY entity_type ORDER BY count DESC`,
      params
    );

    const counts: Record<string, number> = {};
    for (const row of result.rows) {
      counts[row.entity_type] = row.count;
    }
    return counts;
  }

  /**
   * Get upload directory path, creating it if needed.
   */
  static getUploadDir(entityType: string, entityId: number): string {
    const dir = path.join(UPLOAD_BASE, entityType, String(entityId));
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }
}
