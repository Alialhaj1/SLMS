/**
 * 📦 THREE-WAY MATCHING DISPLAY
 * ==============================
 * Shows PO ↔ GR ↔ Invoice matching status with variances
 * 
 * Features:
 * ✅ Visual matching indicator
 * ✅ Variance warnings
 * ✅ Color-coded status
 * ✅ Bilingual (EN/AR)
 */

import React from 'react';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  XCircleIcon,
  ArrowRightIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { useLocale } from '../../contexts/LocaleContext';

export interface MatchingVariance {
  type: 'quantity' | 'price' | 'total';
  item_id: number;
  item_name: string;
  expected: number;
  actual: number;
  variance: number;
  variance_percent: number;
  severity: 'info' | 'warning' | 'error';
  message: string;
  message_ar: string;
}

export interface MatchingResult {
  is_matched: boolean;
  match_status: 'full_match' | 'partial_match' | 'variance_detected' | 'unmatched' | 'error';
  total_variances: number;
  variances: MatchingVariance[];
  summary: {
    po_total: number;
    gr_total: number;
    invoice_total: number;
    total_variance: number;
    variance_percent: number;
  };
  warnings: string[];
  warnings_ar: string[];
  requires_approval: boolean;
  matched_lines: Array<{
    invoice_line_id: number;
    po_line_id?: number;
    gr_line_id?: number;
    match_percent: number;
  }>;
}

interface ThreeWayMatchingDisplayProps {
  matchingResult?: MatchingResult;
  loading?: boolean;
  compact?: boolean;
}

const STATUS_CONFIG = {
  full_match: {
    icon: CheckCircleIcon,
    color: 'text-green-600',
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800',
    label: { en: 'Fully Matched', ar: 'مطابقة كاملة' }
  },
  partial_match: {
    icon: InformationCircleIcon,
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    label: { en: 'Partial Match', ar: 'مطابقة جزئية' }
  },
  variance_detected: {
    icon: ExclamationTriangleIcon,
    color: 'text-amber-600',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800',
    label: { en: 'Variance Detected', ar: 'تم اكتشاف فروقات' }
  },
  unmatched: {
    icon: XCircleIcon,
    color: 'text-gray-500',
    bg: 'bg-gray-50 dark:bg-gray-800',
    border: 'border-gray-200 dark:border-gray-700',
    label: { en: 'Unmatched', ar: 'غير مطابق' }
  },
  error: {
    icon: XCircleIcon,
    color: 'text-red-600',
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    label: { en: 'Error', ar: 'خطأ' }
  }
};

export const ThreeWayMatchingDisplay: React.FC<ThreeWayMatchingDisplayProps> = ({
  matchingResult,
  loading = false,
  compact = false
}) => {
  const { locale } = useLocale();
  const isArabic = locale === 'ar';

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-20 bg-gray-100 dark:bg-slate-700 rounded-lg"></div>
      </div>
    );
  }

  if (!matchingResult) {
    return null;
  }

  const config = STATUS_CONFIG[matchingResult.match_status];
  const StatusIcon = config.icon;

  // Compact view (badge)
  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${config.bg} ${config.border} border`}>
        <StatusIcon className={`h-4 w-4 ${config.color}`} />
        <span className={`text-xs font-medium ${config.color}`}>
          {isArabic ? config.label.ar : config.label.en}
        </span>
        {matchingResult.total_variances > 0 && (
          <span className="bg-amber-500 text-white text-xs px-1.5 rounded-full">
            {matchingResult.total_variances}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-lg border ${config.border} ${config.bg} overflow-hidden`} dir={isArabic ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-inherit">
        <div className="flex items-center gap-3">
          <StatusIcon className={`h-6 w-6 ${config.color}`} />
          <div>
            <h4 className={`font-medium ${config.color}`}>
              {isArabic ? config.label.ar : config.label.en}
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isArabic ? 'مطابقة ثلاثية: أمر الشراء ↔ الاستلام ↔ الفاتورة' : '3-Way Match: PO ↔ GR ↔ Invoice'}
            </p>
          </div>
        </div>
        {matchingResult.requires_approval && (
          <span className="px-3 py-1 bg-amber-500 text-white text-xs font-medium rounded-full">
            {isArabic ? 'يتطلب اعتماد' : 'Requires Approval'}
          </span>
        )}
      </div>

      {/* Summary */}
      <div className="px-4 py-3 grid grid-cols-3 gap-4 border-b border-inherit">
        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            {isArabic ? 'أمر الشراء' : 'PO Total'}
          </p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {matchingResult.summary.po_total.toLocaleString(isArabic ? 'ar-SA' : 'en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="text-center border-x border-inherit">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            {isArabic ? 'الاستلام' : 'GR Total'}
          </p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {matchingResult.summary.gr_total.toLocaleString(isArabic ? 'ar-SA' : 'en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            {isArabic ? 'الفاتورة' : 'Invoice Total'}
          </p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {matchingResult.summary.invoice_total.toLocaleString(isArabic ? 'ar-SA' : 'en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Variances */}
      {matchingResult.variances.length > 0 && (
        <div className="px-4 py-3">
          <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {isArabic ? 'الفروقات المكتشفة:' : 'Detected Variances:'}
          </h5>
          <div className="space-y-2">
            {matchingResult.variances.map((variance, index) => (
              <VarianceRow key={index} variance={variance} isArabic={isArabic} />
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {matchingResult.warnings.length > 0 && (
        <div className="px-4 py-3 bg-amber-50/50 dark:bg-amber-900/10">
          <div className="flex items-start gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <ul className="text-sm text-amber-700 dark:text-amber-400 space-y-1">
              {(isArabic ? matchingResult.warnings_ar : matchingResult.warnings).map((warning, index) => (
                <li key={index}>• {warning}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

// Variance row component
interface VarianceRowProps {
  variance: MatchingVariance;
  isArabic: boolean;
}

const VarianceRow: React.FC<VarianceRowProps> = ({ variance, isArabic }) => {
  const severityConfig = {
    info: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400' },
    warning: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400' },
    error: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400' }
  };

  const config = severityConfig[variance.severity];

  return (
    <div className={`flex items-center justify-between px-3 py-2 rounded-lg ${config.bg}`}>
      <div className="flex items-center gap-2">
        <span className="font-medium text-gray-900 dark:text-white">
          {variance.item_name}
        </span>
        <span className={`text-xs px-1.5 py-0.5 rounded ${variance.type === 'quantity' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
          {variance.type === 'quantity' ? (isArabic ? 'كمية' : 'Qty') : (isArabic ? 'سعر' : 'Price')}
        </span>
      </div>
      <div className={`text-sm ${config.text}`}>
        <span>{variance.expected}</span>
        <ArrowRightIcon className="h-3 w-3 inline mx-1" />
        <span className="font-semibold">{variance.actual}</span>
        <span className="text-xs mx-1">
          ({variance.variance_percent > 0 ? '+' : ''}{variance.variance_percent.toFixed(1)}%)
        </span>
      </div>
    </div>
  );
};

export default ThreeWayMatchingDisplay;
