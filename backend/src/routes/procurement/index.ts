import { Router } from 'express';

import vendorsRouter from './vendors';
import vendorReferenceDataRouter from './vendorReferenceData';
import procurementReferenceDataRouter from './procurementReferenceData';
import purchaseOrdersRouter from './purchaseOrders';
import purchaseInvoicesRouter from './purchaseInvoices';
import purchaseReturnsRouter from './purchaseReturns';
import contractsRouter from './contracts';
import quotationsRouter from './quotations';
import goodsReceiptsRouter from './goodsReceipts';
import invoiceTypesRouter from './invoiceTypes';
import expenseTypesRouter from './expenseTypes';

const router = Router();

// Invoice types and expense types
router.use('/invoice-types', invoiceTypesRouter);
router.use('/expense-types', expenseTypesRouter);

// Vendor management
router.use('/vendors', vendorsRouter);

// Vendor reference data (categories, types, statuses, payment terms)
router.use('/vendors', vendorReferenceDataRouter);

// Procurement reference data (PO types, statuses, supply terms, price lists)
router.use('/reference', procurementReferenceDataRouter);

// Vendor contracts
router.use('/contracts', contractsRouter);

// Vendor quotations
router.use('/quotations', quotationsRouter);

// Purchase orders
router.use('/purchase-orders', purchaseOrdersRouter);

// Goods receipts
router.use('/goods-receipts', goodsReceiptsRouter);

// Purchase invoices (both routes for compatibility)
router.use('/purchase-invoices', purchaseInvoicesRouter);
router.use('/invoices', purchaseInvoicesRouter);

// Purchase returns
router.use('/purchase-returns', purchaseReturnsRouter);

export default router;
