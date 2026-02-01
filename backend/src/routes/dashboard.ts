/**
 * Dashboard Routes - Enterprise Logistics Dashboard
 * Provides comprehensive stats, KPIs, and activity data for dashboard
 * 
 * Endpoints:
 * - GET /api/dashboard/overview    - Executive KPIs (8 cards)
 * - GET /api/dashboard/logistics   - Shipment stats & timeline
 * - GET /api/dashboard/financial   - Cash flow & payments
 * - GET /api/dashboard/procurement - PO stats & supplier data
 * - GET /api/dashboard/projects    - Projects progress
 * - GET /api/dashboard/alerts      - Active alerts & risks
 * - GET /api/dashboard/badges      - Sidebar badge counts
 * - GET /api/dashboard/stats       - Legacy stats endpoint
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { sendSuccess, sendError } from '../utils/response';
import { logger } from '../utils/logger';
import pool from '../db';

const router = Router();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Safe query wrapper - keeps dashboard online even when individual queries fail
async function safeCountQuery(sql: string, params: any[] = [], context: string): Promise<number> {
  try {
    const result = await pool.query(sql, params);
    return parseInt(result.rows[0]?.count || '0');
  } catch (error) {
    logger.warn(`Dashboard ${context} query failed`, { error });
    return 0;
  }
}

async function safeSumQuery(sql: string, params: any[] = [], context: string): Promise<number> {
  try {
    const result = await pool.query(sql, params);
    return parseFloat(result.rows[0]?.sum || '0');
  } catch (error) {
    logger.warn(`Dashboard ${context} sum query failed`, { error });
    return 0;
  }
}

async function safeRowsQuery<T = any>(sql: string, params: any[] = [], context: string): Promise<T[]> {
  try {
    const result = await pool.query(sql, params);
    return result.rows as T[];
  } catch (error) {
    logger.warn(`Dashboard ${context} query failed`, { error });
    return [];
  }
}

async function safeFirstRow<T = any>(sql: string, params: any[] = [], context: string): Promise<T | null> {
  try {
    const result = await pool.query(sql, params);
    return result.rows[0] as T || null;
  } catch (error) {
    logger.warn(`Dashboard ${context} query failed`, { error });
    return null;
  }
}

function formatDateOnly(value: any): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().split('T')[0];
}

function formatTimestamp(value: any): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString();
}

// Calculate percentage change between two values
function calculateChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

// ============================================================================
// NEW: EXECUTIVE OVERVIEW ENDPOINT
// ============================================================================

/**
 * GET /api/dashboard/overview
 * Executive KPI cards - main dashboard data
 * Returns 8 key metrics with trends
 */
