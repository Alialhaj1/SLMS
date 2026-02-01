import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '../../config/menu.permissions';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  CubeIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from '../../hooks/useTranslation.enhanced';
import { useToast } from '../../contexts/ToastContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { companyStore } from '../../lib/companyStore';

interface InventoryItem {
  id: number;
  item_code: string;
  item_name: string;
  item_name_ar?: string;
  warehouse_id: number;
  warehouse_name: string;
  quantity: number;
  unit: string;
  average_cost?: number;
  last_cost?: number;
  selling_price?: number;
  min_stock: number;
  max_stock: number;
  last_movement: string;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
}

const WarehouseInventory: React.FC = () => {
  const { t } = useTranslation();
  const { showToast } = useToast();

  const tr = (key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
  };

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterWarehouse, setFilterWarehouse] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Mock data for demonstration
  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const companyId = companyStore.getActiveCompanyId();
      if (!companyId) {
        setInventory([]);
        showToast(tr('common.companyRequired', 'Company context required'), 'error');
        return;
      }
      
      // Try to fetch real data
      const response = await fetch(`${apiUrl}/api/inventory`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Company-Id': String(companyId),
        },
      });

      if (response.ok) {
        const payload = await response.json();
        const items = Array.isArray(payload) ? payload : (payload.data || []);
        setInventory(items as InventoryItem[]);
      } else {
        showToast(tr('common.failedToLoad', 'Failed to load'), 'error');
        setInventory([]);
      }
    } catch (error) {
      showToast(tr('common.failedToLoad', 'Failed to load'), 'error');
      setInventory([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter inventory
  const filteredInventory = inventory.filter((item) => {
    const matchesSearch =
      !searchTerm ||
      item.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.item_name_ar ? item.item_name_ar.toLowerCase().includes(searchTerm.toLowerCase()) : false);
    const matchesWarehouse = filterWarehouse === 'all' || item.warehouse_name === filterWarehouse;
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    return matchesSearch && matchesWarehouse && matchesStatus;
  });

  // Get unique warehouses for filter
  const warehouses = [...new Set(inventory.map((i) => i.warehouse_name))];

  // Summary stats
  const totalItems = filteredInventory.length;
  const lowStockCount = filteredInventory.filter((i) => i.status === 'low_stock').length;
  const outOfStockCount = filteredInventory.filter((i) => i.status === 'out_of_stock').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in_stock':
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
            In Stock
          </span>
        );
      case 'low_stock':
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400">
            Low Stock
          </span>
        );
      case 'out_of_stock':
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400">
            Out of Stock
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <MainLayout>
      <Head>
        <title>Inventory - SLMS</title>
      </Head>

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {tr('inventory.title', 'Warehouse Inventory')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {tr('inventory.subtitle', 'Track and manage stock levels across all warehouses')}
            </p>
          </div>
          <Button variant="secondary" className="flex items-center gap-2">
            <ArrowDownTrayIcon className="w-5 h-5" />
            {tr('common.export', 'Export')}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Total Items</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{totalItems}</p>
            </div>
            <CubeIcon className="w-10 h-10 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Low Stock</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-2">{lowStockCount}</p>
            </div>
            <ArrowTrendingDownIcon className="w-10 h-10 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Out of Stock</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-2">{outOfStockCount}</p>
            </div>
            <ExclamationTriangleIcon className="w-10 h-10 text-red-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder={tr('common.search', 'Search by code or name...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <select
            value={filterWarehouse}
            onChange={(e) => setFilterWarehouse(e.target.value)}
            className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{tr('common.allWarehouses', 'All Warehouses')}</option>
            {warehouses.map((w) => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{tr('common.allStatuses', 'All Statuses')}</option>
            <option value="in_stock">{tr('inventory.inStock', 'In Stock')}</option>
            <option value="low_stock">{tr('inventory.lowStock', 'Low Stock')}</option>
            <option value="out_of_stock">{tr('inventory.outOfStock', 'Out of Stock')}</option>
          </select>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-600 dark:text-gray-400 mt-3">{tr('common.loading', 'Loading...')}</p>
          </div>
        ) : filteredInventory.length === 0 ? (
          <div className="p-8 text-center">
            <CubeIcon className="w-16 h-16 text-gray-400 mx-auto mb-3 opacity-50" />
            <p className="text-gray-600 dark:text-gray-400 font-medium">{tr('common.noData', 'No inventory items found')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Item Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Warehouse</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Avg Cost</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Last Cost</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Sell Price</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Min/Max</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Last Movement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredInventory.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                    <td className="px-6 py-4 text-sm font-mono text-blue-600 dark:text-blue-400">{item.item_code}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white font-medium">{item.item_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{item.warehouse_name}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">
                      {item.quantity} <span className="text-gray-500 font-normal">{item.unit}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {Number(item.average_cost ?? 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {Number(item.last_cost ?? 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {Number(item.selling_price ?? 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{item.min_stock} / {item.max_stock}</td>
                    <td className="px-6 py-4 text-sm">{getStatusBadge(item.status)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{item.last_movement}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default withPermission(MenuPermissions.Warehouses.View, WarehouseInventory);
