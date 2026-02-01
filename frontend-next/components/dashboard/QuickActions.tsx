/**
 * ⚡ QuickActions Component - Enhanced Quick Action Buttons
 * =========================================================
 * 
 * Provides quick access to common actions:
 * - New Shipment
 * - New Bill of Lading
 * - New Expense
 * - New Payment
 * - Transfer Request
 * - Customs Declaration
 * - New Project
 * - New Letter of Credit
 * 
 * Features:
 * - Permission-based visibility
 * - Hover tooltips
 * - RTL/LTR support
 * - Dark mode colors
 */

import React from 'react';
import { useRouter } from 'next/router';
import {
  TruckIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  CreditCardIcon,
  ArrowsRightLeftIcon,
  DocumentCheckIcon,
  FolderPlusIcon,
  BanknotesIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from '../../hooks/useTranslation.enhanced';
import { usePermissions } from '../../hooks/usePermissions';

interface QuickAction {
  key: string;
  titleKey: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  permission?: string;
  color: string;
  bgColor: string;
}

interface QuickActionsProps {
  onActionClick?: (action: string) => void;
  variant?: 'grid' | 'list';
}

// Quick action configuration
const QUICK_ACTIONS: QuickAction[] = [
  {
    key: 'newShipment',
    titleKey: 'dashboard.quickActions.newShipment',
    icon: TruckIcon,
    href: '/shipments/create',
    permission: 'shipments:create',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800',
  },
  {
    key: 'newBillOfLading',
    titleKey: 'dashboard.quickActions.newBillOfLading',
    icon: DocumentTextIcon,
    href: '/shipping-bills/create',
    permission: 'shipping_bills:create',
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900 hover:bg-indigo-200 dark:hover:bg-indigo-800',
  },
  {
    key: 'newExpense',
    titleKey: 'dashboard.quickActions.newExpense',
    icon: CurrencyDollarIcon,
    href: '/expenses/create',
    permission: 'shipment_expenses:create',
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900 hover:bg-yellow-200 dark:hover:bg-yellow-800',
  },
  {
    key: 'newPayment',
    titleKey: 'dashboard.quickActions.newPayment',
    icon: CreditCardIcon,
    href: '/finance/vendor-payments/create',
    permission: 'vendor_payments:create',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900 hover:bg-green-200 dark:hover:bg-green-800',
  },
  {
    key: 'newTransfer',
    titleKey: 'dashboard.quickActions.newTransfer',
    icon: ArrowsRightLeftIcon,
    href: '/finance/transfer-requests/create',
    permission: 'transfer_requests:create',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900 hover:bg-purple-200 dark:hover:bg-purple-800',
  },
  {
    key: 'newCustomsDeclaration',
    titleKey: 'dashboard.quickActions.newCustomsDeclaration',
    icon: DocumentCheckIcon,
    href: '/customs/declarations/create',
    permission: 'customs_declarations:create',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900 hover:bg-orange-200 dark:hover:bg-orange-800',
  },
  {
    key: 'newProject',
    titleKey: 'dashboard.quickActions.newProject',
    icon: FolderPlusIcon,
    href: '/projects/create',
    permission: 'projects:create',
    color: 'text-teal-600 dark:text-teal-400',
    bgColor: 'bg-teal-100 dark:bg-teal-900 hover:bg-teal-200 dark:hover:bg-teal-800',
  },
  {
    key: 'newLC',
    titleKey: 'dashboard.quickActions.newLC',
    icon: BanknotesIcon,
    href: '/finance/letters-of-credit/create',
    permission: 'letters_of_credit:create',
    color: 'text-pink-600 dark:text-pink-400',
    bgColor: 'bg-pink-100 dark:bg-pink-900 hover:bg-pink-200 dark:hover:bg-pink-800',
  },
];

const QuickActions: React.FC<QuickActionsProps> = ({ onActionClick, variant = 'grid' }) => {
  const { t } = useTranslation();
  const router = useRouter();
  const { hasPermission } = usePermissions();

  // Filter actions based on permissions
  const visibleActions = QUICK_ACTIONS.filter(
    action => !action.permission || hasPermission(action.permission)
  );

  const handleActionClick = (action: QuickAction) => {
    if (onActionClick) {
      onActionClick(action.href);
    }
    router.push(action.href);
  };

  if (visibleActions.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      {/* Header */}
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <PlusIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        {t('dashboard.quickActions.title')}
      </h2>

      {/* Actions Grid */}
      <div className={variant === 'grid' 
        ? "grid grid-cols-2 gap-3"
        : "space-y-2"
      }>
        {visibleActions.map((action) => {
          const Icon = action.icon;
          
          return (
            <button
              key={action.key}
              onClick={() => handleActionClick(action)}
              className={`${action.bgColor} rounded-lg p-3 transition-all duration-200 flex items-center gap-3 text-start group hover:shadow-md`}
            >
              <div className={`${action.color} flex-shrink-0`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className={`${action.color} font-medium text-sm group-hover:underline flex-1`}>
                {t(action.titleKey)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default QuickActions;
