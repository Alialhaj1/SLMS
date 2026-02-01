/**
 * 📉 Depreciation Schedules - جداول الإهلاك
 * ==========================================
 * إدارة جداول إهلاك الأصول الثابتة
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import {
  ChartBarIcon,
  ArrowPathIcon,
  DocumentArrowDownIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  BuildingOffice2Icon,
  TruckIcon,
  ComputerDesktopIcon,
  CalculatorIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../contexts/ToastContext';
import { useTranslation } from '../../hooks/useTranslation';
import { usePermissions } from '../../hooks/usePermissions';
import clsx from 'clsx';

interface DepreciationSchedule {
  id: number;
  asset_code: string;
  asset_name: string;
  asset_name_ar: string;
  category: string;
  category_ar: string;
  purchase_date: string;
  purchase_cost: number;
  salvage_value: number;
  useful_life_years: number;
  depreciation_method: 'straight_line' | 'declining_balance';
  annual_depreciation: number;
  accumulated_depreciation: number;
  book_value: number;
  years_depreciated: number;
  status: 'active' | 'fully_depreciated' | 'disposed';
}

interface DepreciationEntry {
  year: number;
  period_start: string;
  period_end: string;
  opening_book_value: number;
  depreciation_expense: number;
  accumulated_depreciation: number;
  closing_book_value: number;
}

export default function DepreciationSchedulesPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<DepreciationSchedule[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<DepreciationSchedule | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const canManage = hasPermission('depreciation:manage');
  const canRun = hasPermission('depreciation:run');

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      setSchedules([
        {
          id: 1, asset_code: 'FA-001', asset_name: 'Office Building', asset_name_ar: 'مبنى المكتب',
          category: 'Buildings', category_ar: 'مباني', purchase_date: '2020-01-15',
          purchase_cost: 5000000, salvage_value: 500000, useful_life_years: 40,
          depreciation_method: 'straight_line', annual_depreciation: 112500,
          accumulated_depreciation: 450000, book_value: 4550000, years_depreciated: 4, status: 'active'
        },
        {
          id: 2, asset_code: 'FA-002', asset_name: 'Delivery Truck', asset_name_ar: 'شاحنة توصيل',
          category: 'Vehicles', category_ar: 'مركبات', purchase_date: '2022-06-01',
          purchase_cost: 180000, salvage_value: 20000, useful_life_years: 8,
          depreciation_method: 'straight_line', annual_depreciation: 20000,
          accumulated_depreciation: 35000, book_value: 145000, years_depreciated: 2, status: 'active'
        },
        {
          id: 3, asset_code: 'FA-003', asset_name: 'Server Equipment', asset_name_ar: 'معدات الخوادم',
          category: 'IT Equipment', category_ar: 'معدات تقنية', purchase_date: '2021-03-15',
          purchase_cost: 250000, salvage_value: 25000, useful_life_years: 5,
          depreciation_method: 'straight_line', annual_depreciation: 45000,
          accumulated_depreciation: 135000, book_value: 115000, years_depreciated: 3, status: 'active'
        },
        {
          id: 4, asset_code: 'FA-005', asset_name: 'Office Furniture', asset_name_ar: 'أثاث مكتبي',
          category: 'Furniture', category_ar: 'أثاث', purchase_date: '2018-01-10',
          purchase_cost: 80000, salvage_value: 8000, useful_life_years: 10,
          depreciation_method: 'straight_line', annual_depreciation: 7200,
          accumulated_depreciation: 43200, book_value: 36800, years_depreciated: 6, status: 'active'
        },
        {
          id: 5, asset_code: 'FA-006', asset_name: 'Laptop Fleet', asset_name_ar: 'أسطول لابتوب',
          category: 'IT Equipment', category_ar: 'معدات تقنية', purchase_date: '2019-06-01',
          purchase_cost: 120000, salvage_value: 12000, useful_life_years: 4,
          depreciation_method: 'straight_line', annual_depreciation: 27000,
          accumulated_depreciation: 108000, book_value: 12000, years_depreciated: 4, status: 'fully_depreciated'
        },
      ]);
    } catch (error) {
      showToast(t('common.fetchError') || 'Failed to fetch', 'error');
    } finally {
      setLoading(false);
    }
  };

  const generateDetailSchedule = (schedule: DepreciationSchedule): DepreciationEntry[] => {
    const entries: DepreciationEntry[] = [];
    let openingValue = schedule.purchase_cost;
    let accumulatedDep = 0;
    const startYear = new Date(schedule.purchase_date).getFullYear();
    
    for (let i = 0; i < schedule.useful_life_years; i++) {
      const depreciation = schedule.depreciation_method === 'straight_line' 
        ? schedule.annual_depreciation
        : (openingValue - schedule.salvage_value) * (2 / schedule.useful_life_years);
      
      const actualDep = Math.min(depreciation, openingValue - schedule.salvage_value);
      accumulatedDep += actualDep;
      
      entries.push({
        year: startYear + i,
        period_start: `${startYear + i}-01-01`,
        period_end: `${startYear + i}-12-31`,
        opening_book_value: openingValue,
        depreciation_expense: actualDep,
        accumulated_depreciation: accumulatedDep,
        closing_book_value: openingValue - actualDep
      });
      
      openingValue = openingValue - actualDep;
    }
    
    return entries;
  };

  const handleRunDepreciation = async () => {
    showToast(`Running depreciation for ${selectedYear}...`, 'info');
    setTimeout(() => {
      showToast('Depreciation run completed successfully', 'success');
    }, 2000);
  };

  const getCategoryIcon = (category: string) => {
    if (category.includes('Building')) return <BuildingOffice2Icon className="w-5 h-5" />;
    if (category.includes('Vehicle')) return <TruckIcon className="w-5 h-5" />;
    if (category.includes('IT') || category.includes('Computer')) return <ComputerDesktopIcon className="w-5 h-5" />;
    return <ChartBarIcon className="w-5 h-5" />;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'fully_depreciated': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
      case 'disposed': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredSchedules = schedules.filter(sch => {
    if (filterCategory !== 'all' && !sch.category.toLowerCase().includes(filterCategory)) return false;
    if (filterStatus !== 'all' && sch.status !== filterStatus) return false;
    return true;
  });

  const totalOriginalCost = schedules.reduce((sum, s) => sum + s.purchase_cost, 0);
  const totalBookValue = schedules.reduce((sum, s) => sum + s.book_value, 0);
  const totalAccumulatedDep = schedules.reduce((sum, s) => sum + s.accumulated_depreciation, 0);
  const annualDepExpense = schedules.filter(s => s.status === 'active').reduce((sum, s) => sum + s.annual_depreciation, 0);

  return (
    <MainLayout>
      <Head>
        <title>{t('assets.depreciation') || 'Depreciation Schedules'} | SLMS</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <ChartBarIcon className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                {t('assets.depreciation') || 'Depreciation Schedules'}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {locale === 'ar' ? 'إدارة جداول إهلاك الأصول' : 'Manage asset depreciation schedules'}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
              {[2024, 2023, 2022, 2021, 2020].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <Button variant="secondary">
              <DocumentArrowDownIcon className="w-5 h-5 me-2" />
              Export
            </Button>
            <Button onClick={handleRunDepreciation} disabled={!canRun}>
              <PlayIcon className="w-5 h-5 me-2" />
              Run Depreciation
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-blue-600">
              <CurrencyDollarIcon className="w-5 h-5" />
              <span className="text-xl font-bold">{(totalOriginalCost / 1000000).toFixed(2)}M</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Original Cost (SAR)</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-green-600">
              <CurrencyDollarIcon className="w-5 h-5" />
              <span className="text-xl font-bold">{(totalBookValue / 1000000).toFixed(2)}M</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Book Value (SAR)</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-red-600">
              <ChartBarIcon className="w-5 h-5" />
              <span className="text-xl font-bold">{(totalAccumulatedDep / 1000000).toFixed(2)}M</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Accumulated Dep. (SAR)</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-purple-600">
              <CalculatorIcon className="w-5 h-5" />
              <span className="text-xl font-bold">{(annualDepExpense / 1000).toFixed(0)}K</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Annual Expense (SAR)</p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap gap-4">
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                <option value="all">All Categories</option>
                <option value="building">Buildings</option>
                <option value="vehicle">Vehicles</option>
                <option value="it">IT Equipment</option>
                <option value="furniture">Furniture</option>
              </select>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="fully_depreciated">Fully Depreciated</option>
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
                    <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-4 py-3 text-end text-xs font-medium text-gray-500 uppercase">Original Cost</th>
                    <th className="px-4 py-3 text-end text-xs font-medium text-gray-500 uppercase">Annual Dep.</th>
                    <th className="px-4 py-3 text-end text-xs font-medium text-gray-500 uppercase">Accumulated</th>
                    <th className="px-4 py-3 text-end text-xs font-medium text-gray-500 uppercase">Book Value</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Progress</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredSchedules.map((sch) => {
                    const depProgress = ((sch.purchase_cost - sch.salvage_value - sch.book_value + sch.salvage_value) / (sch.purchase_cost - sch.salvage_value)) * 100;
                    return (
                      <tr key={sch.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {locale === 'ar' ? sch.asset_name_ar : sch.asset_name}
                            </p>
                            <p className="text-xs text-gray-500 font-mono">{sch.asset_code}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                            {getCategoryIcon(sch.category)}
                            <span className="text-sm">{locale === 'ar' ? sch.category_ar : sch.category}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 text-end">{sch.purchase_cost.toLocaleString()}</td>
                        <td className="px-4 py-3 text-end">{sch.annual_depreciation.toLocaleString()}</td>
                        <td className="px-4 py-3 text-end text-red-600">{sch.accumulated_depreciation.toLocaleString()}</td>
                        <td className="px-4 py-3 text-end font-medium">{sch.book_value.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                              <div className="h-full bg-purple-500 rounded-full" 
                                style={{ width: `${Math.min(depProgress, 100)}%` }} />
                            </div>
                            <span className="text-xs text-gray-500 w-12">{sch.years_depreciated}/{sch.useful_life_years}yr</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', getStatusBadge(sch.status))}>
                            {sch.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => { setSelectedSchedule(sch); setIsDetailModalOpen(true); }}
                            className="px-3 py-1 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100">
                            View Schedule
                          </button>
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

      {/* Detail Modal */}
      <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)}
        title={`Depreciation Schedule - ${selectedSchedule?.asset_code || ''}`} size="xl">
        {selectedSchedule && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div>
                <p className="text-xs text-gray-500">Asset</p>
                <p className="font-medium">{locale === 'ar' ? selectedSchedule.asset_name_ar : selectedSchedule.asset_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Method</p>
                <p className="font-medium capitalize">{selectedSchedule.depreciation_method.replace('_', ' ')}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Useful Life</p>
                <p className="font-medium">{selectedSchedule.useful_life_years} Years</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Salvage Value</p>
                <p className="font-medium">{selectedSchedule.salvage_value.toLocaleString()} SAR</p>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 dark:bg-gray-600">
                  <tr>
                    <th className="px-3 py-2 text-start">Year</th>
                    <th className="px-3 py-2 text-end">Opening Value</th>
                    <th className="px-3 py-2 text-end">Depreciation</th>
                    <th className="px-3 py-2 text-end">Accumulated</th>
                    <th className="px-3 py-2 text-end">Closing Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {generateDetailSchedule(selectedSchedule).map((entry, idx) => (
                    <tr key={idx} className={clsx(
                      'hover:bg-gray-50 dark:hover:bg-gray-700/50',
                      entry.year === new Date().getFullYear() && 'bg-blue-50 dark:bg-blue-900/20'
                    )}>
                      <td className="px-3 py-2 font-medium">{entry.year}</td>
                      <td className="px-3 py-2 text-end">{entry.opening_book_value.toLocaleString()}</td>
                      <td className="px-3 py-2 text-end text-red-600">{entry.depreciation_expense.toLocaleString()}</td>
                      <td className="px-3 py-2 text-end">{entry.accumulated_depreciation.toLocaleString()}</td>
                      <td className="px-3 py-2 text-end font-medium">{entry.closing_book_value.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="flex justify-end pt-4 border-t">
              <Button variant="secondary" onClick={() => setIsDetailModalOpen(false)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </MainLayout>
  );
}
