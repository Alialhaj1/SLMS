import apiClient from './apiClient';

// ============================================================================
// INTERFACES - Dashboard Data Types
// ============================================================================

// Legacy Dashboard Stats Interface (kept for backward compatibility)
export interface DashboardStats {
  totals: {
    users: number;
    journalsToday: number;
    failedLoginsToday: number;
    pendingApprovals: number;
  };
  trends: {
    logins: { date: string; count: number }[];
    journals: { date: string; count: number }[];
  };
  recentActivity: {
    id: string;
    userId: string;
    userName: string;
    action: string;
    resource: string;
    resourceId?: string;
    timestamp: string;
    ipAddress?: string;
    success: boolean;
  }[];
}

// NEW: Executive Overview KPIs
export interface OverviewData {
  kpis: {
    activeShipments: { value: number; change: number; trend: 'up' | 'down' };
    delayedShipments: { value: number; change: number; trend: 'up' | 'down' };
    totalShipmentCost: { value: number; change: number; trend: 'up' | 'down'; currency: string };
    pendingApprovals: { value: number; newCount: number };
    activeProjects: { value: number; change: number };
    activeLettersOfCredit: { value: number; totalValue: number; currency: string };
    supplierOrders: { value: number; pending: number };
    pendingPayments: { value: number; totalAmount: number; currency: string };
  };
  lastUpdated: string;
}

// NEW: Logistics Snapshot
export interface LogisticsData {
  statusDistribution: {
    delivered: number;
    inTransit: number;
    pending: number;
    delayed: number;
    customs: number;
  };
  upcomingArrivals: {
    id: number;
    shipmentNumber: string;
    expectedDate: string;
    daysRemaining: number;
    port: string;
  }[];
  topPorts: { port: string; count: number }[];
  delayedContainers: number;
}

// NEW: Financial Pulse
export interface FinancialData {
  cashFlow: { date: string; income: number; expenses: number }[];
  paymentSummary: {
    dueToday: number;
    dueThisWeek: number;
    overdue: number;
    currency: string;
  };
  expensesByType: { type: string; amount: number }[];
  exchangeRateDiff: number;
}

// NEW: Procurement Overview
export interface ProcurementData {
  posInProgress: number;
  unpaidInvoices: number;
  topSupplier: string;
  delayedSuppliers: number;
}

// NEW: Projects Status
export interface ProjectsData {
  projects: {
    id: number;
    name: string;
    nameAr: string;
    progress: number;
    totalCost: number;
    linkedShipments: number;
  }[];
}

// NEW: Alerts & Risks
export interface AlertsData {
  alerts: {
    id: string;
    type: 'customs' | 'document' | 'clearance' | 'budget' | 'operational';
    severity: 'critical' | 'warning' | 'info';
    message: string;
    messageAr: string;
    resourceType: string;
    resourceId: number;
    createdAt: string;
  }[];
  systemHealth: 'healthy' | 'warning' | 'critical';
}

// Activity Item Interface
export interface ActivityItem {
  id: string;
  type: 'login' | 'logout' | 'passwordChange' | 'profileUpdate' | 'notification' | 'userCreated' | 'userUpdated' | 'userDeleted' | 'roleChanged';
  userId: string;
  userName: string;
  message: string;
  timestamp: string;
  metadata?: {
    role?: string;
    targetUser?: string;
    [key: string]: any;
  };
}

// Chart Data Interface
export interface ChartDataPoint {
  date: string;
  logins: number;
  registrations?: number;
  notifications?: number;
}

// ============================================================================
// DASHBOARD SERVICE
// ============================================================================

