/**
 * 🏢 Fixed Assets Management - إدارة الأصول الثابتة
 * ===================================================
 * إدارة الأصول الثابتة والإهلاك
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import {
  BuildingOffice2Icon,
  ComputerDesktopIcon,
  TruckIcon,
  WrenchScrewdriverIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentArrowDownIcon,
  CurrencyDollarIcon,
  CalendarDaysIcon,
  MapPinIcon,
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

interface FixedAsset {
  id: number;
  asset_code: string;
  name: string;
  name_ar: string;
  category: 'property' | 'vehicle' | 'equipment' | 'furniture' | 'it_equipment';
  location: string;
  location_ar: string;
  purchase_date: string;
  purchase_cost: number;
  useful_life_years: number;
  salvage_value: number;
  depreciation_method: 'straight_line' | 'declining_balance';
  accumulated_depreciation: number;
  book_value: number;
  status: 'active' | 'disposed' | 'under_maintenance';
  warranty_expiry?: string;
  assigned_to?: string;
}

export default function FixedAssetsPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<FixedAsset | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const canManage = hasPermission('assets:manage');

  const categories = [
    { value: 'property', label: 'Property', label_ar: 'عقارات', icon: BuildingOffice2Icon },
    { value: 'vehicle', label: 'Vehicles', label_ar: 'مركبات', icon: TruckIcon },
    { value: 'equipment', label: 'Equipment', label_ar: 'معدات', icon: WrenchScrewdriverIcon },
    { value: 'furniture', label: 'Furniture', label_ar: 'أثاث', icon: BuildingOffice2Icon },
    { value: 'it_equipment', label: 'IT Equipment', label_ar: 'أجهزة تقنية', icon: ComputerDesktopIcon },
  ];

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      setAssets([
        {
          id: 1, asset_code: 'FA-001', name: 'Office Building', name_ar: 'مبنى المكتب',
          category: 'property', location: 'Riyadh Main Office', location_ar: 'المكتب الرئيسي - الرياض',
          purchase_date: '2018-03-15', purchase_cost: 5000000, useful_life_years: 40,
          salvage_value: 500000, depreciation_method: 'straight_line',
          accumulated_depreciation: 675000, book_value: 4325000, status: 'active'
        },
        {
          id: 2, asset_code: 'FA-002', name: 'Delivery Truck - Isuzu', name_ar: 'شاحنة توصيل - ايسوزو',
          category: 'vehicle', location: 'Warehouse', location_ar: 'المستودع',
          purchase_date: '2022-01-10', purchase_cost: 180000, useful_life_years: 8,
          salvage_value: 20000, depreciation_method: 'straight_line',
          accumulated_depreciation: 40000, book_value: 140000, status: 'active',
          warranty_expiry: '2025-01-10', assigned_to: 'Logistics Dept'
        },
        {
          id: 3, asset_code: 'FA-003', name: 'Forklift - Toyota', name_ar: 'رافعة شوكية - تويوتا',
          category: 'equipment', location: 'Warehouse', location_ar: 'المستودع',
          purchase_date: '2021-06-20', purchase_cost: 85000, useful_life_years: 10,
          salvage_value: 8500, depreciation_method: 'straight_line',
          accumulated_depreciation: 19125, book_value: 65875, status: 'under_maintenance'
        },
        {
          id: 4, asset_code: 'FA-004', name: 'Server Rack + Servers', name_ar: 'خوادم ورف خوادم',
          category: 'it_equipment', location: 'IT Room', location_ar: 'غرفة تقنية المعلومات',
          purchase_date: '2023-01-15', purchase_cost: 120000, useful_life_years: 5,
          salvage_value: 10000, depreciation_method: 'declining_balance',
          accumulated_depreciation: 22000, book_value: 98000, status: 'active',
          warranty_expiry: '2026-01-15'
        },
        {
          id: 5, asset_code: 'FA-005', name: 'Office Furniture Set', name_ar: 'طقم أثاث مكتبي',
          category: 'furniture', location: 'Executive Floor', location_ar: 'الطابق التنفيذي',
          purchase_date: '2020-08-01', purchase_cost: 45000, useful_life_years: 10,
          salvage_value: 4500, depreciation_method: 'straight_line',
          accumulated_depreciation: 13500, book_value: 31500, status: 'active'
        },
      ]);
    } catch (error) {
      showToast(t('common.fetchError') || 'Failed to fetch', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAsset = async () => {
    if (!selectedAsset) return;
    try {
      // Calculate book value
      const bookValue = selectedAsset.purchase_cost - selectedAsset.accumulated_depreciation;
      const assetToSave = { ...selectedAsset, book_value: bookValue };
      
      if (selectedAsset.id === 0) {
        setAssets(prev => [...prev, { ...assetToSave, id: Date.now(), asset_code: `FA-${Date.now().toString().slice(-3)}` }]);
      } else {
        setAssets(prev => prev.map(a => a.id === selectedAsset.id ? assetToSave : a));
      }
      showToast(t('common.saveSuccess') || 'Saved', 'success');
      setIsModalOpen(false);
    } catch (error) {
      showToast(t('common.error') || 'Error', 'error');
    }
  };

  const handleDeleteAsset = async () => {
    if (!selectedAsset) return;
    try {
      setAssets(prev => prev.filter(a => a.id !== selectedAsset.id));
      showToast(t('common.deleteSuccess') || 'Deleted', 'success');
    } finally {
      setConfirmDelete(false);
      setSelectedAsset(null);
    }
  };

  const getCategoryIcon = (category: string) => {
    const cat = categories.find(c => c.value === category);
    return cat?.icon || BuildingOffice2Icon;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'disposed': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
      case 'under_maintenance': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredAssets = assets.filter(asset => {
    if (filterCategory !== 'all' && asset.category !== filterCategory) return false;
    if (filterStatus !== 'all' && asset.status !== filterStatus) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return asset.asset_code.toLowerCase().includes(query) ||
             asset.name.toLowerCase().includes(query) ||
             asset.name_ar.includes(query);
    }
    return true;
  });

  const stats = {
    totalCost: assets.reduce((sum, a) => sum + a.purchase_cost, 0),
    totalBookValue: assets.reduce((sum, a) => sum + a.book_value, 0),
    totalDepreciation: assets.reduce((sum, a) => sum + a.accumulated_depreciation, 0),
    activeCount: assets.filter(a => a.status === 'active').length,
  };

  return (
    <MainLayout>
      <Head>
        <title>{t('assets.fixedAssets') || 'Fixed Assets'} | SLMS</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
              <BuildingOffice2Icon className="w-8 h-8 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                {t('assets.fixedAssets') || 'Fixed Assets'}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t('assets.fixedAssetsSubtitle') || 'Manage fixed assets and depreciation'}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="secondary">
              <DocumentArrowDownIcon className="w-5 h-5 me-2" />
              Export
            </Button>
            <Button onClick={() => {
              setSelectedAsset({
                id: 0, asset_code: '', name: '', name_ar: '', category: 'equipment',
                location: '', location_ar: '', purchase_date: new Date().toISOString().split('T')[0],
                purchase_cost: 0, useful_life_years: 5, salvage_value: 0,
                depreciation_method: 'straight_line', accumulated_depreciation: 0, book_value: 0, status: 'active'
              });
              setIsModalOpen(true);
            }} disabled={!canManage}>
              <PlusIcon className="w-5 h-5 me-2" />
              Add Asset
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-blue-600">
              <CurrencyDollarIcon className="w-5 h-5" />
              <span className="text-2xl font-bold">{(stats.totalCost / 1000000).toFixed(1)}M</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Total Cost (SAR)</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-green-600">
              <CurrencyDollarIcon className="w-5 h-5" />
              <span className="text-2xl font-bold">{(stats.totalBookValue / 1000000).toFixed(1)}M</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Book Value (SAR)</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-red-600">
              <CurrencyDollarIcon className="w-5 h-5" />
              <span className="text-2xl font-bold">{(stats.totalDepreciation / 1000).toFixed(0)}K</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Accumulated Depreciation</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-teal-600">
              <BuildingOffice2Icon className="w-5 h-5" />
              <span className="text-2xl font-bold">{stats.activeCount}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Active Assets</p>
          </div>
        </div>

        {/* Category Overview */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {categories.map((cat) => {
            const count = assets.filter(a => a.category === cat.value).length;
            const value = assets.filter(a => a.category === cat.value).reduce((sum, a) => sum + a.book_value, 0);
            const Icon = cat.icon;
            return (
              <button key={cat.value}
                onClick={() => setFilterCategory(filterCategory === cat.value ? 'all' : cat.value)}
                className={clsx('p-3 rounded-lg border-2 transition-all text-center',
                  filterCategory === cat.value
                    ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300')}>
                <Icon className="w-6 h-6 mx-auto text-gray-600 dark:text-gray-400" />
                <p className="font-medium text-sm mt-1">{locale === 'ar' ? cat.label_ar : cat.label}</p>
                <p className="text-xs text-gray-500">{count} items • {(value / 1000).toFixed(0)}K</p>
              </button>
            );
          })}
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Search assets..." value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg" />
              </div>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="under_maintenance">Under Maintenance</option>
                <option value="disposed">Disposed</option>
              </select>
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
                    <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">Asset</th>
                    <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">Location</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Purchase Date</th>
                    <th className="px-4 py-3 text-end text-xs font-medium text-gray-500 uppercase">Cost</th>
                    <th className="px-4 py-3 text-end text-xs font-medium text-gray-500 uppercase">Book Value</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredAssets.map((asset) => {
                    const Icon = getCategoryIcon(asset.category);
                    const depreciationRate = (asset.accumulated_depreciation / asset.purchase_cost) * 100;
                    return (
                      <tr key={asset.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-teal-100 dark:bg-teal-900/30 rounded-lg flex items-center justify-center">
                              <Icon className="w-5 h-5 text-teal-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {locale === 'ar' ? asset.name_ar : asset.name}
                              </p>
                              <p className="text-xs text-gray-500">{asset.asset_code}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1 text-sm">
                            <MapPinIcon className="w-4 h-4 text-gray-400" />
                            {locale === 'ar' ? asset.location_ar : asset.location}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm">{asset.purchase_date}</td>
                        <td className="px-4 py-3 text-end">{asset.purchase_cost.toLocaleString()}</td>
                        <td className="px-4 py-3 text-end">
                          <p className="font-medium">{asset.book_value.toLocaleString()}</p>
                          <div className="w-full h-1 bg-gray-200 rounded mt-1">
                            <div className="h-1 bg-red-500 rounded" style={{ width: `${depreciationRate}%` }}></div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', getStatusBadge(asset.status))}>
                            {asset.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex justify-center gap-1">
                            <button onClick={() => { setSelectedAsset(asset); setIsModalOpen(true); }}
                              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                              <PencilIcon className="w-4 h-4 text-blue-600" />
                            </button>
                            <button onClick={() => { setSelectedAsset(asset); setConfirmDelete(true); }}
                              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                              <TrashIcon className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Asset Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
        title={selectedAsset?.id ? 'Edit Asset' : 'Add Fixed Asset'} size="lg">
        {selectedAsset && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Asset Name (EN)" value={selectedAsset.name}
                onChange={(e) => setSelectedAsset({ ...selectedAsset, name: e.target.value })} />
              <Input label="Asset Name (AR)" value={selectedAsset.name_ar} dir="rtl"
                onChange={(e) => setSelectedAsset({ ...selectedAsset, name_ar: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <select value={selectedAsset.category}
                  onChange={(e) => setSelectedAsset({ ...selectedAsset, category: e.target.value as any })}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                  {categories.map(c => (
                    <option key={c.value} value={c.value}>{locale === 'ar' ? c.label_ar : c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <select value={selectedAsset.status}
                  onChange={(e) => setSelectedAsset({ ...selectedAsset, status: e.target.value as any })}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <option value="active">Active</option>
                  <option value="under_maintenance">Under Maintenance</option>
                  <option value="disposed">Disposed</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Location (EN)" value={selectedAsset.location}
                onChange={(e) => setSelectedAsset({ ...selectedAsset, location: e.target.value })} />
              <Input label="Location (AR)" value={selectedAsset.location_ar} dir="rtl"
                onChange={(e) => setSelectedAsset({ ...selectedAsset, location_ar: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input label="Purchase Date" type="date" value={selectedAsset.purchase_date}
                onChange={(e) => setSelectedAsset({ ...selectedAsset, purchase_date: e.target.value })} />
              <Input label="Purchase Cost (SAR)" type="number" value={selectedAsset.purchase_cost}
                onChange={(e) => setSelectedAsset({ ...selectedAsset, purchase_cost: parseFloat(e.target.value) || 0 })} />
              <Input label="Salvage Value (SAR)" type="number" value={selectedAsset.salvage_value}
                onChange={(e) => setSelectedAsset({ ...selectedAsset, salvage_value: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Useful Life (Years)" type="number" min="1" value={selectedAsset.useful_life_years}
                onChange={(e) => setSelectedAsset({ ...selectedAsset, useful_life_years: parseInt(e.target.value) || 1 })} />
              <div>
                <label className="block text-sm font-medium mb-2">Depreciation Method</label>
                <select value={selectedAsset.depreciation_method}
                  onChange={(e) => setSelectedAsset({ ...selectedAsset, depreciation_method: e.target.value as any })}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <option value="straight_line">Straight Line</option>
                  <option value="declining_balance">Declining Balance</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Warranty Expiry" type="date" value={selectedAsset.warranty_expiry || ''}
                onChange={(e) => setSelectedAsset({ ...selectedAsset, warranty_expiry: e.target.value })} />
              <Input label="Assigned To" value={selectedAsset.assigned_to || ''}
                onChange={(e) => setSelectedAsset({ ...selectedAsset, assigned_to: e.target.value })} />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveAsset}>Save</Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog isOpen={confirmDelete} onClose={() => setConfirmDelete(false)}
        onConfirm={handleDeleteAsset} title="Delete Asset"
        message="Are you sure you want to delete this asset record?" confirmText="Delete" variant="danger" />
    </MainLayout>
  );
}
