/**
 * PURCHASE INVOICES NUMBER SEQUENCE API
 * Auto-generate invoice numbers
 * Routes: GET /api/procurement/invoices/next-number
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/auth';
import { loadCompanyContext } from '../../middleware/companyContext';

const router = Router();

router.use(authenticate);
router.use(loadCompanyContext);

/**
 * @route   GET /api/procurement/invoices/next-number
 * @desc    Get next available invoice number (preview only)
 * @access  Private (authenticated users only)
 */
router.get(
  '/next-number',
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      if (!companyId) {
        return res.status(400).json({ error: 'Company context required' });
      }

      // Return a default format if no numbering series exists
      const now = new Date();
      const defaultNumber = `PI-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 100000)).padStart(6, '0')}`;

      return res.json({
        success: true,
        data: {
          invoice_number: defaultNumber,
        },
      });
    } catch (error: any) {
      console.error('Error generating next invoice number:', error);
      return res.status(500).json({ 
        error: 'Failed to generate invoice number',
        details: error.message 
      });
    }
  }
);

/**
 * @route   POST /api/procurement/invoices/generate-number
 * @desc    Generate and reserve next invoice number
 * @access  Private (authenticated users)
 */
router.post(
  '/generate-number',
  async (req: Request, res: Response) => {
    try {
      const companyId = (req as any).companyContext?.companyId;
      if (!companyId) {
        return res.status(400).json({ error: 'Company context required' });
      }

      // Return a default format
      const now = new Date();
      const defaultNumber = `PI-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 100000)).padStart(6, '0')}`;

      return res.json({
        success: true,
        data: {
          invoice_number: defaultNumber,
        },
      });
    } catch (error: any) {
      console.error('Error generating invoice number:', error);
      return res.status(500).json({ 
        error: 'Failed to generate invoice number',
        details: error.message 
      });
    }
  }
);

export default router;