const dashboardService = {
  // ==========================================================================
  // NEW ENDPOINTS - Enterprise Dashboard
  // ==========================================================================

  /**
   * Get executive overview KPIs (8 cards)
   */
  getOverview: async (): Promise<OverviewData> => {
    try {
      const result: any = await apiClient.get('/api/dashboard/overview');
      const data = result?.data ?? result;
      return data;
    } catch (error: any) {
      console.warn('getOverview failed, returning defaults:', error?.message);
      return {
        kpis: {
          activeShipments: { value: 0, change: 0, trend: 'up' },
          delayedShipments: { value: 0, change: 0, trend: 'down' },
          totalShipmentCost: { value: 0, change: 0, trend: 'up', currency: 'SAR' },
          pendingApprovals: { value: 0, newCount: 0 },
          activeProjects: { value: 0, change: 0 },
          activeLettersOfCredit: { value: 0, totalValue: 0, currency: 'SAR' },
          supplierOrders: { value: 0, pending: 0 },
          pendingPayments: { value: 0, totalAmount: 0, currency: 'SAR' },
        },
        lastUpdated: new Date().toISOString(),
      };
    }
  },

  /**
   * Get logistics snapshot (shipment status & arrivals)
   */
  getLogistics: async (): Promise<LogisticsData> => {
    try {
      const result: any = await apiClient.get('/api/dashboard/logistics');
      const data = result?.data ?? result;
      return data;
    } catch (error: any) {
      console.warn('getLogistics failed, returning defaults:', error?.message);
      return {
        statusDistribution: { delivered: 0, inTransit: 0, pending: 0, delayed: 0, customs: 0 },
        upcomingArrivals: [],
        topPorts: [],
        delayedContainers: 0,
      };
    }
  },

  /**
   * Get financial pulse (cash flow & payments)
   */
  getFinancial: async (): Promise<FinancialData> => {
    try {
      const result: any = await apiClient.get('/api/dashboard/financial');
      const data = result?.data ?? result;
      return data;
    } catch (error: any) {
      console.warn('getFinancial failed, returning defaults:', error?.message);
      return {
        cashFlow: [],
        paymentSummary: { dueToday: 0, dueThisWeek: 0, overdue: 0, currency: 'SAR' },
        expensesByType: [],
        exchangeRateDiff: 0,
      };
    }
  },

  /**
   * Get procurement overview
   */
  getProcurement: async (): Promise<ProcurementData> => {
    try {
      const result: any = await apiClient.get('/api/dashboard/procurement');
      const data = result?.data ?? result;
      return data;
    } catch (error: any) {
      console.warn('getProcurement failed, returning defaults:', error?.message);
      return {
        posInProgress: 0,
        unpaidInvoices: 0,
        topSupplier: 'N/A',
        delayedSuppliers: 0,
      };
    }
  },

  /**
   * Get projects status
   */
  getProjects: async (): Promise<ProjectsData> => {
    try {
      const result: any = await apiClient.get('/api/dashboard/projects');
      const data = result?.data ?? result;
      return data;
    } catch (error: any) {
      console.warn('getProjects failed, returning defaults:', error?.message);
      return { projects: [] };
    }
  },

  /**
   * Get alerts and risks
   */
  getAlerts: async (): Promise<AlertsData> => {
    try {
      const result: any = await apiClient.get('/api/dashboard/alerts');
      const data = result?.data ?? result;
      return data;
    } catch (error: any) {
      console.warn('getAlerts failed, returning defaults:', error?.message);
      return { alerts: [], systemHealth: 'healthy' };
    }
  },

  // ==========================================================================
  // LEGACY ENDPOINTS (kept for backward compatibility)
  // ==========================================================================

  /**
   * Get dashboard statistics (legacy)
   * Returns: totals, trends, recentActivity
   */
  getStats: async (): Promise<DashboardStats> => {
    const result: any = await apiClient.get('/api/dashboard/stats');
    // Backend returns { success: true, data: {...} }
    const data = result?.data ?? result;
    return {
      totals: {
        users: Number(data?.totals?.users ?? 0),
        journalsToday: Number(data?.totals?.journalsToday ?? 0),
        failedLoginsToday: Number(data?.totals?.failedLoginsToday ?? 0),
        pendingApprovals: Number(data?.totals?.pendingApprovals ?? 0),
      },
      trends: {
        logins: Array.isArray(data?.trends?.logins) ? data.trends.logins : [],
        journals: Array.isArray(data?.trends?.journals) ? data.trends.journals : [],
      },
      recentActivity: Array.isArray(data?.recentActivity) ? data.recentActivity : [],
    };
  },

  /**
   * Get recent activity timeline
   * @param limit - Number of items to return (default: 10)
   */
  getRecentActivity: async (limit: number = 10): Promise<ActivityItem[]> => {
    try {
      const response = await apiClient.get<{ success: boolean; data: ActivityItem[] }>(
        `/api/dashboard/activity?limit=${limit}`
      );
      return response.data;
    } catch (error: any) {
      console.warn('getRecentActivity fallback to empty:', error?.message || error);
      return [];
    }
  },

  /**
   * Get login trends data for charts
   * @param period - 'week' or 'month'
   */
  getLoginTrends: async (period: 'week' | 'month' = 'week'): Promise<ChartDataPoint[]> => {
    try {
      const response = await apiClient.get(`/api/dashboard/login-trends?period=${period}`);
      return response.data;
    } catch (error: any) {
      console.warn('getLoginTrends failed:', error?.message);
      return [];
    }
  },
};

export default dashboardService;
