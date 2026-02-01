/**
 * 🎨 Advanced UI Enhancements
 * تحسينات الواجهة المتقدمة
 */

export const enhancementConfig = {
  // ═══════════════════════════════════════════════════════════
  // 🎭 Status Badges - شارات الحالة المحسّنة
  // ═══════════════════════════════════════════════════════════
  statusBadges: {
    active: {
      className: 'px-3 py-1.5 bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 dark:from-green-900 dark:to-emerald-900 dark:text-green-100 rounded-full text-xs font-semibold border border-green-200 dark:border-green-700 shadow-sm hover:shadow-md transition-shadow',
      icon: '✓',
      label: 'Active / نشط'
    },
    inactive: {
      className: 'px-3 py-1.5 bg-gradient-to-r from-gray-50 to-slate-50 text-gray-700 dark:from-gray-800 dark:to-slate-800 dark:text-gray-100 rounded-full text-xs font-semibold border border-gray-200 dark:border-gray-600 shadow-sm',
      icon: '−',
      label: 'Inactive / غير نشط'
    },
    pending: {
      className: 'px-3 py-1.5 bg-gradient-to-r from-yellow-50 to-amber-50 text-yellow-700 dark:from-yellow-900 dark:to-amber-900 dark:text-yellow-100 rounded-full text-xs font-semibold border border-yellow-200 dark:border-yellow-700 shadow-sm',
      icon: '⏳',
      label: 'Pending / قيد الانتظار'
    },
    approved: {
      className: 'px-3 py-1.5 bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-700 dark:from-blue-900 dark:to-cyan-900 dark:text-blue-100 rounded-full text-xs font-semibold border border-blue-200 dark:border-blue-700 shadow-sm',
      icon: '✓✓',
      label: 'Approved / موافق عليه'
    },
    rejected: {
      className: 'px-3 py-1.5 bg-gradient-to-r from-red-50 to-rose-50 text-red-700 dark:from-red-900 dark:to-rose-900 dark:text-red-100 rounded-full text-xs font-semibold border border-red-200 dark:border-red-700 shadow-sm',
      icon: '✕',
      label: 'Rejected / مرفوض'
    },
  },

  // ═══════════════════════════════════════════════════════════
  // 💫 Hover Effects - تأثيرات التمرير
  // ═══════════════════════════════════════════════════════════
  hoverEffects: {
    row: 'hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors duration-200 cursor-pointer',
    cell: 'hover:text-blue-600 dark:hover:text-blue-400 transition-colors',
    button: 'hover:shadow-lg hover:scale-105 transition-all duration-200',
    icon: 'hover:text-blue-600 dark:hover:text-blue-400 hover:scale-110 transition-all duration-200',
  },

  // ═══════════════════════════════════════════════════════════
  // 🎯 Loading States - حالات التحميل
  // ═══════════════════════════════════════════════════════════
  loadingStates: {
    skeleton: 'bg-gray-200 dark:bg-gray-700 animate-pulse rounded',
    spinner: 'animate-spin',
    pulse: 'animate-pulse',
  },

  // ═══════════════════════════════════════════════════════════
  // 📊 Data Visualization - تصميم عرض البيانات
  // ═══════════════════════════════════════════════════════════
  dataVisualization: {
    colorCode: {
      primary: 'bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100',
      success: 'bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-100',
      warning: 'bg-yellow-100 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-100',
      danger: 'bg-red-100 text-red-900 dark:bg-red-900 dark:text-red-100',
      info: 'bg-cyan-100 text-cyan-900 dark:bg-cyan-900 dark:text-cyan-100',
      purple: 'bg-purple-100 text-purple-900 dark:bg-purple-900 dark:text-purple-100',
    },
    badge: {
      primary: 'inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 rounded-full text-xs font-medium',
      success: 'inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200 rounded-full text-xs font-medium',
      warning: 'inline-flex items-center gap-1.5 px-2.5 py-1 bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200 rounded-full text-xs font-medium',
      danger: 'inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200 rounded-full text-xs font-medium',
    }
  },

  // ═══════════════════════════════════════════════════════════
  // 🎪 Animation Classes - فئات الرسوم المتحركة
  // ═══════════════════════════════════════════════════════════
  animations: {
    fadeIn: 'animate-fadeIn',
    slideIn: 'animate-slideIn',
    scaleIn: 'animate-scaleIn',
    bounce: 'animate-bounce',
    pulse: 'animate-pulse',
  },

  // ═══════════════════════════════════════════════════════════
  // 🔔 Toast Styling - تصميم الإشعارات
  // ═══════════════════════════════════════════════════════════
  toast: {
    success: 'bg-green-50 border-l-4 border-green-500 text-green-800 dark:bg-green-900/20 dark:text-green-200',
    error: 'bg-red-50 border-l-4 border-red-500 text-red-800 dark:bg-red-900/20 dark:text-red-200',
    warning: 'bg-yellow-50 border-l-4 border-yellow-500 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200',
    info: 'bg-blue-50 border-l-4 border-blue-500 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200',
  },

  // ═══════════════════════════════════════════════════════════
  // 📏 Spacing & Layout - المسافات والتخطيط
  // ═══════════════════════════════════════════════════════════
  spacing: {
    containerPadding: 'px-4 py-6 sm:px-6 lg:px-8',
    gridGap: 'gap-4',
    modalGap: 'gap-3',
  },

  // ═══════════════════════════════════════════════════════════
  // 🎨 Shadow Styles - أنماط الظلال
  // ═══════════════════════════════════════════════════════════
  shadows: {
    subtle: 'shadow-sm',
    medium: 'shadow-md',
    large: 'shadow-lg',
    hover: 'hover:shadow-lg transition-shadow',
  },

  // ═══════════════════════════════════════════════════════════
  // 📌 Icons Display - عرض الأيقونات
  // ═══════════════════════════════════════════════════════════
  icons: {
    size: {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
      xl: 'w-8 h-8',
    },
    colors: {
      primary: 'text-blue-600 dark:text-blue-400',
      success: 'text-green-600 dark:text-green-400',
      warning: 'text-yellow-600 dark:text-yellow-400',
      danger: 'text-red-600 dark:text-red-400',
      neutral: 'text-gray-600 dark:text-gray-400',
    }
  }
};

/**
 * Helper function: Format status with enhanced styling
 */
export const formatEnhancedStatus = (isActive: boolean) => {
  return isActive ? enhancementConfig.statusBadges.active : enhancementConfig.statusBadges.inactive;
};

/**
 * Helper function: Get badge color based on type
 */
export const getBadgeClass = (type: 'primary' | 'success' | 'warning' | 'danger') => {
  return enhancementConfig.dataVisualization.badge[type];
};

/**
 * Helper function: Format numbers with thousands separator
 */
export const formatNumber = (value: number | undefined): string => {
  if (value === undefined || value === null) return '-';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
};

/**
 * Helper function: Format currency
 */
export const formatCurrency = (value: number | undefined, currency = 'SAR'): string => {
  if (value === undefined || value === null) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(value);
};

/**
 * Helper function: Format percentage
 */
export const formatPercentage = (value: number | undefined): string => {
  if (value === undefined || value === null) return '-';
  return `${value.toFixed(2)}%`;
};

/**
 * Helper function: Format date
 */
export const formatDate = (dateString: string | undefined, locale = 'en-US'): string => {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '-';
  }
};

export default enhancementConfig;