router.get('/overview', authenticate, requirePermission('dashboard:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user?.company_id || (req as any).user?.companyId || null;
    const companyFilter = companyId ? 'AND company_id = $1' : '';
    const params = companyId ? [companyId] : [];

    // Active Shipments (not completed/cancelled)
    const activeShipments = await safeCountQuery(
      `SELECT COUNT(*) as count FROM logistics_shipments 
       WHERE deleted_at IS NULL ${companyFilter}
       AND status_code NOT IN ('completed', 'cancelled', 'delivered')`,
      params,
      'activeShipments'
    );

    // Previous period active shipments (for trend)
    const prevActiveShipments = await safeCountQuery(
      `SELECT COUNT(*) as count FROM logistics_shipments 
       WHERE deleted_at IS NULL ${companyFilter}
       AND status_code NOT IN ('completed', 'cancelled', 'delivered')
       AND created_at < NOW() - INTERVAL '30 days'`,
      params,
      'prevActiveShipments'
    );

    // Delayed Shipments
    const delayedShipments = await safeCountQuery(
      `SELECT COUNT(*) as count FROM logistics_shipments 
       WHERE deleted_at IS NULL ${companyFilter}
       AND (status_code = 'delayed' OR (expected_arrival_date < NOW() AND status_code NOT IN ('completed', 'cancelled', 'delivered')))`,
      params,
      'delayedShipments'
    );

    // Total Shipment Cost (current month)
    const totalShipmentCost = await safeSumQuery(
      `SELECT COALESCE(SUM(total_amount), 0) as sum FROM logistics_shipments 
       WHERE deleted_at IS NULL ${companyFilter}
       AND created_at >= DATE_TRUNC('month', NOW())`,
      params,
      'totalShipmentCost'
    );

    // Previous month cost
    const prevMonthCost = await safeSumQuery(
      `SELECT COALESCE(SUM(total_amount), 0) as sum FROM logistics_shipments 
       WHERE deleted_at IS NULL ${companyFilter}
       AND created_at >= DATE_TRUNC('month', NOW() - INTERVAL '1 month')
       AND created_at < DATE_TRUNC('month', NOW())`,
      params,
      'prevMonthCost'
    );

    // Pending Approvals (journal entries + payment requests)
    const pendingApprovals = await safeCountQuery(
      `SELECT COUNT(*) as count FROM journal_entries 
       WHERE deleted_at IS NULL ${companyFilter}
       AND status IN ('draft', 'pending')`,
      params,
      'pendingApprovals'
    );

    // Active Projects
    const activeProjects = await safeCountQuery(
      `SELECT COUNT(*) as count FROM projects 
       WHERE deleted_at IS NULL ${companyFilter}
       AND status IN ('active', 'in_progress')`,
      params,
      'activeProjects'
    );

    // Active Letters of Credit
    const activeLCs = await safeCountQuery(
      `SELECT COUNT(*) as count FROM letters_of_credit 
       WHERE deleted_at IS NULL ${companyFilter}
       AND status IN ('active', 'pending', 'issued')`,
      params,
      'activeLCs'
    );

    const activeLCsValue = await safeSumQuery(
      `SELECT COALESCE(SUM(amount), 0) as sum FROM letters_of_credit 
       WHERE deleted_at IS NULL ${companyFilter}
       AND status IN ('active', 'pending', 'issued')`,
      params,
      'activeLCsValue'
    );

    // Supplier Orders (Purchase Orders in progress)
    const supplierOrders = await safeCountQuery(
      `SELECT COUNT(*) as count FROM purchase_orders 
       WHERE deleted_at IS NULL ${companyFilter}
       AND status NOT IN ('completed', 'cancelled', 'received')`,
      params,
      'supplierOrders'
    );

    // Pending Supplier Payments
    const pendingPayments = await safeCountQuery(
      `SELECT COUNT(*) as count FROM vendor_payments 
       WHERE deleted_at IS NULL ${companyFilter}
       AND status IN ('pending', 'scheduled')`,
      params,
      'pendingPayments'
    );

    const pendingPaymentsAmount = await safeSumQuery(
      `SELECT COALESCE(SUM(payment_amount), 0) as sum FROM vendor_payments 
       WHERE deleted_at IS NULL ${companyFilter}
       AND status IN ('pending', 'scheduled')`,
      params,
      'pendingPaymentsAmount'
    );

    const response = {
      kpis: {
        activeShipments: {
          value: activeShipments,
          change: calculateChange(activeShipments, prevActiveShipments),
          trend: activeShipments >= prevActiveShipments ? 'up' : 'down',
        },
        delayedShipments: {
          value: delayedShipments,
          change: 0,
          trend: 'down', // Delayed going down is good
        },
        totalShipmentCost: {
          value: totalShipmentCost,
          change: calculateChange(totalShipmentCost, prevMonthCost),
          trend: totalShipmentCost >= prevMonthCost ? 'up' : 'down',
          currency: 'SAR',
        },
        pendingApprovals: {
          value: pendingApprovals,
          newCount: 0,
        },
        activeProjects: {
          value: activeProjects,
          change: 0,
        },
        activeLettersOfCredit: {
          value: activeLCs,
          totalValue: activeLCsValue,
          currency: 'SAR',
        },
        supplierOrders: {
          value: supplierOrders,
          pending: 0,
        },
        pendingPayments: {
          value: pendingPayments,
          totalAmount: pendingPaymentsAmount,
          currency: 'SAR',
        },
      },
      lastUpdated: new Date().toISOString(),
    };

    return sendSuccess(res, response, 200);
  } catch (error: any) {
    logger.error('Get dashboard overview failed', error);
    return sendError(res, 'SERVER_ERROR', 'Failed to fetch dashboard overview', 500);
  }
});

