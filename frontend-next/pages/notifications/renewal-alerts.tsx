/**
 * 🔔 Renewal Alerts - تنبيهات التجديد
 * =====================================
 * إدارة تنبيهات تجديد العقود والتراخيص والاشتراكات
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import {
  BellAlertIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  FunnelIcon,
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

interface RenewalItem {
  id: number;
  type: 'license' | 'contract' | 'subscription' | 'certificate' | 'insurance';
  name: string;
  name_ar: string;
  reference_number: string;
  issue_date: string;
  expiry_date: string;
  renewal_cost?: number;
  vendor?: string;
  status: 'active' | 'expiring_soon' | 'expired';
  days_until_expiry: number;
  reminders_sent: number;
  notes?: string;
}

interface RenewalRule {
  id: number;
  type: string;
  days_before: number[];
  channels: ('email' | 'sms' | 'system')[];
  is_active: boolean;
}

export default function RenewalAlertsPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'items' | 'rules'>('items');
  const [items, setItems] = useState<RenewalItem[]>([]);
  const [rules, setRules] = useState<RenewalRule[]>([]);
  const [selectedItem, setSelectedItem] = useState<RenewalItem | null>(null);
  const [selectedRule, setSelectedRule] = useState<RenewalRule | null>(null);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const canManage = hasPermission('renewals:manage');

  const itemTypes = [
    { value: 'license', label: 'License', label_ar: 'ترخيص' },
    { value: 'contract', label: 'Contract', label_ar: 'عقد' },
    { value: 'subscription', label: 'Subscription', label_ar: 'اشتراك' },
    { value: 'certificate', label: 'Certificate', label_ar: 'شهادة' },
    { value: 'insurance', label: 'Insurance', label_ar: 'تأمين' },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      setItems([
        {
          id: 1, type: 'license', name: 'Commercial Registration', name_ar: 'السجل التجاري',
          reference_number: 'CR-123456', issue_date: '2023-03-15', expiry_date: '2024-03-15',
          renewal_cost: 1500, status: 'expiring_soon', days_until_expiry: 25, reminders_sent: 2
        },
        {
          id: 2, type: 'certificate', name: 'ZATCA Certificate', name_ar: 'شهادة هيئة الزكاة',
          reference_number: 'ZC-789012', issue_date: '2023-06-01', expiry_date: '2024-06-01',
          renewal_cost: 0, status: 'active', days_until_expiry: 120, reminders_sent: 0
        },
        {
          id: 3, type: 'subscription', name: 'Microsoft 365', name_ar: 'مايكروسوفت 365',
          reference_number: 'MS365-001', issue_date: '2023-01-15', expiry_date: '2024-01-15',
          renewal_cost: 5400, vendor: 'Microsoft', status: 'expired', days_until_expiry: -5, reminders_sent: 5
        },
        {
          id: 4, type: 'insurance', name: 'Vehicle Insurance - Fleet', name_ar: 'تأمين أسطول المركبات',
          reference_number: 'INS-2024-001', issue_date: '2023-02-01', expiry_date: '2024-02-01',
          renewal_cost: 45000, vendor: 'Tawuniya', status: 'expiring_soon', days_until_expiry: 15, reminders_sent: 3
        },
        {
          id: 5, type: 'contract', name: 'Office Lease Agreement', name_ar: 'عقد إيجار المكتب',
          reference_number: 'LEASE-001', issue_date: '2022-04-01', expiry_date: '2025-04-01',
          renewal_cost: 180000, vendor: 'ABC Properties', status: 'active', days_until_expiry: 400, reminders_sent: 0
        },
      ]);

      setRules([
        { id: 1, type: 'license', days_before: [90, 60, 30, 7], channels: ['email', 'system'], is_active: true },
        { id: 2, type: 'certificate', days_before: [60, 30, 14], channels: ['email'], is_active: true },
        { id: 3, type: 'subscription', days_before: [30, 14, 7, 1], channels: ['email', 'sms'], is_active: true },
        { id: 4, type: 'insurance', days_before: [90, 60, 30, 14, 7], channels: ['email', 'sms', 'system'], is_active: true },
        { id: 5, type: 'contract', days_before: [180, 90, 60, 30], channels: ['email', 'system'], is_active: true },
      ]);
    } catch (error) {
      showToast(t('common.fetchError') || 'Failed to fetch', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveItem = async () => {
    if (!selectedItem) return;
    try {
      if (selectedItem.id === 0) {
        setItems(prev => [...prev, { ...selectedItem, id: Date.now(), reminders_sent: 0 }]);
      } else {
        setItems(prev => prev.map(i => i.id === selectedItem.id ? selectedItem : i));
      }
      showToast(t('common.saveSuccess') || 'Saved', 'success');
      setIsItemModalOpen(false);
    } catch (error) {
      showToast(t('common.error') || 'Error', 'error');
    }
  };

  const handleDeleteItem = async () => {
    if (!selectedItem) return;
    try {
      setItems(prev => prev.filter(i => i.id !== selectedItem.id));
      showToast(t('common.deleteSuccess') || 'Deleted', 'success');
    } finally {
      setConfirmDelete(false);
      setSelectedItem(null);
    }
  };

  const handleSaveRule = async () => {
    if (!selectedRule) return;
    try {
      setRules(prev => prev.map(r => r.id === selectedRule.id ? selectedRule : r));
      showToast(t('common.saveSuccess') || 'Saved', 'success');
      setIsRuleModalOpen(false);
    } catch (error) {
      showToast(t('common.error') || 'Error', 'error');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'expiring_soon': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'expired': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'license': return '📄';
      case 'contract': return '📋';
      case 'subscription': return '🔄';
      case 'certificate': return '🎖️';
      case 'insurance': return '🛡️';
      default: return '📁';
    }
  };

  const filteredItems = items.filter(item => {
    if (filterType !== 'all' && item.type !== filterType) return false;
    if (filterStatus !== 'all' && item.status !== filterStatus) return false;
    return true;
  });

  const expiringSoon = items.filter(i => i.status === 'expiring_soon').length;
  const expired = items.filter(i => i.status === 'expired').length;

  return (
    <MainLayout>
      <Head>
        <title>{t('renewals.title') || 'Renewal Alerts'} | SLMS</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <BellAlertIcon className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                {t('renewals.title') || 'Renewal Alerts'}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t('renewals.subtitle') || 'Track licenses, contracts, and subscriptions'}
              </p>
            </div>
          </div>
          
          {activeTab === 'items' && (
            <Button onClick={() => {
              setSelectedItem({
                id: 0, type: 'license', name: '', name_ar: '', reference_number: '',
                issue_date: '', expiry_date: '', status: 'active', days_until_expiry: 0, reminders_sent: 0
              });
              setIsItemModalOpen(true);
            }} disabled={!canManage}>
              <PlusIcon className="w-5 h-5 me-2" />
              Add Item
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-blue-600">
              <DocumentTextIcon className="w-5 h-5" />
              <span className="text-2xl font-bold">{items.length}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Total Items</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-yellow-600">
              <ExclamationTriangleIcon className="w-5 h-5" />
              <span className="text-2xl font-bold">{expiringSoon}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Expiring Soon</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-red-600">
              <ClockIcon className="w-5 h-5" />
              <span className="text-2xl font-bold">{expired}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Expired</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircleIcon className="w-5 h-5" />
              <span className="text-2xl font-bold">{items.filter(i => i.status === 'active').length}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Active</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex -mb-px">
              <button onClick={() => setActiveTab('items')}
                className={clsx('px-6 py-4 text-sm font-medium border-b-2 transition-colors',
                  activeTab === 'items' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500')}>
                <DocumentTextIcon className="w-5 h-5 inline-block me-2" />
                Tracked Items
                {(expiringSoon + expired) > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded-full">
                    {expiringSoon + expired}
                  </span>
                )}
              </button>
              <button onClick={() => setActiveTab('rules')}
                className={clsx('px-6 py-4 text-sm font-medium border-b-2 transition-colors',
                  activeTab === 'rules' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500')}>
                <BellAlertIcon className="w-5 h-5 inline-block me-2" />
                Alert Rules
              </button>
            </nav>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex justify-center py-12">
                <ArrowPathIcon className="w-8 h-8 text-gray-400 animate-spin" />
              </div>
            ) : (
              <>
                {activeTab === 'items' && (
                  <>
                    {/* Filters */}
                    <div className="flex flex-wrap gap-4 mb-6">
                      <div className="flex items-center gap-2">
                        <FunnelIcon className="w-5 h-5 text-gray-400" />
                        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
                          className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm">
                          <option value="all">All Types</option>
                          {itemTypes.map(t => (
                            <option key={t.value} value={t.value}>{locale === 'ar' ? t.label_ar : t.label}</option>
                          ))}
                        </select>
                        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                          className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm">
                          <option value="all">All Status</option>
                          <option value="active">Active</option>
                          <option value="expiring_soon">Expiring Soon</option>
                          <option value="expired">Expired</option>
                        </select>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">Type</th>
                            <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">Item</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Reference</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Expiry</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-4 py-3 text-end text-xs font-medium text-gray-500 uppercase">Cost</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {filteredItems.map((item) => (
                            <tr key={item.id} className={clsx('hover:bg-gray-50 dark:hover:bg-gray-700/50',
                              item.status === 'expired' && 'bg-red-50/50 dark:bg-red-900/10')}>
                              <td className="px-4 py-3 text-center text-xl">{getTypeIcon(item.type)}</td>
                              <td className="px-4 py-3">
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {locale === 'ar' ? item.name_ar : item.name}
                                </p>
                                {item.vendor && <p className="text-xs text-gray-500">{item.vendor}</p>}
                              </td>
                              <td className="px-4 py-3 text-center font-mono text-sm">{item.reference_number}</td>
                              <td className="px-4 py-3 text-center">
                                <p className="text-sm">{item.expiry_date}</p>
                                <p className={clsx('text-xs',
                                  item.days_until_expiry > 30 ? 'text-green-600' :
                                  item.days_until_expiry > 0 ? 'text-yellow-600' : 'text-red-600')}>
                                  {item.days_until_expiry > 0 ? `${item.days_until_expiry} days` : `${Math.abs(item.days_until_expiry)} days ago`}
                                </p>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', getStatusBadge(item.status))}>
                                  {item.status.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-end font-medium">
                                {item.renewal_cost ? `${item.renewal_cost.toLocaleString()} SAR` : '-'}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex justify-center gap-1">
                                  <button onClick={() => { setSelectedItem(item); setIsItemModalOpen(true); }}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                                    <PencilIcon className="w-4 h-4 text-blue-600" />
                                  </button>
                                  <button onClick={() => { setSelectedItem(item); setConfirmDelete(true); }}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                                    <TrashIcon className="w-4 h-4 text-red-600" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {activeTab === 'rules' && (
                  <div className="space-y-4">
                    {rules.map((rule) => {
                      const typeInfo = itemTypes.find(t => t.value === rule.type);
                      return (
                        <div key={rule.id} className={clsx('border rounded-lg p-4',
                          rule.is_active ? 'border-gray-200 dark:border-gray-700' : 'border-gray-100 opacity-60')}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <span className="text-2xl">{getTypeIcon(rule.type)}</span>
                              <div>
                                <h3 className="font-medium text-gray-900 dark:text-white">
                                  {locale === 'ar' ? typeInfo?.label_ar : typeInfo?.label}
                                </h3>
                                <p className="text-sm text-gray-500">
                                  Alert {rule.days_before.join(', ')} days before expiry
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="flex gap-1">
                                {rule.channels.map(ch => (
                                  <span key={ch} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-xs rounded">{ch}</span>
                                ))}
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={rule.is_active}
                                  onChange={() => setRules(prev => prev.map(r => r.id === rule.id ? { ...r, is_active: !r.is_active } : r))}
                                  disabled={!canManage} className="sr-only peer" />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                              </label>
                              <button onClick={() => { setSelectedRule(rule); setIsRuleModalOpen(true); }}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                                <PencilIcon className="w-4 h-4 text-blue-600" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Item Modal */}
      <Modal isOpen={isItemModalOpen} onClose={() => setIsItemModalOpen(false)}
        title={selectedItem?.id ? 'Edit Item' : 'Add Renewal Item'} size="lg">
        {selectedItem && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Type</label>
                <select value={selectedItem.type}
                  onChange={(e) => setSelectedItem({ ...selectedItem, type: e.target.value as any })}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                  {itemTypes.map(t => (
                    <option key={t.value} value={t.value}>{locale === 'ar' ? t.label_ar : t.label}</option>
                  ))}
                </select>
              </div>
              <Input label="Reference Number" value={selectedItem.reference_number}
                onChange={(e) => setSelectedItem({ ...selectedItem, reference_number: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Name (EN)" value={selectedItem.name}
                onChange={(e) => setSelectedItem({ ...selectedItem, name: e.target.value })} />
              <Input label="Name (AR)" value={selectedItem.name_ar} dir="rtl"
                onChange={(e) => setSelectedItem({ ...selectedItem, name_ar: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Issue Date" type="date" value={selectedItem.issue_date}
                onChange={(e) => setSelectedItem({ ...selectedItem, issue_date: e.target.value })} />
              <Input label="Expiry Date" type="date" value={selectedItem.expiry_date}
                onChange={(e) => setSelectedItem({ ...selectedItem, expiry_date: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Vendor" value={selectedItem.vendor || ''}
                onChange={(e) => setSelectedItem({ ...selectedItem, vendor: e.target.value })} />
              <Input label="Renewal Cost (SAR)" type="number" value={selectedItem.renewal_cost || ''}
                onChange={(e) => setSelectedItem({ ...selectedItem, renewal_cost: parseFloat(e.target.value) || undefined })} />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="secondary" onClick={() => setIsItemModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveItem}>Save</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Rule Modal */}
      <Modal isOpen={isRuleModalOpen} onClose={() => setIsRuleModalOpen(false)} title="Edit Alert Rule" size="md">
        {selectedRule && (
          <div className="space-y-4">
            <Input label="Alert Days (comma separated)" value={selectedRule.days_before.join(', ')}
              onChange={(e) => setSelectedRule({ ...selectedRule, days_before: e.target.value.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n)) })}
              helperText="e.g., 90, 60, 30, 7" />
            <div>
              <label className="block text-sm font-medium mb-2">Channels</label>
              <div className="flex gap-3">
                {['email', 'sms', 'system'].map(ch => (
                  <label key={ch} className="flex items-center gap-2">
                    <input type="checkbox" checked={selectedRule.channels.includes(ch as any)}
                      onChange={(e) => {
                        const channels = e.target.checked
                          ? [...selectedRule.channels, ch as any]
                          : selectedRule.channels.filter(c => c !== ch);
                        setSelectedRule({ ...selectedRule, channels });
                      }} className="w-4 h-4 text-purple-600 rounded" />
                    <span className="capitalize">{ch}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="secondary" onClick={() => setIsRuleModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveRule}>Save</Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog isOpen={confirmDelete} onClose={() => setConfirmDelete(false)}
        onConfirm={handleDeleteItem} title="Delete Item"
        message="Are you sure you want to delete this renewal item?" confirmText="Delete" variant="danger" />
    </MainLayout>
  );
}
