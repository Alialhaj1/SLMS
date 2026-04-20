/**
 * §13.3.6 — Documents Route (replaces shipmentDocuments stub)
 *
 * CRUD for cross-entity document attachments.
 * Supports file upload via multer.
 *
 * GET    /api/documents?entity_type=...&entity_id=...  — List documents
 * GET    /api/documents/:id                             — Get document
 * GET    /api/documents/:id/download                    — Download file
 * POST   /api/documents                                 — Upload document
 * PATCH  /api/documents/:id                             — Update metadata
 * DELETE /api/documents/:id                             — Soft delete
 * GET    /api/documents/stats                           — Count by entity type
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { getIsolatedTenantId } from '../middleware/tenantIsolation';
import { DocumentService } from '../services/documentService';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();

// Multer config for document uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(process.cwd(), 'uploads', 'documents', 'temp');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB max
  fileFilter: (_req, file, cb) => {
    const allowed = [
      '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv',
      '.jpg', '.jpeg', '.png', '.gif', '.bmp',
      '.txt', '.rtf', '.zip', '.rar',
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${ext} not allowed`));
    }
  },
});

router.get('/stats', authenticate, requirePermission('documents:view' as any), async (req: Request, res: Response) => {
  try {
    const tenantId = getIsolatedTenantId(req as any);
    const counts = await DocumentService.countByEntityType(tenantId);
    sendSuccess(res, counts);
  } catch (err) {
    sendError(res, 'DOCUMENTS_ERROR', 'Failed to get document stats', 500);
  }
});

router.get('/', authenticate, requirePermission('documents:view' as any), async (req: Request, res: Response) => {
  try {
    const tenantId = getIsolatedTenantId(req as any);
    const { entity_type, entity_id } = req.query;

    if (!entity_type || !entity_id) {
      return sendError(res, 'VALIDATION_ERROR', 'entity_type and entity_id query params are required', 400);
    }

    const docs = await DocumentService.listByEntity(
      entity_type as string,
      parseInt(entity_id as string),
      tenantId
    );
    sendSuccess(res, docs);
  } catch (err) {
    sendError(res, 'DOCUMENTS_ERROR', 'Failed to list documents', 500);
  }
});

router.get('/:id', authenticate, requirePermission('documents:view' as any), async (req: Request, res: Response) => {
  try {
    const tenantId = getIsolatedTenantId(req as any);
    const doc = await DocumentService.getById(parseInt(req.params.id), tenantId);
    if (!doc) return sendError(res, 'NOT_FOUND', 'Document not found', 404);
    sendSuccess(res, doc);
  } catch (err) {
    sendError(res, 'DOCUMENTS_ERROR', 'Failed to get document', 500);
  }
});

router.get('/:id/download', authenticate, requirePermission('documents:view' as any), async (req: Request, res: Response) => {
  try {
    const tenantId = getIsolatedTenantId(req as any);
    const doc = await DocumentService.getById(parseInt(req.params.id), tenantId) as any;
    if (!doc) return sendError(res, 'NOT_FOUND', 'Document not found', 404);

    const filePath = path.join(process.cwd(), 'uploads', 'documents', doc.file_path);
    if (!fs.existsSync(filePath)) {
      return sendError(res, 'NOT_FOUND', 'File not found on disk', 404);
    }

    res.setHeader('Content-Disposition', `attachment; filename="${doc.original_name}"`);
    res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    sendError(res, 'DOCUMENTS_ERROR', 'Failed to download document', 500);
  }
});

router.post('/', authenticate, requirePermission('documents:create' as any), upload.single('file'), async (req: Request, res: Response) => {
  try {
    const tenantId = getIsolatedTenantId(req as any);
    const userId = (req as any).user.id;
    const file = req.file;

    if (!file) {
      return sendError(res, 'VALIDATION_ERROR', 'File is required', 400);
    }

    const { entity_type, entity_id, category, description } = req.body;
    if (!entity_type || !entity_id) {
      return sendError(res, 'VALIDATION_ERROR', 'entity_type and entity_id are required', 400);
    }

    // Move file from temp to proper directory
    const targetDir = DocumentService.getUploadDir(entity_type, parseInt(entity_id));
    const targetPath = path.join(targetDir, file.filename);
    fs.renameSync(file.path, targetPath);

    const relativePath = path.relative(
      path.join(process.cwd(), 'uploads', 'documents'),
      targetPath
    );

    const doc = await DocumentService.create({
      entity_type,
      entity_id: parseInt(entity_id),
      file_name: file.filename,
      original_name: file.originalname,
      mime_type: file.mimetype,
      file_size: file.size,
      file_path: relativePath,
      category,
      description,
      uploaded_by: userId,
      tenant_id: tenantId,
    });

    sendSuccess(res, doc, 201, undefined, 'Document uploaded');
  } catch (err) {
    sendError(res, 'DOCUMENTS_ERROR', 'Failed to upload document', 500);
  }
});

router.patch('/:id', authenticate, requirePermission('documents:update' as any), async (req: Request, res: Response) => {
  try {
    const tenantId = getIsolatedTenantId(req as any);
    const { description, category } = req.body;
    const doc = await DocumentService.update(parseInt(req.params.id), { description, category }, tenantId);
    if (!doc) return sendError(res, 'NOT_FOUND', 'Document not found', 404);
    sendSuccess(res, doc, 200, undefined, 'Document updated');
  } catch (err) {
    sendError(res, 'DOCUMENTS_ERROR', 'Failed to update document', 500);
  }
});

router.delete('/:id', authenticate, requirePermission('documents:delete' as any), async (req: Request, res: Response) => {
  try {
    const tenantId = getIsolatedTenantId(req as any);
    const deleted = await DocumentService.delete(parseInt(req.params.id), tenantId);
    if (!deleted) return sendError(res, 'NOT_FOUND', 'Document not found', 404);
    sendSuccess(res, { deleted: true }, 200, undefined, 'Document deleted');
  } catch (err) {
    sendError(res, 'DOCUMENTS_ERROR', 'Failed to delete document', 500);
  }
});

export default router;
