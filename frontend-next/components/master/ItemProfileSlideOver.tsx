import { Fragment, useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
  XMarkIcon,
  CubeIcon,
  TagIcon,
  ScaleIcon,
  BuildingStorefrontIcon,
  ClockIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import { useLocale } from '@/contexts/LocaleContext';
import apiClient from '@/lib/apiClient';
import Button from '@/components/ui/Button';

interface ItemProfileProps {
  itemId: number | null;
  isOpen: boolean;
  onClose: () => void;
}

interface ItemProfile {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  description?: string;
  sku?: string;
  barcode?: string;
  
  // Flags
  has_movement: boolean;
  policies_locked: boolean;
  is_active: boolean;
  is_composite: boolean;
  track_inventory: boolean;
  
  // Policies
  tracking_policy: string;
  valuation_method: string;
  
  // Stock
  total_on_hand: number;
  quantity_reserved: number;
  quantity_available: number;
  warehouses_count: number;
  
  // Related
  category_name?: string;
  group_name?: string;
  base_uom_code?: string;
  item_type_name?: string;
  default_vendor_name?: string;
  
  // Additional data
  groups?: any[];
  unit_conversions?: any[];
  warehouses?: any[];
  bom_components?: any[];
  recent_movements?: any[];
}

const TABS = [
  { id: 'overview', name: 'Overview', name_ar: 'نظرة عامة', icon: CubeIcon },
  { id: 'classification', name: 'Classification', name_ar: 'التصنيف', icon: TagIcon },
  { id: 'units', name: 'Units', name_ar: 'الوحدات', icon: ScaleIcon },
  { id: 'warehouses', name: 'Warehouses', name_ar: 'المخازن', icon: BuildingStorefrontIcon },
  { id: 'movements', name: 'Movements', name_ar: 'الحركات', icon: ClockIcon },
  { id: 'bom', name: 'BOM', name_ar: 'المكونات', icon: ChartBarIcon },
];

export default function ItemProfileSlideOver({ itemId, isOpen, onClose }: ItemProfileProps) {
  const { locale } = useLocale();
  const isRTL = locale === 'ar';
  
  const [loading, setLoading] = useState(false);
  const [item, setItem] = useState<ItemProfile | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (itemId && isOpen) {
      fetchItemProfile();
    }
  }, [itemId, isOpen]);

  const fetchItemProfile = async () => {
    if (!itemId) return;
    
    setLoading(true);
    try {
      const response = await apiClient.get(`/api/master/items/${itemId}/full-profile`);
      if (response.success) {
        setItem(response.data);
      }
    } catch (error: any) {
      console.error('Failed to fetch item profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderOverviewTab = () => {
    if (!item) return null;

    return (
      <div className="space-y-6">
        {/* Status Badges */}
        <div className="flex flex-wrap gap-2">
          {item.has_movement && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
              <LockClosedIcon className="w-4 h-4" />
              {isRTL ? 'له حركة' : 'Has Movement'}
            </span>
          )}
          {item.is_active ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
              <CheckCircleIcon className="w-4 h-4" />
              {isRTL ? 'نشط' : 'Active'}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
              {isRTL ? 'غير نشط' : 'Inactive'}
            </span>
          )}
          {item.is_composite && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
              {isRTL ? 'صنف مركب' : 'Composite'}
            </span>
          )}
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {isRTL ? 'الكود' : 'Code'}
            </label>
            <p className="text-base font-mono text-gray-900 dark:text-white">{item.code}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {isRTL ? 'SKU' : 'SKU'}
            </label>
            <p className="text-base font-mono text-gray-900 dark:text-white">{item.sku || '-'}</p>
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {isRTL ? 'الاسم' : 'Name'}
            </label>
            <p className="text-base text-gray-900 dark:text-white">{isRTL ? item.name_ar || item.name : item.name}</p>
          </div>

          {item.description && (
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isRTL ? 'الوصف' : 'Description'}
              </label>
              <p className="text-sm text-gray-600 dark:text-gray-400">{item.description}</p>
            </div>
          )}
        </div>

        {/* Stock Summary */}
        <div className="border-t dark:border-gray-700 pt-4">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            {isRTL ? 'ملخص المخزون' : 'Stock Summary'}
          </h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
              <p className="text-xs text-gray-600 dark:text-gray-400">{isRTL ? 'الإجمالي' : 'On Hand'}</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{item.total_on_hand || 0}</p>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
              <p className="text-xs text-gray-600 dark:text-gray-400">{isRTL ? 'محجوز' : 'Reserved'}</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{item.quantity_reserved || 0}</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
              <p className="text-xs text-gray-600 dark:text-gray-400">{isRTL ? 'متاح' : 'Available'}</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{item.quantity_available || 0}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {isRTL ? `${item.warehouses_count} مخزن` : `${item.warehouses_count} warehouse(s)`}
          </p>
        </div>

        {/* Policies */}
        <div className="border-t dark:border-gray-700 pt-4">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            {isRTL ? 'السياسات' : 'Policies'}
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                {isRTL ? 'سياسة التتبع' : 'Tracking Policy'}
              </label>
              <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                {item.tracking_policy?.replace('_', ' ') || 'None'}
              </p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                {isRTL ? 'طريقة التقييم' : 'Valuation Method'}
              </label>
              <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                {item.valuation_method?.replace('_', ' ') || '-'}
              </p>
            </div>
          </div>
          {item.policies_locked && (
            <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
              <ExclamationCircleIcon className="w-4 h-4" />
              <span>{isRTL ? 'السياسات مقفلة بسبب وجود حركة' : 'Policies locked due to movements'}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderClassificationTab = () => {
    if (!item) return null;

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {isRTL ? 'النوع' : 'Item Type'}
          </label>
          <p className="text-base text-gray-900 dark:text-white">{item.item_type_name || '-'}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {isRTL ? 'الفئة' : 'Category'}
          </label>
          <p className="text-base text-gray-900 dark:text-white">{item.category_name || '-'}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {isRTL ? 'المجموعة الرئيسية' : 'Primary Group'}
          </label>
          <p className="text-base text-gray-900 dark:text-white">{item.group_name || '-'}</p>
        </div>

        {item.groups && item.groups.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {isRTL ? 'المجموعات الثانوية' : 'Secondary Groups'}
            </label>
            <div className="flex flex-wrap gap-2">
              {item.groups.filter(g => !g.is_primary).map(group => (
                <span
                  key={group.id}
                  className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                  {isRTL ? group.group_name_ar || group.group_name : group.group_name}
                </span>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {isRTL ? 'المورد الافتراضي' : 'Default Vendor'}
          </label>
          <p className="text-base text-gray-900 dark:text-white">{item.default_vendor_name || '-'}</p>
        </div>
      </div>
    );
  };

  const renderUnitsTab = () => {
    if (!item) return null;

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {isRTL ? 'الوحدة الأساسية' : 'Base Unit'}
          </label>
          <p className="text-base font-semibold text-gray-900 dark:text-white">{item.base_uom_code || '-'}</p>
        </div>

        {item.unit_conversions && item.unit_conversions.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {isRTL ? 'تحويلات الوحدات' : 'Unit Conversions'}
            </label>
            <div className="space-y-2">
              {item.unit_conversions.map((conv: any) => (
                <div key={conv.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span className="text-sm text-gray-900 dark:text-white">
                    1 {conv.from_uom_code} = {conv.conversion_factor} {conv.to_uom_code}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderWarehousesTab = () => {
    if (!item) return null;

    return (
      <div className="space-y-4">
        {item.warehouses && item.warehouses.length > 0 ? (
          <div className="space-y-3">
            {item.warehouses.map((wh: any) => (
              <div key={wh.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h5 className="font-medium text-gray-900 dark:text-white">
                      {isRTL ? wh.warehouse_name_ar || wh.warehouse_name : wh.warehouse_name}
                    </h5>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{wh.warehouse_code}</p>
                  </div>
                  {wh.is_default && (
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                      {isRTL ? 'افتراضي' : 'Default'}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {wh.min_stock && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">{isRTL ? 'حد أدنى' : 'Min'}:</span>
                      <span className="ml-1 font-medium text-gray-900 dark:text-white">{wh.min_stock}</span>
                    </div>
                  )}
                  {wh.max_stock && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">{isRTL ? 'حد أقصى' : 'Max'}:</span>
                      <span className="ml-1 font-medium text-gray-900 dark:text-white">{wh.max_stock}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
            {isRTL ? 'لا توجد مخازن مرتبطة' : 'No warehouses assigned'}
          </p>
        )}
      </div>
    );
  };

  const renderMovementsTab = () => {
    if (!item) return null;

    return (
      <div className="space-y-2">
        {item.recent_movements && item.recent_movements.length > 0 ? (
          item.recent_movements.map((mov: any) => (
            <div key={mov.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {mov.warehouse_name || '-'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{mov.ref_type}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${mov.qty_delta > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {mov.qty_delta > 0 ? '+' : ''}{mov.qty_delta}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(mov.occurred_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
            {isRTL ? 'لا توجد حركات' : 'No movements yet'}
          </p>
        )}
      </div>
    );
  };

  const renderBOMTab = () => {
    if (!item) return null;

    if (!item.is_composite) {
      return (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
          {isRTL ? 'هذا الصنف ليس مركباً' : 'This item is not composite'}
        </p>
      );
    }

    return (
      <div className="space-y-2">
        {item.bom_components && item.bom_components.length > 0 ? (
          item.bom_components.map((comp: any) => (
            <div key={comp.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {isRTL ? comp.component_name_ar || comp.component_name : comp.component_name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{comp.component_code}</p>
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {comp.quantity} {comp.uom_code}
                </p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
            {isRTL ? 'لا توجد مكونات' : 'No components defined'}
          </p>
        )}
      </div>
    );
  };

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab();
      case 'classification':
        return renderClassificationTab();
      case 'units':
        return renderUnitsTab();
      case 'warehouses':
        return renderWarehousesTab();
      case 'movements':
        return renderMovementsTab();
      case 'bom':
        return renderBOMTab();
      default:
        return null;
    }
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-in-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in-out duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className={`pointer-events-none fixed inset-y-0 ${isRTL ? 'left-0' : 'right-0'} flex max-w-full ${isRTL ? 'pl-10' : 'pr-10'}`}>
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-300"
                enterFrom={isRTL ? '-translate-x-full' : 'translate-x-full'}
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-300"
                leaveFrom="translate-x-0"
                leaveTo={isRTL ? '-translate-x-full' : 'translate-x-full'}
              >
                <Dialog.Panel className="pointer-events-auto w-screen max-w-2xl">
                  <div className="flex h-full flex-col bg-white dark:bg-gray-900 shadow-xl">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-6 sm:px-6">
                      <div className="flex items-start justify-between">
                        <Dialog.Title className="text-xl font-semibold text-white">
                          {loading ? (isRTL ? 'جاري التحميل...' : 'Loading...') : item ? (isRTL ? item.name_ar || item.name : item.name) : ''}
                        </Dialog.Title>
                        <button
                          type="button"
                          className="rounded-md text-white hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-white"
                          onClick={onClose}
                        >
                          <XMarkIcon className="h-6 w-6" />
                        </button>
                      </div>
                      {item && (
                        <p className="mt-1 text-sm text-blue-100">{item.code}</p>
                      )}
                    </div>

                    {/* Tabs */}
                    <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                      <nav className="-mb-px flex space-x-4 px-4 overflow-x-auto" aria-label="Tabs">
                        {TABS.map((tab) => {
                          const Icon = tab.icon;
                          return (
                            <button
                              key={tab.id}
                              onClick={() => setActiveTab(tab.id)}
                              className={`
                                group inline-flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                                ${activeTab === tab.id
                                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                                }
                              `}
                            >
                              <Icon className="w-5 h-5" />
                              {isRTL ? tab.name_ar : tab.name}
                            </button>
                          );
                        })}
                      </nav>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
                      {loading ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        </div>
                      ) : (
                        renderActiveTabContent()
                      )}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-4 sm:px-6">
                      <Button variant="secondary" onClick={onClose} className="w-full">
                        {isRTL ? 'إغلاق' : 'Close'}
                      </Button>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
