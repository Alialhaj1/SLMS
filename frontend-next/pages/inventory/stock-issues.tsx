import { useEffect, useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '../../config/menu.permissions';
import { useTranslation } from '../../hooks/useTranslation.enhanced';
import { useToast } from '../../contexts/ToastContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import WarehouseSelector from '../../components/common/WarehouseSelector';
import ItemSelector from '../../components/common/ItemSelector';
import { companyStore } from '../../lib/companyStore';

type IssueRow = {
  id: number;
  date: string;
  ref: string;
  warehouse_name: string;
  item_code: string;
  item_name: string;
  item_name_ar?: string;
  qty_delta: number;
  unit_cost?: number;
  remember?: string;
  notes?: string;
};

function StockIssuesPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();

  const tr = (key: string, fallback: string) => {
    const v = t(key);
    return v === key ? fallback : v;
  };

  const [rows, setRows] = useState<IssueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [warehouseId, setWarehouseId] = useState<number | null>(null);
  const [itemId, setItemId] = useState<string>('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const companyId = companyStore.getActiveCompanyId();

      if (!companyId) {
        setRows([]);
        showToast(tr('common.companyRequired', 'Company context required'), 'error');
        return;
      }

      const resp = await fetch(`${apiUrl}/api/inventory/issues`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Company-Id': String(companyId),
        },
      });

      if (!resp.ok) throw new Error('Failed to load');
      const payload = await resp.json();
      setRows(payload.data || []);
    } catch {
      setRows([]);
      showToast(tr('common.failedToLoad', 'Failed to load'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!warehouseId) next.warehouseId = tr('common.required', 'Required');
    if (!itemId) next.itemId = tr('common.required', 'Required');

    const qty = Number(quantity);
    if (!quantity || !Number.isFinite(qty) || qty <= 0) next.quantity = tr('common.invalidValue', 'Invalid value');

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const companyId = companyStore.getActiveCompanyId();

      if (!companyId) {
        showToast(tr('common.companyRequired', 'Company context required'), 'error');
        return;
      }

      const resp = await fetch(`${apiUrl}/api/inventory/issues`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Company-Id': String(companyId),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          warehouse_id: warehouseId,
          item_id: Number(itemId),
          quantity: Number(quantity),
          notes: notes || undefined,
        }),
      });

      const payload = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(payload?.error?.message || 'Failed');

      setQuantity('');
      setNotes('');
      showToast(tr('common.saved', 'Saved successfully'), 'success');
      fetchIssues();
    } catch (e: any) {
      showToast(e?.message || tr('common.failedToSave', 'Failed to save'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <Head>
        <title>{tr('menu.advancedWarehouses.stockIssues', 'Stock Issues')} - SLMS</title>
      </Head>

      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {tr('menu.advancedWarehouses.stockIssues', 'Stock Issues')}
          </h1>
          <Button onClick={fetchIssues} variant="secondary">
            {tr('common.refresh', 'Refresh')}
          </Button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {tr('common.create', 'Create')}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <WarehouseSelector
              value={warehouseId}
              onChange={setWarehouseId}
              label={tr('warehouses.warehouse', 'Warehouse')}
              required
              error={errors.warehouseId}
            />

            <ItemSelector
              value={itemId}
              onChange={(id) => setItemId(id)}
              label={tr('items.item', 'Item')}
              required
              error={errors.itemId}
            />

            <Input
              label={tr('inventory.quantity', 'Quantity')}
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              error={errors.quantity}
              type="number"
              step="0.0001"
              min="0"
            />

            <Input
              label={tr('common.notes', 'Notes')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              multiline
              rows={3}
            />
          </div>

          <div className="mt-4 flex justify-end">
            <Button onClick={handleSubmit} loading={submitting}>
              {tr('common.save', 'Save')}
            </Button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {tr('common.recent', 'Recent')}
            </h2>
          </div>

          {loading ? (
            <div className="p-6 text-gray-500 dark:text-gray-400">{tr('common.loading', 'Loading...')}</div>
          ) : rows.length === 0 ? (
            <div className="p-6 text-gray-500 dark:text-gray-400">{tr('common.noResults', 'No results')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">{tr('common.date', 'Date')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">{tr('common.reference', 'Reference')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">{tr('warehouses.warehouse', 'Warehouse')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">{tr('items.item', 'Item')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">{tr('inventory.quantity', 'Quantity')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {rows.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{r.date}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{r.ref}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{r.warehouse_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        <div className="font-medium">{r.item_code}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{r.item_name}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white text-right">{Math.abs(Number(r.qty_delta)).toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

export default withPermission(MenuPermissions.Warehouses.InventoryOperations.Issues.View, StockIssuesPage);