// ============================================================================
// NEW: LOGISTICS SNAPSHOT ENDPOINT
// ============================================================================

/**
 * GET /api/dashboard/logistics
 * Logistics widget data - shipment status distribution and upcoming arrivals
 */
router.get('/logistics', authenticate, requirePermission('dashboard:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user?.company_id || (req as any).user?.companyId || null;
    const companyFilter = companyId ? 'AND company_id = $1' : '';
    const params = companyId ? [companyId] : [];

    // Status Distribution
    const statusRows = await safeRowsQuery<{ status_code: string; count: string }>(
      `SELECT status_code, COUNT(*) as count FROM logistics_shipments 
       WHERE deleted_at IS NULL ${companyFilter}
       GROUP BY status_code`,
      params,
      'statusDistribution'
    );

    const statusDistribution: Record<string, number> = {
      delivered: 0,
      inTransit: 0,
      pending: 0,
      delayed: 0,
      customs: 0,
    };

    statusRows.forEach(row => {
      const status = row.status_code?.toLowerCase() || '';
      if (status === 'delivered' || status === 'completed') {
        statusDistribution.delivered += parseInt(row.count);
      } else if (status === 'in_transit' || status === 'in transit' || status === 'shipping') {
        statusDistribution.inTransit += parseInt(row.count);
      } else if (status === 'pending' || status === 'draft' || status === 'new') {
        statusDistribution.pending += parseInt(row.count);
      } else if (status === 'delayed') {
        statusDistribution.delayed += parseInt(row.count);
      } else if (status === 'customs' || status === 'at_customs' || status === 'clearance') {
        statusDistribution.customs += parseInt(row.count);
      }
    });

    // Upcoming Arrivals (next 30 days)
    const upcomingArrivals = await safeRowsQuery<{
      id: number;
      shipment_number: string;
      expected_arrival_date: Date;
      port_name: string;
    }>(
      `SELECT ls.id, ls.shipment_number, ls.expected_arrival_date, COALESCE(p.name, 'N/A') as port_name
       FROM logistics_shipments ls
       LEFT JOIN ports p ON ls.port_of_discharge_id = p.id
       WHERE ls.deleted_at IS NULL ${companyFilter.replace('company_id', 'ls.company_id')}
       AND ls.expected_arrival_date >= NOW()
       AND ls.expected_arrival_date <= NOW() + INTERVAL '30 days'
       AND ls.status_code NOT IN ('completed', 'cancelled', 'delivered')
       ORDER BY ls.expected_arrival_date ASC
       LIMIT 10`,
      params,
      'upcomingArrivals'
    );

    const arrivals = upcomingArrivals.map(row => ({
      id: row.id,
      shipmentNumber: row.shipment_number,
      expectedDate: formatDateOnly(row.expected_arrival_date),
      daysRemaining: Math.ceil((new Date(row.expected_arrival_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      port: row.port_name || 'N/A',
    }));

    // Top Ports
    const topPorts = await safeRowsQuery<{ port: string; count: string }>(
      `SELECT COALESCE(p.name, 'Unknown') as port, COUNT(*) as count 
       FROM logistics_shipments ls
       LEFT JOIN ports p ON ls.port_of_discharge_id = p.id
       WHERE ls.deleted_at IS NULL ${companyFilter.replace('company_id', 'ls.company_id')}
       AND ls.port_of_discharge_id IS NOT NULL
       GROUP BY p.name
       ORDER BY count DESC
       LIMIT 5`,
      params,
      'topPorts'
    );

    // Delayed Containers
    const delayedContainers = await safeCountQuery(
      `SELECT COUNT(*) as count FROM logistics_shipments 
       WHERE deleted_at IS NULL ${companyFilter}
       AND expected_arrival_date < NOW()
       AND status_code NOT IN ('completed', 'cancelled', 'delivered')`,
      params,
      'delayedContainers'
    );

    return sendSuccess(res, {
      statusDistribution,
      upcomingArrivals: arrivals,
      topPorts: topPorts.map(p => ({ port: p.port, count: parseInt(p.count) })),
      delayedContainers,
    }, 200);
  } catch (error: any) {
    logger.error('Get logistics snapshot failed', error);
    return sendError(res, 'SERVER_ERROR', 'Failed to fetch logistics snapshot', 500);
  }
});

// ============================================================================
// NEW: FINANCIAL PULSE ENDPOINT
// ============================================================================

/**
 * GET /api/dashboard/financial
 * Financial widget data - cash flow and payment summary
 */
router.get('/financial', authenticate, requirePermission('dashboard:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user?.company_id || (req as any).user?.companyId || null;
    const companyFilter = companyId ? 'AND company_id = $1' : '';
    const params = companyId ? [companyId] : [];

    // Cash Flow (last 30 days - using shipment expenses)
    const cashFlowRows = await safeRowsQuery<{ date: Date; expenses: string }>(
      `SELECT DATE(created_at) as date, SUM(amount) as expenses
       FROM shipment_expenses 
       WHERE deleted_at IS NULL ${companyFilter}
       AND created_at >= NOW() - INTERVAL '30 days'
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      params,
      'cashFlow'
    );

    const cashFlow = cashFlowRows.map(row => ({
      date: formatDateOnly(row.date),
      income: 0, // Would need income tracking
      expenses: parseFloat(row.expenses || '0'),
    }));

    // Payment Summary - using purchase_invoices for due dates
    const dueToday = await safeSumQuery(
      `SELECT COALESCE(SUM(balance), 0) as sum FROM purchase_invoices 
       WHERE deleted_at IS NULL ${companyFilter}
       AND DATE(due_date) = CURRENT_DATE
       AND is_posted = true
       AND balance > 0`,
      params,
      'paymentsToday'
    );

    const dueThisWeek = await safeSumQuery(
      `SELECT COALESCE(SUM(balance), 0) as sum FROM purchase_invoices 
       WHERE deleted_at IS NULL ${companyFilter}
       AND due_date >= CURRENT_DATE 
       AND due_date <= CURRENT_DATE + INTERVAL '7 days'
       AND is_posted = true
       AND balance > 0`,
      params,
      'paymentsWeek'
    );

    const overdue = await safeSumQuery(
      `SELECT COALESCE(SUM(balance), 0) as sum FROM purchase_invoices 
       WHERE deleted_at IS NULL ${companyFilter}
       AND due_date < CURRENT_DATE
       AND is_posted = true
       AND balance > 0`,
      params,
      'paymentsOverdue'
    );

    // Expenses by Type
    const expensesByType = await safeRowsQuery<{ type_name: string; total: string }>(
      `SELECT 
         COALESCE(set.name, 'Other') as type_name,
         SUM(se.amount) as total
       FROM shipment_expenses se
       LEFT JOIN shipment_expense_types set ON se.expense_type_id = set.id
       WHERE se.deleted_at IS NULL ${companyFilter.replace('company_id', 'se.company_id')}
       AND se.created_at >= DATE_TRUNC('month', NOW())
       GROUP BY set.name
       ORDER BY total DESC
       LIMIT 5`,
      params,
      'expensesByType'
    );

    return sendSuccess(res, {
      cashFlow,
      paymentSummary: {
        dueToday,
        dueThisWeek,
        overdue,
        currency: 'SAR',
      },
      expensesByType: expensesByType.map(e => ({
        type: e.type_name,
        amount: parseFloat(e.total || '0'),
      })),
      exchangeRateDiff: 0, // Would need exchange rate tracking
    }, 200);
  } catch (error: any) {
    logger.error('Get financial pulse failed', error);
    return sendError(res, 'SERVER_ERROR', 'Failed to fetch financial pulse', 500);
  }
});

// ============================================================================
// NEW: PROCUREMENT OVERVIEW ENDPOINT
// ============================================================================

/**
 * GET /api/dashboard/procurement
 * Procurement widget data - PO stats and supplier info
 */
router.get('/procurement', authenticate, requirePermission('dashboard:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user?.company_id || (req as any).user?.companyId || null;
    const companyFilter = companyId ? 'AND company_id = $1' : '';
    const params = companyId ? [companyId] : [];

    // POs in Progress
    const posInProgress = await safeCountQuery(
      `SELECT COUNT(*) as count FROM purchase_orders 
       WHERE deleted_at IS NULL ${companyFilter}
       AND status NOT IN ('completed', 'cancelled', 'received')`,
      params,
      'posInProgress'
    );

    // Unpaid Invoices (using vendor_payments or purchase_order_invoices)
    const unpaidInvoices = await safeCountQuery(
      `SELECT COUNT(*) as count FROM vendor_payments 
       WHERE deleted_at IS NULL ${companyFilter}
       AND status = 'pending'`,
      params,
      'unpaidInvoices'
    );

    // Top Supplier by order count
    const topSupplier = await safeFirstRow<{ name: string; count: string }>(
      `SELECT v.name, COUNT(po.id) as count
       FROM purchase_orders po
       JOIN vendors v ON po.vendor_id = v.id
       WHERE po.deleted_at IS NULL ${companyFilter.replace('company_id', 'po.company_id')}
       AND po.created_at >= NOW() - INTERVAL '90 days'
       GROUP BY v.id, v.name
       ORDER BY count DESC
       LIMIT 1`,
      params,
      'topSupplier'
    );

    // Delayed Suppliers (POs past expected date)
    const delayedSuppliers = await safeCountQuery(
      `SELECT COUNT(DISTINCT vendor_id) as count FROM purchase_orders 
       WHERE deleted_at IS NULL ${companyFilter}
       AND expected_date < NOW()
       AND status NOT IN ('completed', 'cancelled', 'received')`,
      params,
      'delayedSuppliers'
    );

    return sendSuccess(res, {
      posInProgress,
      unpaidInvoices,
      topSupplier: topSupplier?.name || 'N/A',
      delayedSuppliers,
    }, 200);
  } catch (error: any) {
    logger.error('Get procurement overview failed', error);
    return sendError(res, 'SERVER_ERROR', 'Failed to fetch procurement overview', 500);
  }
});

// ============================================================================
// NEW: PROJECTS STATUS ENDPOINT
// ============================================================================

/**
 * GET /api/dashboard/projects
 * Projects widget data - active projects with progress
 */
router.get('/projects', authenticate, requirePermission('dashboard:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user?.company_id || (req as any).user?.companyId || null;
    const companyFilter = companyId ? 'AND company_id = $1' : '';
    const params = companyId ? [companyId] : [];

    // Active Projects with progress
    const projects = await safeRowsQuery<{
      id: number;
      name: string;
      name_ar: string;
      progress_percent: number;
      budget: string;
      shipment_count: string;
    }>(
      `SELECT 
         p.id,
         p.name,
         p.name_ar,
         COALESCE(p.progress_percent, 0) as progress_percent,
         COALESCE(p.budget, 0) as budget,
         COUNT(ls.id) as shipment_count
       FROM projects p
       LEFT JOIN logistics_shipments ls ON ls.project_id = p.id AND ls.deleted_at IS NULL
       WHERE p.deleted_at IS NULL ${companyFilter.replace('company_id', 'p.company_id')}
       AND p.status IN ('active', 'in_progress')
       GROUP BY p.id, p.name, p.name_ar, p.progress_percent, p.budget
       ORDER BY p.created_at DESC
       LIMIT 5`,
      params,
      'activeProjects'
    );

    return sendSuccess(res, {
      projects: projects.map(p => ({
        id: p.id,
        name: p.name,
        nameAr: p.name_ar,
        progress: p.progress_percent,
        totalCost: parseFloat(p.budget || '0'),
        linkedShipments: parseInt(p.shipment_count || '0'),
      })),
    }, 200);
  } catch (error: any) {
    logger.error('Get projects status failed', error);
    return sendError(res, 'SERVER_ERROR', 'Failed to fetch projects status', 500);
  }
});

// ============================================================================
// NEW: ALERTS ENDPOINT
// ============================================================================

/**
 * GET /api/dashboard/alerts
 * Active alerts and risks
 */
router.get('/alerts', authenticate, requirePermission('dashboard:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user?.company_id || (req as any).user?.companyId || null;
    const companyFilter = companyId ? 'AND company_id = $1' : '';
    const params = companyId ? [companyId] : [];

    const alerts: any[] = [];

    // Delayed shipments (critical)
    const delayedShipments = await safeRowsQuery<{ id: number; shipment_number: string }>(
      `SELECT id, shipment_number FROM logistics_shipments 
       WHERE deleted_at IS NULL ${companyFilter}
       AND expected_arrival_date < NOW()
       AND status_code NOT IN ('completed', 'cancelled', 'delivered')
       LIMIT 5`,
      params,
      'delayedAlerts'
    );

    delayedShipments.forEach(s => {
      alerts.push({
        id: `delayed-${s.id}`,
        type: 'customs',
        severity: 'critical',
        message: `Shipment ${s.shipment_number} is delayed`,
        messageAr: `الشحنة ${s.shipment_number} متأخرة`,
        resourceType: 'shipment',
        resourceId: s.id,
        createdAt: new Date().toISOString(),
      });
    });

    // Overdue payments (warning) - using purchase_invoices
    const overduePayments = await safeRowsQuery<{ id: number; reference: string; amount: string }>(
      `SELECT id, invoice_number as reference, balance as amount FROM purchase_invoices 
       WHERE deleted_at IS NULL ${companyFilter}
       AND due_date < CURRENT_DATE
       AND is_posted = true
       AND balance > 0
       LIMIT 5`,
      params,
      'overduePaymentAlerts'
    );

    overduePayments.forEach(p => {
      alerts.push({
        id: `payment-${p.id}`,
        type: 'budget',
        severity: 'warning',
        message: `Payment ${p.reference || p.id} is overdue`,
        messageAr: `الدفعة ${p.reference || p.id} متأخرة`,
        resourceType: 'payment',
        resourceId: p.id,
        createdAt: new Date().toISOString(),
      });
    });

    // System health based on alert count
    let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (alerts.some(a => a.severity === 'critical')) {
      systemHealth = 'critical';
    } else if (alerts.length > 0) {
      systemHealth = 'warning';
    }

    return sendSuccess(res, {
      alerts,
      systemHealth,
    }, 200);
  } catch (error: any) {
    logger.error('Get alerts failed', error);
    return sendError(res, 'SERVER_ERROR', 'Failed to fetch alerts', 500);
  }
});

// ============================================================================
// EXISTING ENDPOINTS (kept for backward compatibility)
// ============================================================================

/**
 * GET /api/dashboard/badges
 * Get real-time badge counts for sidebar notifications
 * Returns counts for: pending approvals, failed logins, today journals, low stock
 */
router.get('/badges', authenticate, requirePermission('dashboard:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user?.company_id || (req as any).user?.companyId || null;
    const userId = (req as any).user!.id;

    // 1. Pending Approvals (journal entries in 'draft' or 'pending' status)
    const pendingApprovalsQuery = companyId 
      ? `SELECT COUNT(*) as count FROM journal_entries WHERE company_id = $1 AND status IN ('draft', 'pending')`
      : `SELECT COUNT(*) as count FROM journal_entries WHERE status IN ('draft', 'pending')`;
    const pendingApprovals = await safeCountQuery(
      pendingApprovalsQuery,
      companyId ? [companyId] : [],
      'pendingApprovals'
    );

    // 2. Failed Logins (last 24 hours)
    const failedLogins = await safeCountQuery(
      `SELECT COUNT(*) as count 
       FROM login_history 
       WHERE activity_type = 'login_failed' 
       AND created_at >= NOW() - INTERVAL '24 hours'`,
      [],
      'failedLogins24h'
    );

    // 3. Today's Journal Entries (posted today)
    const todayJournalsQuery = companyId
      ? `SELECT COUNT(*) as count FROM journal_entries WHERE company_id = $1 AND DATE(created_at) = CURRENT_DATE`
      : `SELECT COUNT(*) as count FROM journal_entries WHERE DATE(created_at) = CURRENT_DATE`;
    const todayJournals = await safeCountQuery(
      todayJournalsQuery,
      companyId ? [companyId] : [],
      'journalsToday'
    );

    // 4. Low Stock Items (would require inventory table - placeholder for now)
    // TODO: Implement when inventory module is ready
    const lowStockItems = 0;

    return sendSuccess(res, {
      pendingApprovals,
      failedLogins,
      todayJournals,
      lowStockItems,
      lastUpdated: new Date().toISOString(),
    }, 200);
  } catch (error: any) {
    logger.error('Get badge counts failed', error);
    return sendError(res, 'SERVER_ERROR', 'Failed to fetch badge counts', 500);
  }
});

/**
 * GET /api/dashboard/stats
 * Get comprehensive dashboard statistics with trends and recent activity
 * Protected by: dashboard:view
 */
router.get('/stats', authenticate, requirePermission('dashboard:view'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user?.company_id || (req as any).user?.companyId || null;
    const userId = (req as any).user!.id;

    // ============ TOTALS ============
    // Total users
    const users = await safeCountQuery('SELECT COUNT(*) as count FROM users', [], 'totalUsers');

    // Journals posted today
    const journalsTodayQuery = companyId
      ? `SELECT COUNT(*) as count FROM journal_entries WHERE company_id = $1 AND DATE(created_at) = CURRENT_DATE AND status = 'posted'`
      : `SELECT COUNT(*) as count FROM journal_entries WHERE DATE(created_at) = CURRENT_DATE AND status = 'posted'`;
    const journalsToday = await safeCountQuery(
      journalsTodayQuery,
      companyId ? [companyId] : [],
      'journalsTodayPosted'
    );

    // Failed logins today
    const failedLoginsToday = await safeCountQuery(
      `SELECT COUNT(*) as count 
       FROM login_history 
       WHERE DATE(created_at) = CURRENT_DATE 
       AND activity_type = 'login_failed'`,
      [],
      'failedLoginsToday'
    );

    // Pending approvals (journal entries in draft/pending)
    const pendingApprovalsQuery = companyId
      ? `SELECT COUNT(*) as count FROM journal_entries WHERE company_id = $1 AND status IN ('draft', 'pending')`
      : `SELECT COUNT(*) as count FROM journal_entries WHERE status IN ('draft', 'pending')`;
    const pendingApprovals = await safeCountQuery(
      pendingApprovalsQuery,
      companyId ? [companyId] : [],
      'pendingApprovals'
    );

    // ============ TRENDS ============
    // Login trends (last 7 days)
    const loginTrendsRows = await safeRowsQuery<{ date: Date; count: string }>(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
       FROM login_history
       WHERE created_at >= NOW() - INTERVAL '7 days'
       AND activity_type = 'login_success'
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [],
      'loginTrends'
    );
    const logins = loginTrendsRows.map((row) => ({
      date: formatDateOnly(row.date),
      count: parseInt(row.count),
    }));

    // Journal trends (last 7 days)
    const journalTrendsQuery = companyId
      ? `SELECT DATE(created_at) as date, COUNT(*) as count FROM journal_entries WHERE company_id = $1 AND created_at >= NOW() - INTERVAL '7 days' GROUP BY DATE(created_at) ORDER BY date ASC`
      : `SELECT DATE(created_at) as date, COUNT(*) as count FROM journal_entries WHERE created_at >= NOW() - INTERVAL '7 days' GROUP BY DATE(created_at) ORDER BY date ASC`;
    const journalTrendsRows = await safeRowsQuery<{ date: Date; count: string }>(
      journalTrendsQuery,
      companyId ? [companyId] : [],
      'journalTrends'
    );
    const journals = journalTrendsRows.map((row) => ({
      date: formatDateOnly(row.date),
      count: parseInt(row.count),
    }));

    // ============ RECENT ACTIVITY ============
    // Get last 10 audit log entries
    const activityRows = await safeRowsQuery<{
      id: number;
      user_id: number;
      user_email?: string;
      action: string;
      resource_type?: string;
      resource_id?: number;
      created_at: Date;
      ip_address?: string;
      error_message?: string;
    }>(
      companyId
        ? `SELECT id, user_id, user_email, action, resource_type, resource_id, created_at, ip_address, error_message FROM audit_logs WHERE company_id = $1 ORDER BY created_at DESC LIMIT 10`
        : `SELECT id, user_id, user_email, action, resource_type, resource_id, created_at, ip_address, error_message FROM audit_logs ORDER BY created_at DESC LIMIT 10`,
      companyId ? [companyId] : [],
      'recentActivity'
    );

    const recentActivity = activityRows.map((row) => ({
      id: row.id.toString(),
      userId: row.user_id.toString(),
      userName: row.user_email, // TODO: Join with users table for full_name
      action: row.action,
      resource: row.resource_type,
      resourceId: row.resource_id ? row.resource_id.toString() : undefined,
      timestamp: formatTimestamp(row.created_at),
      ipAddress: row.ip_address,
      success: !row.error_message,
    }));

    // ============ RESPONSE ============
    const stats = {
      totals: {
        users,
        journalsToday,
        failedLoginsToday,
        pendingApprovals,
      },
      trends: {
        logins,
        journals,
      },
      recentActivity,
    };

    return sendSuccess(res, stats, 200);
  } catch (error: any) {
    logger.error('Get dashboard stats failed', error);
    return sendError(res, 'SERVER_ERROR', 'Failed to fetch dashboard stats', 500);
  }
});

/**
 * GET /api/dashboard/activity
 * Get recent activity timeline
 */
router.get('/activity', authenticate, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    // Get recent login activity
    const activityResult = await pool.query(
      `SELECT 
        lh.id,
        lh.user_id,
        u.full_name as user_name,
        u.email,
        lh.activity_type,
        lh.created_at as timestamp,
        lh.failed_reason
      FROM login_history lh
      JOIN users u ON lh.user_id = u.id
      ORDER BY lh.created_at DESC
      LIMIT $1`,
      [limit]
    );

    const activities = activityResult.rows.map((row) => {
      let type: string;
      let message: string;

      if (row.activity_type === 'login_success') {
        type = 'login';
        message = 'Logged in successfully';
      } else if (row.activity_type === 'login_failed') {
        type = 'login';
        message = `Login failed: ${row.failed_reason || 'Unknown reason'}`;
      } else if (row.activity_type === 'logout') {
        type = 'logout';
        message = 'Logged out';
      } else {
        type = 'activity';
        message = row.activity_type;
      }

      return {
        id: row.id.toString(),
        type,
        userId: row.user_id.toString(),
        userName: row.user_name || row.email,
        message,
        timestamp: row.timestamp.toISOString(),
      };
    });

    return sendSuccess(res, activities, 200);
  } catch (error: any) {
    logger.error('Get dashboard activity failed', error);
    return sendError(res, 'SERVER_ERROR', 'Failed to fetch dashboard activity', 500);
  }
});

/**
 * GET /api/dashboard/login-trends
 * Get login trends for charts
 */
router.get('/login-trends', authenticate, async (req: Request, res: Response) => {
  try {
    const period = (req.query.period as string) || 'week';
    const days = period === 'week' ? 7 : 30;

    const trendsResult = await pool.query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) FILTER (WHERE activity_type = 'login_success') as logins,
        COUNT(DISTINCT user_id) FILTER (WHERE activity_type = 'login_success') as unique_users
      FROM login_history
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC`
    );

    const trends = trendsResult.rows.map((row) => ({
      date: row.date.toISOString().split('T')[0],
      logins: parseInt(row.logins),
      registrations: 0, // Would need user creation data
    }));

    return sendSuccess(res, trends, 200);
  } catch (error: any) {
    logger.error('Get login trends failed', error);
    return sendError(res, 'SERVER_ERROR', 'Failed to fetch login trends', 500);
  }
});

export default router;
