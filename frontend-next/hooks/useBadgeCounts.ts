/**
 * 🔔 USE BADGE COUNTS - Hook لإدارة عدادات الـ Menu
 * =====================================================
 * 
 * يوفر:
 * ✅ جلب الأعداد من API
 * ✅ تحديث تلقائي
 * ✅ Cache لتقليل الطلبات
 * ✅ Type-safe badge types
 * 
 * @example
 * const { counts, getBadgeCount } = useBadgeCounts();
 * const notificationCount = getBadgeCount('notifications');
 */

import { useState, useEffect, useCallback } from 'react';
import { BadgeType } from '../config/menu.registry';
import { apiClient } from '../lib/apiClient';
import { useAuth } from './useAuth';

/**
 * نتائج الـ Badge Counts
 */
export interface BadgeCounts {
  notifications: number;
  pendingApprovals: number;
  pendingShipments: number;
  pendingExpenses: number;
  pendingJournals: number;
  [key: string]: number; // للعدادات المخصصة
}

/**
 * حالة الـ Hook
 */
interface UseBadgeCountsState {
  counts: BadgeCounts;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

/**
 * الفاصل الزمني لإعادة الجلب (2 دقيقة)
 */
const REFETCH_INTERVAL = 2 * 60 * 1000;

/**
 * القيم الافتراضية
 */
const DEFAULT_COUNTS: BadgeCounts = {
  notifications: 0,
  pendingApprovals: 0,
  pendingShipments: 0,
  pendingExpenses: 0,
  pendingJournals: 0,
};

/**
 * Cache عالمي لمنع إعادة الجلب عند كل render
 */
let globalCounts: BadgeCounts = { ...DEFAULT_COUNTS };
let lastFetchTime: number = 0;

export function useBadgeCounts() {
  const { user, isAuthenticated } = useAuth();
  const [state, setState] = useState<UseBadgeCountsState>({
    counts: globalCounts,
    isLoading: false,
    error: null,
    lastUpdated: lastFetchTime ? new Date(lastFetchTime) : null,
  });

  /**
   * جلب الأعداد من الـ API
   */
  const fetchCounts = useCallback(async (force: boolean = false) => {
    const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
    const canViewDashboard = permissions.includes('*:*') || permissions.includes('*.*') || permissions.includes('dashboard:view');
    const canViewApprovals = permissions.includes('*:*') || permissions.includes('*.*') || permissions.includes('approval_documents:view');

    if (!isAuthenticated || (!canViewDashboard && !canViewApprovals)) {
      setState(prev => ({
        ...prev,
        counts: DEFAULT_COUNTS,
        isLoading: false,
        error: null,
      }));
      return;
    }

    const now = Date.now();
    
    // استخدام Cache إذا لم يمر الوقت الكافي
    if (!force && lastFetchTime && (now - lastFetchTime) < REFETCH_INTERVAL) {
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const data = canViewDashboard
        ? (await apiClient.get('/api/dashboard/badges')).data
        : {};
      
      // جلب عدد الاعتمادات المعلقة من Approval Workflow API
      let approvalsCount = 0;
      if (canViewApprovals) {
        try {
          const approvalsResponse = await apiClient.get('/api/approval-documents/inbox-count');
          approvalsCount = approvalsResponse.count || 0;
        } catch (err) {
          // Fallback to legacy endpoint
          try {
            const legacyResponse = await apiClient.get('/api/approvals/badge-count');
            approvalsCount = legacyResponse.count || 0;
          } catch {
            console.warn('Failed to fetch approvals count');
          }
        }
      }
      
      // تحويل البيانات لصيغة BadgeCounts
      const newCounts: BadgeCounts = {
        notifications: 0, // من API منفصل
        pendingApprovals: approvalsCount,
        pendingShipments: 0, // TODO: من shipments API
        pendingExpenses: 0, // TODO: من expenses API
        pendingJournals: data.todayJournals || 0,
      };

      globalCounts = newCounts;
      lastFetchTime = now;

      setState(prev => ({
        ...prev,
        counts: newCounts,
        isLoading: false,
        error: null,
        lastUpdated: new Date(now),
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'فشل في جلب الأعداد';
      console.error('Badge counts fetch error:', error);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage 
      }));
    }
  }, []);

  /**
   * الحصول على عدد معين
   */
  const getBadgeCount = useCallback((badgeType: BadgeType | undefined): number | undefined => {
    if (!badgeType) return undefined;
    
    const count = state.counts[badgeType];
    
    // إرجاع undefined إذا كان العدد صفر (لعدم عرض الـ badge)
    return count > 0 ? count : undefined;
  }, [state.counts]);

  /**
   * تحديث عدد معين محلياً
   */
  const updateCount = useCallback((badgeType: BadgeType, count: number) => {
    setState(prev => ({
      ...prev,
      counts: {
        ...prev.counts,
        [badgeType]: count,
      },
    }));
    globalCounts[badgeType] = count;
  }, []);

  /**
   * تقليل العدد (مثلاً عند قراءة إشعار)
   */
  const decrementCount = useCallback((badgeType: BadgeType) => {
    const currentCount = state.counts[badgeType] || 0;
    if (currentCount > 0) {
      updateCount(badgeType, currentCount - 1);
    }
  }, [state.counts, updateCount]);

  /**
   * زيادة العدد (مثلاً عند وصول إشعار جديد)
   */
  const incrementCount = useCallback((badgeType: BadgeType) => {
    const currentCount = state.counts[badgeType] || 0;
    updateCount(badgeType, currentCount + 1);
  }, [state.counts, updateCount]);

  /**
   * إعادة تعيين كل الأعداد
   */
  const resetCounts = useCallback(() => {
    globalCounts = { ...DEFAULT_COUNTS };
    lastFetchTime = 0;
    setState({
      counts: DEFAULT_COUNTS,
      isLoading: false,
      error: null,
      lastUpdated: null,
    });
  }, []);

  // جلب الأعداد عند أول تحميل
  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  // تحديث دوري
  useEffect(() => {
    const interval = setInterval(() => {
      fetchCounts();
    }, REFETCH_INTERVAL);

    return () => clearInterval(interval);
  }, [fetchCounts]);

  return {
    counts: state.counts,
    isLoading: state.isLoading,
    error: state.error,
    lastUpdated: state.lastUpdated,
    getBadgeCount,
    updateCount,
    decrementCount,
    incrementCount,
    resetCounts,
    refetch: () => fetchCounts(true),
  };
}

export default useBadgeCounts;
