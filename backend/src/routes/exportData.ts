/**
 * §13.2.5 — Export Route (PDF / CSV)
 *
 * POST /api/export/pdf   — Generate printable HTML (browser print to PDF)
 * POST /api/export/csv   — Download CSV file
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { sendPrintableHtml, sendCsvDownload } from '../services/pdfExportService';
import { sendError } from '../utils/response';

const router = Router();

/**
 * POST /pdf — Generate printable HTML from data
 * Body: { title, subtitle?, columns: [{key,header,align?}], rows: [{...}], orientation?, locale?, companyName? }
 */
router.post('/pdf', authenticate, (req: Request, res: Response) => {
  try {
    const { title, subtitle, columns, rows, orientation, locale, companyName, footer } = req.body;

    if (!title || !columns || !Array.isArray(columns) || !rows || !Array.isArray(rows)) {
      return sendError(res, 'VALIDATION_ERROR', 'title, columns[], and rows[] are required', 400);
    }

    sendPrintableHtml(res, {
      title,
      subtitle,
      columns,
      rows,
      orientation,
      locale,
      companyName,
      generatedBy: (req as any).user?.email,
      footer,
    });
  } catch (err) {
    sendError(res, 'EXPORT_ERROR', 'Failed to generate PDF', 500);
  }
});

/**
 * POST /csv — Generate downloadable CSV
 * Body: { filename, columns: [{key,header}], rows: [{...}] }
 */
router.post('/csv', authenticate, (req: Request, res: Response) => {
  try {
    const { filename, columns, rows } = req.body;

    if (!columns || !Array.isArray(columns) || !rows || !Array.isArray(rows)) {
      return sendError(res, 'VALIDATION_ERROR', 'columns[] and rows[] are required', 400);
    }

    const name = filename || `export_${Date.now()}.csv`;
    sendCsvDownload(res, name, columns, rows);
  } catch (err) {
    sendError(res, 'EXPORT_ERROR', 'Failed to generate CSV', 500);
  }
});

export default router;
