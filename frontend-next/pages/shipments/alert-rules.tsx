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
import { useMasterData } from '../../hooks/useMasterData';
import {
  BellAlertIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

type AlertSeverity = 'low' | 'medium' | 'high';
type AlertTrigger = 'shipment_delay' | 'customs_delay' | 'cost_overrun' | 'receiving_discrepancy' | 'document_expiry';

type ShipmentAlertRule = {
  id: number;
  name: string;
  trigger: AlertTrigger;
  severity: AlertSeverity;
  isActive: boolean;
  thresholdValue: number;
  thresholdUnit: 'days' | 'percent';
};

type ShipmentAlertRuleApi = {
  id: number;
  name: string;
  rule_type: string;
  severity: AlertSeverity;
  is_active: boolean;
  threshold_value: number | null;
  threshold_unit: 'days' | 'percent' | null;
};

const triggerLabel = (locale: string, trigger: AlertTrigger) => {
  const map: Record<AlertTrigger, { en: string; ar: string }> = {
    shipment_delay: { en: 'Shipment delay', ar: 'تأخير الشحنة' },
    customs_delay: { en: 'Customs delay', ar: 'تأخير التخليص' },
    cost_overrun: { en: 'Cost overrun', ar: 'تجاوز التكلفة' },
    receiving_discrepancy: { en: 'Receiving discrepancy', ar: 'فروقات الاستلام' },
    document_expiry: { en: 'Document expiry', ar: 'انتهاء مستند' },
  };
  return locale === 'ar' ? map[trigger].ar : map[trigger].en;
};

const severityLabel = (locale: string, severity: AlertSeverity) => {
  const map: Record<AlertSeverity, { en: string; ar: string }> = {
    low: { en: 'Low', ar: 'منخفض' },
    medium: { en: 'Medium', ar: 'متوسط' },
    high: { en: 'High', ar: 'مرتفع' },
  };
  return locale === 'ar' ? map[severity].ar : map[severity].en;
};

export default function ShipmentAlertRulesPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { hasAnyPermission } = usePermissions();

  const canView = hasAnyPermission([MenuPermissions.Logistics.ShipmentAlertRules.View]);
  const canManage = hasAnyPermission([MenuPermissions.Logistics.ShipmentAlertRules.Manage]);

  const title = t('menu.logistics.shipmentManagement.alertRules');

  const { data, loading, fetchList, create, update, remove } = useMasterData<ShipmentAlertRuleApi>({
    endpoint: '/api/shipment-alert-rules',
  });

  const items: ShipmentAlertRule[] = useMemo(() => {
    return (data || []).map((r) => ({
      id: r.id,
      name: r.name,
      trigger: (r.rule_type as AlertTrigger) || 'shipment_delay',
      severity: r.severity,
      isActive: r.is_active,
      thresholdValue: r.threshold_value ?? 1,
      thresholdUnit: r.threshold_unit ?? 'days',
    }));
  }, [data]);

  const [search, setSearch] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<ShipmentAlertRule | null>(null);
  const [deleting, setDeleting] = useState<ShipmentAlertRule | null>(null);

  const [form, setForm] = useState({
    name: '',
    trigger: 'shipment_delay' as AlertTrigger,
    severity: 'medium' as AlertSeverity,
    isActive: true,
    thresholdValue: 1,
    thresholdUnit: 'days' as 'days' | 'percent',
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', trigger: 'shipment_delay', severity: 'medium', isActive: true, thresholdValue: 1, thresholdUnit: 'days' });
    setIsModalOpen(true);
  };

  const openEdit = (rule: ShipmentAlertRule) => {
    setEditing(rule);
    setForm({
      name: rule.name,
      trigger: rule.trigger,
      severity: rule.severity,
      isActive: rule.isActive,
      thresholdValue: rule.thresholdValue,
      thresholdUnit: rule.thresholdUnit,
    });
    setIsModalOpen(true);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((r) => {
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.trigger.toLowerCase().includes(q) ||
        r.severity.toLowerCase().includes(q)
      );
    });
  }, [items, search]);

  useEffect(() => {
    if (!canView) return;
    const handle = setTimeout(() => {
      fetchList({ page: 1, pageSize: 100, search });
    }, 250);
    return () => clearTimeout(handle);
  }, [canView, fetchList, search]);

  const handleSave = async () => {
    if (!canManage) return;
    if (!form.name.trim()) {
      showToast(locale === 'ar' ? 'اسم القاعدة مطلوب' : 'Rule name is required', 'error');
      return;
    }
    if (!Number.isFinite(form.thresholdValue) || form.thresholdValue <= 0) {
      showToast(locale === 'ar' ? 'قيمة العتبة غير صحيحة' : 'Invalid threshold value', 'error');
      return;
    }

    const payload = {
      name: form.name.trim(),
      rule_type: form.trigger,
      severity: form.severity,
      is_active: form.isActive,
      threshold_value: form.thresholdValue,
      threshold_unit: form.thresholdUnit,
    };

    if (editing) {
      const result = await update(editing.id, payload);
      if (!result) return;
    } else {
      const result = await create(payload);
      if (!result) return;
    }

    setIsModalOpen(false);
    setEditing(null);
  };

  const handleDelete = async () => {
    if (!canManage || !deleting) return;
    const ok = await remove(deleting.id);
    if (!ok) return;
    setDeleting(null);
  };

  const toggleActive = async (rule: ShipmentAlertRule) => {
    if (!canManage) return;
    await update(rule.id, { is_active: !rule.isActive });
  };

  if (!canView) {
    return (
      <MainLayout>
        <Head>
          <title>{title} - SLMS</title>
        </Head>
        <div className="text-center py-12">
          <BellAlertIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {locale === 'ar' ? 'غير مصرح' : 'Access Denied'}
          </h2>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>{title} - SLMS</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-100 dark:bg-sky-900/30 rounded-lg">
              <BellAlertIcon className="h-6 w-6 text-sky-600 dark:text-sky-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'إعداد قواعد تنبيه حسب الشحنة والتكاليف والمستندات' : 'Configure shipment alert rules for delays, costs, and documents'}
              </p>
            </div>
          </div>

          {canManage && (
            <Button onClick={openCreate}>
              <PlusIcon className="h-4 w-4" />
              {locale === 'ar' ? 'إضافة' : 'Add'}
            </Button>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <Input
            label={locale === 'ar' ? 'بحث' : 'Search'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={locale === 'ar' ? 'بحث بالاسم/النوع/الأولوية...' : 'Search by name/trigger/severity...'}
          />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'القاعدة' : 'Rule'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المحفز' : 'Trigger'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الأولوية' : 'Severity'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'العتبة' : 'Threshold'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'مفعلة' : 'Active'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{r.name}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{triggerLabel(locale, r.trigger)}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{severityLabel(locale, r.severity)}</td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white">
                    {r.thresholdValue} {r.thresholdUnit === 'days' ? (locale === 'ar' ? 'يوم' : 'days') : '%'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className={
                        'inline-flex items-center gap-2 rounded-md px-3 py-1 text-sm font-medium border ' +
                        (r.isActive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-900/30'
                          : 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-700/30 dark:text-gray-200 dark:border-gray-700')
                      }
                      onClick={() => toggleActive(r)}
                      disabled={!canManage}
                      aria-disabled={!canManage}
                      title={!canManage ? (locale === 'ar' ? 'لا تملك صلاحية' : 'No permission') : undefined}
                    >
                      <CheckCircleIcon className="h-4 w-4" />
                      {r.isActive ? (locale === 'ar' ? 'نعم' : 'Yes') : (locale === 'ar' ? 'لا' : 'No')}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    {canManage && (
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="secondary" onClick={() => openEdit(r)}>
                          <PencilSquareIcon className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => setDeleting(r)}>
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={canManage && isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditing(null);
        }}
        title={locale === 'ar' ? (editing ? 'تعديل' : 'إضافة') : (editing ? 'Edit' : 'Add')}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label={locale === 'ar' ? 'اسم القاعدة' : 'Rule name'}
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'المحفز' : 'Trigger'}
              </label>
              <select
                className="input"
                value={form.trigger}
                onChange={(e) => {
                  const trigger = e.target.value as AlertTrigger;
                  setForm((p) => ({
                    ...p,
                    trigger,
                    thresholdUnit: trigger === 'cost_overrun' ? 'percent' : 'days',
                  }));
                }}
              >
                <option value="shipment_delay">{triggerLabel(locale, 'shipment_delay')}</option>
                <option value="customs_delay">{triggerLabel(locale, 'customs_delay')}</option>
                <option value="cost_overrun">{triggerLabel(locale, 'cost_overrun')}</option>
                <option value="receiving_discrepancy">{triggerLabel(locale, 'receiving_discrepancy')}</option>
                <option value="document_expiry">{triggerLabel(locale, 'document_expiry')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'الأولوية' : 'Severity'}
              </label>
              <select
                className="input"
                value={form.severity}
                onChange={(e) => setForm((p) => ({ ...p, severity: e.target.value as AlertSeverity }))}
              >
                <option value="low">{severityLabel(locale, 'low')}</option>
                <option value="medium">{severityLabel(locale, 'medium')}</option>
                <option value="high">{severityLabel(locale, 'high')}</option>
              </select>
            </div>

            <Input
              label={locale === 'ar' ? 'قيمة العتبة' : 'Threshold value'}
              inputMode="numeric"
              value={String(form.thresholdValue)}
              onChange={(e) => setForm((p) => ({ ...p, thresholdValue: Number(e.target.value || 0) }))}
              placeholder={form.thresholdUnit === 'percent' ? '10' : '2'}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'الوحدة' : 'Unit'}
              </label>
              <select
                className="input"
                value={form.thresholdUnit}
                onChange={(e) => setForm((p) => ({ ...p, thresholdUnit: e.target.value as any }))}
              >
                <option value="days">{locale === 'ar' ? 'يوم' : 'Days'}</option>
                <option value="percent">{locale === 'ar' ? 'نسبة %' : 'Percent %'}</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 p-3">
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">{locale === 'ar' ? 'التفعيل' : 'Active'}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'إيقاف القاعدة يمنع إصدار تنبيهات منها' : 'Disabling the rule stops generating alerts'}
              </div>
            </div>
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={form.isActive}
              onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => {
                setIsModalOpen(false);
                setEditing(null);
              }}
            >
              {locale === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button fullWidth onClick={handleSave} loading={loading}>
              {locale === 'ar' ? 'حفظ' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={loading}
        title={locale === 'ar' ? 'حذف' : 'Delete'}
        message={
          locale === 'ar'
            ? `هل أنت متأكد من حذف القاعدة "${deleting?.name}"؟`
            : `Are you sure you want to delete "${deleting?.name}"?`
        }
        confirmText={locale === 'ar' ? 'حذف' : 'Delete'}
        variant="danger"
      />
    </MainLayout>
  );
}
