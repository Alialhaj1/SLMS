import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useToast } from '../../contexts/ToastContext';
import { useTranslation } from '../../hooks/useTranslation';
import { usePermissions } from '../../hooks/usePermissions';
import { MenuPermissions } from '../../config/menu.permissions';
import { ArchiveBoxIcon, EyeIcon, ArrowDownTrayIcon, PencilIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import ItemSelector from '../../components/common/ItemSelector';
import WarehouseSelector from '../../components/common/WarehouseSelector';
import { companyStore } from '../../lib/companyStore';

type InventoryTxnType = 'in' | 'out' | 'adjustment';

interface InventoryLedgerEntry {
  id: number;
  itemId: number;
  itemCode: string;
  itemName: string;
  itemNameAr: string;
  warehouseId: number;
  warehouse: string;
  date: string;
  ref: string;
  type: InventoryTxnType;
  qtyIn: number;
  qtyOut: number;
  balanceQty: number;
  unitCost: number;
  currency: string;
  notes?: string;
}

type AdjustmentForm = {
  itemId: string;
  warehouseId: number | null;
  quantityDelta: string;
  notes: string;
};

export default function InventoryLedgerPage() {
  const { locale } = useTranslation();
  const { showToast } = useToast();
  const { hasAnyPermission } = usePermissions();

  const canView = hasAnyPermission([MenuPermissions.Accounting.InventoryLedger.View]);
  const canExport = hasAnyPermission([MenuPermissions.Accounting.InventoryLedger.Export]);
  const canAdjust = hasAnyPermission([MenuPermissions.Warehouses.Edit]);

  const [items, setItems] = useState<InventoryLedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [type, setType] = useState<'all' | InventoryTxnType>('all');
  const [selected, setSelected] = useState<InventoryLedgerEntry | null>(null);

  const [adjustOpen, setAdjustOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [adjustForm, setAdjustForm] = useState<AdjustmentForm>({ itemId: '', warehouseId: null, quantityDelta: '', notes: '' });

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const parseApiError = async (res: Response) => {
    try {
      const data = await res.json();
      const msg = data?.error?.message || data?.message || data?.error || null;
      return typeof msg === 'string' && msg ? msg : null;
    } catch {
      return null;
    }
  };

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const companyId = companyStore.getActiveCompanyId();
      if (!token || !companyId) {
        setItems([]);
        return;
      }

      const res = await fetch(`${apiUrl}/api/inventory/ledger`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Company-Id': String(companyId),
        },
      });

      if (!res.ok) {
        const msg = (await parseApiError(res)) || (locale === 'ar' ? 'فشل تحميل دفتر الأستاذ' : 'Failed to load ledger');
        showToast(msg, 'error');
        setItems([]);
        return;
      }

      const payload = await res.json();
      const rows = Array.isArray(payload) ? payload : (payload.data || []);

      const mapped: InventoryLedgerEntry[] = rows.map((r: any) => {
        const qtyIn = Number(r.qty_in ?? 0);
        const qtyOut = Number(r.qty_out ?? 0);
        return {
          id: Number(r.id),
          itemId: Number(r.item_id),
          itemCode: String(r.item_code ?? ''),
          itemName: String(r.item_name ?? ''),
          itemNameAr: String(r.item_name_ar ?? ''),
          warehouseId: Number(r.warehouse_id),
          warehouse: String(r.warehouse_name ?? ''),
          date: String(r.date ?? ''),
          ref: String(r.ref ?? ''),
          type: (r.type as InventoryTxnType) ?? (qtyIn > 0 ? 'in' : 'out'),
          qtyIn,
          qtyOut,
          balanceQty: Number(r.balance_qty ?? 0),
          unitCost: Number(r.unit_cost ?? 0),
          currency: String(r.currency ?? 'SAR'),
          notes: String(r.notes ?? ''),
        };
      });

      setItems(mapped);
    } catch (err) {
      console.error(err);
      showToast(locale === 'ar' ? 'فشل تحميل دفتر الأستاذ' : 'Failed to load ledger', 'error');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canView) fetchLedger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView]);

  const openCreate = () => {
    setEditingId(null);
    setAdjustForm({ itemId: '', warehouseId: null, quantityDelta: '', notes: '' });
    setAdjustOpen(true);
  };

  const openEdit = (entry: InventoryLedgerEntry) => {
    setEditingId(entry.id);
    const currentDelta = entry.qtyIn > 0 ? entry.qtyIn : -entry.qtyOut;
    setAdjustForm({
      itemId: String(entry.itemId),
      warehouseId: entry.warehouseId,
      quantityDelta: String(currentDelta),
      notes: entry.notes || '',
    });
    setAdjustOpen(true);
  };

  const submitAdjustment = async () => {
    if (!canAdjust) return;

    const token = localStorage.getItem('accessToken');
    const companyId = companyStore.getActiveCompanyId();
    if (!token || !companyId) {
      showToast(locale === 'ar' ? 'يجب تحديد الشركة' : 'Company context required', 'error');
      return;
    }

    const warehouseId = Number(adjustForm.warehouseId);
    const itemId = Number(adjustForm.itemId);
    const quantityDelta = Number(adjustForm.quantityDelta);

    if (!warehouseId || !itemId || Number.isNaN(quantityDelta) || quantityDelta === 0) {
      showToast(locale === 'ar' ? 'أدخل الصنف والمستودع والكمية' : 'Enter item, warehouse, and quantity', 'error');
      return;
    }

    setAdjustSubmitting(true);
    try {
      const url = editingId
        ? `${apiUrl}/api/inventory/adjustments/${editingId}`
        : `${apiUrl}/api/inventory/adjustments`;

      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-Company-Id': String(companyId),
        },
        body: JSON.stringify({
          warehouse_id: warehouseId,
          item_id: itemId,
          quantity_delta: quantityDelta,
          notes: adjustForm.notes?.trim() || null,
        }),
      });

      if (!res.ok) {
        const msg = (await parseApiError(res)) || (locale === 'ar' ? 'فشل الحفظ' : 'Failed to save');
        showToast(msg, 'error');
        return;
      }

      showToast(locale === 'ar' ? 'تم الحفظ' : 'Saved', 'success');
      setAdjustOpen(false);
      setSelected(null);
      await fetchLedger();
    } catch (err) {
      console.error(err);
      showToast(locale === 'ar' ? 'فشل الحفظ' : 'Failed to save', 'error');
    } finally {
      setAdjustSubmitting(false);
    }
  };

  const deleteAdjustment = async () => {
    if (!canAdjust || !selected) return;

    const token = localStorage.getItem('accessToken');
    const companyId = companyStore.getActiveCompanyId();
    if (!token || !companyId) {
      showToast(locale === 'ar' ? 'يجب تحديد الشركة' : 'Company context required', 'error');
      return;
    }

    setAdjustSubmitting(true);
    try {
      const res = await fetch(`${apiUrl}/api/inventory/adjustments/${selected.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Company-Id': String(companyId),
        },
      });

      if (!res.ok) {
        const msg = (await parseApiError(res)) || (locale === 'ar' ? 'فشل الحذف' : 'Failed to delete');
        showToast(msg, 'error');
        return;
      }

      showToast(locale === 'ar' ? 'تم الحذف' : 'Deleted', 'success');
      setConfirmDeleteOpen(false);
      setSelected(null);
      await fetchLedger();
    } catch (err) {
      console.error(err);
      showToast(locale === 'ar' ? 'فشل الحذف' : 'Failed to delete', 'error');
    } finally {
      setAdjustSubmitting(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((e) => {
      const typeOk = type === 'all' || e.type === type;
      const qOk =
        !q ||
        e.itemCode.toLowerCase().includes(q) ||
        e.itemName.toLowerCase().includes(q) ||
        e.itemNameAr.toLowerCase().includes(q) ||
        e.ref.toLowerCase().includes(q) ||
        e.warehouse.toLowerCase().includes(q);
      return typeOk && qOk;
    });
  }, [items, search, type]);

  const totals = useMemo(() => {
    const qtyIn = filtered.reduce((s, e) => s + e.qtyIn, 0);
    const qtyOut = filtered.reduce((s, e) => s + e.qtyOut, 0);
    return { qtyIn, qtyOut };
  }, [filtered]);

  const typeBadge = (t: InventoryTxnType) => {
    const styles: Record<InventoryTxnType, string> = {
      in: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      out: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      adjustment: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    };
    const labels: Record<InventoryTxnType, { en: string; ar: string }> = {
      in: { en: 'IN', ar: 'وارد' },
      out: { en: 'OUT', ar: 'صرف' },
      adjustment: { en: 'ADJ', ar: 'تسوية' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[t])}>
        {locale === 'ar' ? labels[t].ar : labels[t].en}
      </span>
    );
  };

  if (!canView) {
    return (
      <MainLayout>
        <Head>
          <title>{locale === 'ar' ? 'دفتر الأستاذ للمخزون - SLMS' : 'Inventory Ledger - SLMS'}</title>
        </Head>
        <div className="text-center py-12">
          <ArchiveBoxIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{locale === 'ar' ? 'غير مصرح' : 'Access Denied'}</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">{locale === 'ar' ? 'لا تملك صلاحية عرض دفتر الأستاذ للمخزون.' : "You don't have permission to view inventory ledger."}</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'دفتر الأستاذ للمخزون - SLMS' : 'Inventory Ledger - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <ArchiveBoxIcon className="h-6 w-6 text-purple-600 dark:text-purple-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{locale === 'ar' ? 'دفتر الأستاذ للمخزون' : 'Inventory Ledger'}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'حركة المخزون حسب الصنف والمستودع' : 'Stock movement by item and warehouse'}</p>
            </div>
          </div>
          {canExport && (
            <Button variant="secondary" onClick={() => showToast(locale === 'ar' ? 'تصدير (تجريبي)' : 'Export (demo)', 'info')}>
              <ArrowDownTrayIcon className="h-4 w-4" />
              {locale === 'ar' ? 'تصدير' : 'Export'}
            </Button>
          )}
          {canAdjust && (
            <Button onClick={openCreate}>
              <PlusIcon className="h-4 w-4" />
              {locale === 'ar' ? 'تسوية مخزون' : 'Stock Adjustment'}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'عدد القيود' : 'Entries'}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{loading ? '-' : filtered.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'إجمالي الوارد' : 'Total In'}</p>
            <p className="text-2xl font-bold text-green-600">{totals.qtyIn.toLocaleString()}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'إجمالي الصرف' : 'Total Out'}</p>
            <p className="text-2xl font-bold text-red-600">{totals.qtyOut.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-80">
                <Input label={locale === 'ar' ? 'بحث' : 'Search'} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={locale === 'ar' ? 'بحث بالصنف أو المرجع...' : 'Search by item or reference...'} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'النوع' : 'Type'}</label>
                <select className="input" value={type} onChange={(e) => setType(e.target.value as any)}>
                  <option value="all">{locale === 'ar' ? 'الكل' : 'All'}</option>
                  <option value="in">{locale === 'ar' ? 'وارد' : 'IN'}</option>
                  <option value="out">{locale === 'ar' ? 'صرف' : 'OUT'}</option>
                  <option value="adjustment">{locale === 'ar' ? 'تسوية' : 'Adjustment'}</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الصنف' : 'Item'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المستودع' : 'Warehouse'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'التاريخ' : 'Date'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المرجع' : 'Ref'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'النوع' : 'Type'}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'وارد' : 'In'}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'صرف' : 'Out'}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الرصيد' : 'Balance'}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'تكلفة' : 'Unit Cost'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={10}>
                      {locale === 'ar' ? 'جارٍ التحميل...' : 'Loading...'}
                    </td>
                  </tr>
                ) : filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{e.itemCode} — {locale === 'ar' ? e.itemNameAr : e.itemName}</td>
                    <td className="px-4 py-3 text-gray-500">{e.warehouse}</td>
                    <td className="px-4 py-3 text-gray-500">{e.date}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{e.ref}</td>
                    <td className="px-4 py-3">{typeBadge(e.type)}</td>
                    <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{e.qtyIn ? e.qtyIn.toLocaleString() : '-'}</td>
                    <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{e.qtyOut ? e.qtyOut.toLocaleString() : '-'}</td>
                    <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{e.balanceQty.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{e.unitCost.toLocaleString()} {e.currency}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="secondary" onClick={() => setSelected(e)}>
                          <EyeIcon className="h-4 w-4" />
                        </Button>
                        {canAdjust && (
                          <Button size="sm" variant="secondary" onClick={() => openEdit(e)}>
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={locale === 'ar' ? 'تفاصيل القيد' : 'Entry Details'} size="lg">
        {selected && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selected.ref}</h3>
              <p className="text-sm text-gray-500">{selected.date} — {selected.warehouse}</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-xs text-gray-500">{locale === 'ar' ? 'الصنف' : 'Item'}</p>
              <p className="font-medium text-gray-900 dark:text-white">{selected.itemCode} — {locale === 'ar' ? selected.itemNameAr : selected.itemName}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'النوع' : 'Type'}</p>
                <div className="mt-1">{typeBadge(selected.type)}</div>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'تكلفة الوحدة' : 'Unit Cost'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.unitCost.toLocaleString()} {selected.currency}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'الرصيد' : 'Balance Qty'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.balanceQty.toLocaleString()}</p>
              </div>
            </div>

            {canAdjust && (
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => openEdit(selected)}>
                  <PencilIcon className="h-4 w-4" />
                  {locale === 'ar' ? 'تعديل' : 'Edit'}
                </Button>
                <Button variant="danger" onClick={() => setConfirmDeleteOpen(true)}>
                  <TrashIcon className="h-4 w-4" />
                  {locale === 'ar' ? 'حذف' : 'Delete'}
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={adjustOpen}
        onClose={() => {
          if (!adjustSubmitting) setAdjustOpen(false);
        }}
        title={locale === 'ar' ? (editingId ? 'تعديل تسوية مخزون' : 'تسوية مخزون') : (editingId ? 'Edit Stock Adjustment' : 'Stock Adjustment')}
        size="lg"
      >
        <div className="space-y-4">
          <WarehouseSelector
            value={adjustForm.warehouseId}
            onChange={(id) => setAdjustForm((s) => ({ ...s, warehouseId: id }))}
            required
            label={locale === 'ar' ? 'المستودع' : 'Warehouse'}
          />
          <ItemSelector
            value={adjustForm.itemId}
            onChange={(id) => setAdjustForm((s) => ({ ...s, itemId: id }))}
            required
            label={locale === 'ar' ? 'الصنف' : 'Item'}
          />
          <Input
            label={locale === 'ar' ? 'الكمية (موجب = زيادة، سالب = نقص)' : 'Quantity (positive=increase, negative=decrease)'}
            type="number"
            value={adjustForm.quantityDelta}
            onChange={(e) => setAdjustForm((s) => ({ ...s, quantityDelta: e.target.value }))}
          />
          <Input
            label={locale === 'ar' ? 'ملاحظات' : 'Notes'}
            value={adjustForm.notes}
            onChange={(e) => setAdjustForm((s) => ({ ...s, notes: e.target.value }))}
          />

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAdjustOpen(false)} disabled={adjustSubmitting}>
              {locale === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={submitAdjustment} loading={adjustSubmitting}>
              {locale === 'ar' ? 'حفظ' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        onClose={() => {
          if (!adjustSubmitting) setConfirmDeleteOpen(false);
        }}
        onConfirm={deleteAdjustment}
        title={locale === 'ar' ? 'حذف التسوية' : 'Delete Adjustment'}
        message={locale === 'ar' ? 'سيتم عكس تأثيرها على المخزون. هل أنت متأكد؟' : 'This will reverse its effect on stock. Are you sure?'}
        confirmText={locale === 'ar' ? 'حذف' : 'Delete'}
        variant="danger"
        loading={adjustSubmitting}
      />
    </MainLayout>
  );
}
