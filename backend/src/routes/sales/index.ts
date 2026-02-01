/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  SALES MODULE ROUTES INDEX                                                 ║
 * ║  Centralized router for all sales module endpoints                         ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import { Router } from 'express';

// Phase 1: Customer Master
import customersRouter from './customers';
import priceListsRouter from './priceLists';

// Phase 2: Sales Documents
import quotationsRouter from './quotations';
import ordersRouter from './orders';
import deliveryNotesRouter from './deliveryNotes';
import invoicesRouter from './invoices';
import returnsAndCreditsRouter from './returnsAndCredits';

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 1: CUSTOMER MASTER
// ═══════════════════════════════════════════════════════════════════════════

// Customer management
router.use('/customers', customersRouter);

// Price lists
router.use('/price-lists', priceListsRouter);

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 2: SALES DOCUMENTS
// ═══════════════════════════════════════════════════════════════════════════

// Sales quotations
router.use('/quotations', quotationsRouter);

// Sales orders (with credit control)
router.use('/orders', ordersRouter);

// Delivery notes (goods issue)
router.use('/delivery-notes', deliveryNotesRouter);

// Sales invoices
router.use('/invoices', invoicesRouter);

// Sales returns and credit notes
router.use('/', returnsAndCreditsRouter); // Handles /returns and /credit-notes

export default router;
