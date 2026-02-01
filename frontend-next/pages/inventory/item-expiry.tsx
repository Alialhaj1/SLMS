/**
 * 📦 Item Expiry Management - إدارة انتهاء صلاحية الأصناف
 * ========================================================
 * تتبع الأصناف المنتهية الصلاحية والقريبة من الانتهاء
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import {
  ArchiveBoxIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  DocumentArrowDownIcon,
  TrashIcon,
  CubeIcon,
} from '@heroicons/react/24/outline';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useToast } from '../../contexts/ToastContext';
import { useTranslation } from '../../hooks/useTranslation';
import { usePermissions } from '../../hooks/usePermissions';
import clsx from 'clsx';

interface ExpiryItem {
  id: number;
  item_code: string;
  item_name: string;
  item_name_ar: string;
  batch_number: string;
  warehouse: string;
  warehouse_ar: string;
  quantity: number;
  unit: string;
  expiry_date: string;
  days_until_expiry: number;
  status: 'good' | 'warning' | 'critical' | 'expired';
  cost_value: number;
  disposal_status?: 'pending' | 'approved' | 'disposed';
}

interface ExpirySettings {
  warning_days: number;
  critical_days: number;
  auto_alert: boolean;
  alert_channels: string[];
}

export default function ItemExpiryPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ExpiryItem[]>([]);
  const [settings, setSettings] = useState<ExpirySettings>({
    warning_days: 90,
    critical_days: 30,
    auto_alert: true,
    alert_channels: ['email', 'system']
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterWarehouse, setFilterWarehouse] = useState<string>('all');
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [confirmDispose, setConfirmDispose] = useState(false);

  const canManage = hasPermission('inventory:manage');

  const warehouses = [
    { value: 'main', label: 'Main Warehouse', label_ar: 'المستودع الرئيسي' },
    { value: 'branch1', label: 'Branch 1', label_ar: 'الفرع الأول' },
    { value: 'branch2', label: 'Branch 2', label_ar: 'الفرع الثاني' },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      setItems([
        {
          id: 1, item_code: 'MED-001', item_name: 'Paracetamol 500mg', item_name_ar: 'باراسيتامول 500 مج',
          batch_number: 'BAT-2023-001', warehouse: 'Main Warehouse', warehouse_ar: 'المستودع الرئيسي',
          quantity: 500, unit: 'Box', expiry_date: '2024-02-15', days_until_expiry: 30,
          status: 'critical', cost_value: 2500
        },
        {
          id: 2, item_code: 'MED-002', item_name: 'Amoxicillin 250mg', item_name_ar: 'أموكسيسيلين 250 مج',
          batch_number: 'BAT-2023-002', warehouse: 'Main Warehouse', warehouse_ar: 'المستودع الرئيسي',
          quantity: 200, unit: 'Box', expiry_date: '2024-04-20', days_until_expiry: 95,
          status: 'warning', cost_value: 4000
        },
        {
          id: 3, item_code: 'FOOD-001', item_name: 'Canned Tuna', item_name_ar: 'تونة معلبة',
          batch_number: 'BAT-2023-010', warehouse: 'Branch 1', warehouse_ar: 'الفرع الأول',
          quantity: 100, unit: 'Can', expiry_date: '2024-01-10', days_until_expiry: -5,
          status: 'expired', cost_value: 800, disposal_status: 'pending'
        },
        {
          id: 4, item_code: 'FOOD-002', item_name: 'Milk Powder', item_name_ar: 'حليب بودرة',
          batch_number: 'BAT-2023-015', warehouse: 'Main Warehouse', warehouse_ar: 'المستودع الرئيسي',
          quantity: 50, unit: 'Kg', expiry_date: '2024-06-30', days_until_expiry: 165,
          status: 'good', cost_value: 1500
        },
        {
          id: 5, item_code: 'CHEM-001', item_name: 'Cleaning Solution', item_name_ar: 'محلول تنظيف',
          batch_number: 'BAT-2023-020', warehouse: 'Branch 2', warehouse_ar: 'الفرع الثاني',
          quantity: 30, unit: 'Liter', expiry_date: '2024-03-15', days_until_expiry: 60,
          status: 'warning', cost_value: 600
        },
        {
          id: 6, item_code: 'MED-003', item_name: 'Vitamin C', item_name_ar: 'فيتامين سي',
          batch_number: 'BAT-2022-050', warehouse: 'Main Warehouse', warehouse_ar: 'المستودع الرئيسي',
          quantity: 1000, unit: 'Tablet', expiry_date: '2023-12-31', days_until_expiry: -15,
          status: 'expired', cost_value: 3000, disposal_status: 'approved'
        },
      ]);
    } catch (error) {
      showToast(t('common.fetchError') || 'Failed to fetch', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      showToast('Settings saved', 'success');
      setIsSettingsOpen(false);
    } catch (error) {
      showToast('Failed to save', 'error');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(filteredItems.map(i => i.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedItems(prev => [...prev, id]);
    } else {
      setSelectedItems(prev => prev.filter(i => i !== id));
    }
  };

  const handleDispose = async () => {
    try {
      setItems(prev => prev.map(item => 
        selectedItems.includes(item.id) ? { ...item, disposal_status: 'disposed' as const } : item
      ));
      showToast(`${selectedItems.length} items marked for disposal`, 'success');
      setSelectedItems([]);
    } finally {
      setConfirmDispose(false);
    }
  };

  const handleExport = () => {
    showToast('Report exported', 'success');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'good': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'warning': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'critical': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'expired': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDisposalBadge = (status?: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'disposed': return 'bg-gray-100 text-gray-800';
      default: return '';
    }
  };

  const filteredItems = items.filter(item => {
    if (filterStatus !== 'all' && item.status !== filterStatus) return false;
    if (filterWarehouse !== 'all' && !item.warehouse.toLowerCase().includes(filterWarehouse)) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return item.item_code.toLowerCase().includes(query) ||
             item.item_name.toLowerCase().includes(query) ||
             item.item_name_ar.includes(query) ||
             item.batch_number.toLowerCase().includes(query);
    }
    return true;
  });

  const stats = {
    total: items.length,
    expired: items.filter(i => i.status === 'expired').length,
    critical: items.filter(i => i.status === 'critical').length,
    warning: items.filter(i => i.status === 'warning').length,
    totalValue: items.filter(i => i.status === 'expired' || i.status === 'critical').reduce((sum, i) => sum + i.cost_value, 0),
  };

  return (
    <MainLayout>
      <Head>
        <title>{t('expiry.title') || 'Item Expiry'} | SLMS</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <ArchiveBoxIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                {t('expiry.title') || 'Item Expiry Management'}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t('expiry.subtitle') || 'Track expiring and expired inventory items'}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleExport}>
              <DocumentArrowDownIcon className="w-5 h-5 me-2" />
              Export
            </Button>
            <Button variant="secondary" onClick={() => setIsSettingsOpen(true)}>
              Settings
            </Button>
            {selectedItems.length > 0 && (
              <Button variant="danger" onClick={() => setConfirmDispose(true)} disabled={!canManage}>
                <TrashIcon className="w-5 h-5 me-2" />
                Dispose ({selectedItems.length})
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-blue-600">
              <CubeIcon className="w-5 h-5" />
              <span className="text-2xl font-bold">{stats.total}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Total Items</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-red-600">
              <XCircleIcon className="w-5 h-5" />
              <span className="text-2xl font-bold">{stats.expired}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Expired</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-orange-600">
              <ExclamationTriangleIcon className="w-5 h-5" />
              <span className="text-2xl font-bold">{stats.critical}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Critical (&lt;{settings.critical_days}d)</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-yellow-600">
              <ClockIcon className="w-5 h-5" />
              <span className="text-2xl font-bold">{stats.warning}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Warning (&lt;{settings.warning_days}d)</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-red-600">
              <span className="text-2xl font-bold">{(stats.totalValue / 1000).toFixed(1)}K</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">At Risk (SAR)</p>
          </div>
        </div>

        {/* Filters & Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Search items..." value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg" />
              </div>
              <div className="flex items-center gap-2">
                <FunnelIcon className="w-5 h-5 text-gray-400" />
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <option value="all">All Status</option>
                  <option value="good">Good</option>
                  <option value="warning">Warning</option>
                  <option value="critical">Critical</option>
                  <option value="expired">Expired</option>
                </select>
                <select value={filterWarehouse} onChange={(e) => setFilterWarehouse(e.target.value)}
                  className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <option value="all">All Warehouses</option>
                  {warehouses.map(w => (
                    <option key={w.value} value={w.value}>{locale === 'ar' ? w.label_ar : w.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center py-12">
                <ArrowPathIcon className="w-8 h-8 text-gray-400 animate-spin" />
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-start">
                      <input type="checkbox" 
                        checked={selectedItems.length === filteredItems.length && filteredItems.length > 0}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="w-4 h-4 text-red-600 rounded" />
                    </th>
                    <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">Item</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Batch</th>
                    <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">Warehouse</th>
                    <th className="px-4 py-3 text-end text-xs font-medium text-gray-500 uppercase">Qty</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Expiry</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-end text-xs font-medium text-gray-500 uppercase">Value</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Disposal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className={clsx('hover:bg-gray-50 dark:hover:bg-gray-700/50',
                      item.status === 'expired' && 'bg-red-50/50 dark:bg-red-900/10')}>
                      <td className="px-4 py-3">
                        <input type="checkbox"
                          checked={selectedItems.includes(item.id)}
                          onChange={(e) => handleSelectItem(item.id, e.target.checked)}
                          className="w-4 h-4 text-red-600 rounded" />
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-mono text-sm text-blue-600">{item.item_code}</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {locale === 'ar' ? item.item_name_ar : item.item_name}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-sm">{item.batch_number}</td>
                      <td className="px-4 py-3 text-sm">
                        {locale === 'ar' ? item.warehouse_ar : item.warehouse}
                      </td>
                      <td className="px-4 py-3 text-end font-medium">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <p className="text-sm">{item.expiry_date}</p>
                        <p className={clsx('text-xs',
                          item.days_until_expiry > settings.warning_days ? 'text-green-600' :
                          item.days_until_expiry > settings.critical_days ? 'text-yellow-600' :
                          item.days_until_expiry > 0 ? 'text-orange-600' : 'text-red-600')}>
                          {item.days_until_expiry > 0 ? `${item.days_until_expiry} days` : `${Math.abs(item.days_until_expiry)} days ago`}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', getStatusBadge(item.status))}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-end font-medium">{item.cost_value.toLocaleString()} SAR</td>
                      <td className="px-4 py-3 text-center">
                        {item.disposal_status ? (
                          <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', getDisposalBadge(item.disposal_status))}>
                            {item.disposal_status}
                          </span>
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <Modal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title="Expiry Alert Settings" size="md">
        <div className="space-y-4">
          <Input label="Warning Days" type="number" min="1" value={settings.warning_days}
            onChange={(e) => setSettings({ ...settings, warning_days: parseInt(e.target.value) || 90 })}
            helperText="Items expiring within this period will show warning" />
          <Input label="Critical Days" type="number" min="1" value={settings.critical_days}
            onChange={(e) => setSettings({ ...settings, critical_days: parseInt(e.target.value) || 30 })}
            helperText="Items expiring within this period will show critical alert" />
          <div className="flex items-center gap-3">
            <input type="checkbox" checked={settings.auto_alert}
              onChange={(e) => setSettings({ ...settings, auto_alert: e.target.checked })}
              className="w-5 h-5 text-red-600 rounded" />
            <label>Enable automatic alerts</label>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Alert Channels</label>
            <div className="flex gap-3">
              {['email', 'sms', 'system'].map(ch => (
                <label key={ch} className="flex items-center gap-2">
                  <input type="checkbox" checked={settings.alert_channels.includes(ch)}
                    onChange={(e) => {
                      const channels = e.target.checked
                        ? [...settings.alert_channels, ch]
                        : settings.alert_channels.filter(c => c !== ch);
                      setSettings({ ...settings, alert_channels: channels });
                    }} className="w-4 h-4 text-red-600 rounded" />
                  <span className="capitalize">{ch}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => setIsSettingsOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSettings}>Save Settings</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={confirmDispose} onClose={() => setConfirmDispose(false)}
        onConfirm={handleDispose} title="Dispose Items"
        message={`Are you sure you want to mark ${selectedItems.length} items for disposal?`}
        confirmText="Dispose" variant="danger" />
    </MainLayout>
  );
}
