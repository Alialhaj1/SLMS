import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useTranslation } from '../../hooks/useTranslation';
import { usePermissions } from '../../hooks/usePermissions';
import { MenuPermissions } from '../../config/menu.permissions';
import { useMasterData } from '../../hooks/useMasterData';
import { StarIcon, PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

type CarrierEvaluation = {
  id: number;
  carrier: string;
  periodFrom: string; // YYYY-MM-DD
  periodTo: string; // YYYY-MM-DD
  onTimePct: number;
  damagePct: number;
  communicationScore: number; // 1..5
  costScore: number; // 1..5
  notes?: string;
};

type CarrierEvaluationApi = {
  id: number;
  carrier: string;
  period_from: string;
  period_to: string;
  on_time_pct: number;
  damage_pct: number;
  communication_score: number;
  cost_score: number;
  notes: string | null;
};

type CarrierEvaluationForm = Omit<CarrierEvaluation, 'id'> & { id?: number };

const toYmd = (value?: string | null) => {
  if (!value) return '';
  return value.length >= 10 ? value.slice(0, 10) : value;
};

function clampScore(v: number) {
  if (Number.isNaN(v)) return 1;
  return Math.max(1, Math.min(5, v));
}

export default function CarrierEvaluationsPage() {
  const { t, locale } = useTranslation();
  const { hasAnyPermission } = usePermissions();

  const canView = hasAnyPermission([MenuPermissions.Logistics.CarrierEvaluations.View]);
  const canManage = hasAnyPermission([MenuPermissions.Logistics.CarrierEvaluations.Manage]);

  const title = t('menu.logistics.shipmentManagement.carrierEvaluations');

  const { data, loading, fetchList, create, update, remove } = useMasterData<CarrierEvaluationApi>({
    endpoint: '/api/carrier-evaluations',
  });

  const items: CarrierEvaluation[] = useMemo(() => {
    return (data || []).map((r) => ({
      id: r.id,
      carrier: r.carrier,
      periodFrom: toYmd(r.period_from),
      periodTo: toYmd(r.period_to),
      onTimePct: r.on_time_pct,
      damagePct: r.damage_pct,
      communicationScore: r.communication_score,
      costScore: r.cost_score,
      notes: r.notes || undefined,
    }));
  }, [data]);

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<CarrierEvaluationForm | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((r) => !q || r.carrier.toLowerCase().includes(q));
  }, [items, search]);

  useEffect(() => {
    if (!canView) return;
    const handle = setTimeout(() => {
      fetchList({ page: 1, pageSize: 100, search });
    }, 250);
    return () => clearTimeout(handle);
  }, [canView, fetchList, search]);

  const overallScore = (r: CarrierEvaluation) => {
    const qualityScore = (r.onTimePct / 100) * 5;
    const damagePenalty = Math.min(2, r.damagePct / 2); // mild penalty
    const score = (qualityScore + r.communicationScore + r.costScore) / 3 - damagePenalty;
    return Math.max(1, Math.min(5, score));
  };

  const openCreate = () => {
    setErrors({});
    setEditing({
      carrier: '',
      periodFrom: '',
      periodTo: '',
      onTimePct: 90,
      damagePct: 0,
      communicationScore: 3,
      costScore: 3,
      notes: '',
    });
    setIsModalOpen(true);
  };

  const openEdit = (row: CarrierEvaluation) => {
    setErrors({});
    setEditing({ ...row });
    setIsModalOpen(true);
  };

  const validate = (row: CarrierEvaluationForm) => {
    const nextErrors: Record<string, string> = {};
    if (!row.carrier.trim()) nextErrors.carrier = locale === 'ar' ? 'اسم شركة النقل مطلوب' : 'Carrier is required';
    if (!row.periodFrom) nextErrors.periodFrom = locale === 'ar' ? 'تاريخ البداية مطلوب' : 'Period from is required';
    if (!row.periodTo) nextErrors.periodTo = locale === 'ar' ? 'تاريخ النهاية مطلوب' : 'Period to is required';
    if (Number.isNaN(row.onTimePct) || row.onTimePct < 0 || row.onTimePct > 100) {
      nextErrors.onTimePct = locale === 'ar' ? 'النسبة يجب أن تكون بين 0 و 100' : 'Must be between 0 and 100';
    }
    if (Number.isNaN(row.damagePct) || row.damagePct < 0) nextErrors.damagePct = locale === 'ar' ? 'النسبة يجب أن تكون >= 0' : 'Must be >= 0';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const upsert = async () => {
    if (!editing) return;

    const normalized: CarrierEvaluationForm = {
      ...editing,
      communicationScore: clampScore(editing.communicationScore),
      costScore: clampScore(editing.costScore),
    };

    if (!validate(normalized)) return;

    const payload = {
      carrier: normalized.carrier.trim(),
      period_from: normalized.periodFrom,
      period_to: normalized.periodTo,
      on_time_pct: normalized.onTimePct,
      damage_pct: normalized.damagePct,
      communication_score: normalized.communicationScore,
      cost_score: normalized.costScore,
      notes: normalized.notes?.trim() || null,
    };

    if (normalized.id) {
      const result = await update(normalized.id, payload);
      if (!result) return;
    } else {
      const result = await create(payload);
      if (!result) return;
    }

    setIsModalOpen(false);
    setEditing(null);
  };

  const requestDelete = (id: number) => {
    setDeletingId(id);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (deletingId == null) return;
    const ok = await remove(deletingId);
    if (!ok) return;
    setConfirmOpen(false);
    setDeletingId(null);
  };

  if (!canView) {
    return (
      <MainLayout>
        <Head>
          <title>{title} - SLMS</title>
        </Head>
        <div className="text-center py-12">
          <StarIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{locale === 'ar' ? 'غير مصرح' : 'Access Denied'}</h2>
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
              <StarIcon className="h-6 w-6 text-sky-600 dark:text-sky-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'تقييم الأداء والجودة والتكلفة' : 'Evaluate performance, quality, and cost'}
              </p>
            </div>
          </div>

          {canManage && (
            <Button onClick={openCreate}>
              <PlusIcon className="h-4 w-4" />
              {locale === 'ar' ? 'إضافة تقييم' : 'Add Evaluation'}
            </Button>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <Input
            label={locale === 'ar' ? 'بحث' : 'Search'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={locale === 'ar' ? 'بحث باسم شركة النقل...' : 'Search by carrier...'}
          />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'شركة النقل' : 'Carrier'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الفترة' : 'Period'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الالتزام' : 'On-time'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'التلف' : 'Damage'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'النتيجة' : 'Score'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{r.carrier}</td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white">{r.periodFrom} → {r.periodTo}</td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white">{r.onTimePct}%</td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white">{r.damagePct.toFixed(1)}%</td>
                  <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{overallScore(r).toFixed(1)} / 5</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {canManage && (
                        <Button size="sm" variant="secondary" onClick={() => openEdit(r)}>
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                      )}
                      {canManage && (
                        <Button size="sm" variant="danger" onClick={() => requestDelete(r.id)}>
                          <TrashIcon className="h-4 w-4" />
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

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditing(null);
          setErrors({});
        }}
        title={locale === 'ar' ? 'تقييم شركة نقل' : 'Carrier Evaluation'}
        size="lg"
      >
        {editing && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label={locale === 'ar' ? 'شركة النقل *' : 'Carrier *'}
                value={editing.carrier}
                onChange={(e) => setEditing({ ...editing, carrier: e.target.value })}
                error={errors.carrier}
              />
              <div />
              <Input
                label={locale === 'ar' ? 'من *' : 'From *'}
                type="date"
                value={editing.periodFrom}
                onChange={(e) => setEditing({ ...editing, periodFrom: e.target.value })}
                error={errors.periodFrom}
              />
              <Input
                label={locale === 'ar' ? 'إلى *' : 'To *'}
                type="date"
                value={editing.periodTo}
                onChange={(e) => setEditing({ ...editing, periodTo: e.target.value })}
                error={errors.periodTo}
              />
              <Input
                label={locale === 'ar' ? 'الالتزام بالوقت (%) *' : 'On-time (%) *'}
                type="number"
                value={String(editing.onTimePct)}
                onChange={(e) => setEditing({ ...editing, onTimePct: Number(e.target.value) })}
                error={errors.onTimePct}
              />
              <Input
                label={locale === 'ar' ? 'التلف/الضرر (%)' : 'Damage (%)'}
                type="number"
                value={String(editing.damagePct)}
                onChange={(e) => setEditing({ ...editing, damagePct: Number(e.target.value) })}
                error={errors.damagePct}
              />
              <Input
                label={locale === 'ar' ? 'التواصل (1-5)' : 'Communication (1-5)'}
                type="number"
                value={String(editing.communicationScore)}
                onChange={(e) => setEditing({ ...editing, communicationScore: Number(e.target.value) })}
              />
              <Input
                label={locale === 'ar' ? 'التكلفة (1-5)' : 'Cost (1-5)'}
                type="number"
                value={String(editing.costScore)}
                onChange={(e) => setEditing({ ...editing, costScore: Number(e.target.value) })}
              />
              <div className="md:col-span-2">
                <Input
                  label={locale === 'ar' ? 'ملاحظات' : 'Notes'}
                  value={editing.notes || ''}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                {locale === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button onClick={upsert} loading={loading}>{locale === 'ar' ? 'حفظ' : 'Save'}</Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          setDeletingId(null);
        }}
        onConfirm={confirmDelete}
        title={locale === 'ar' ? 'حذف التقييم' : 'Delete Evaluation'}
        message={locale === 'ar' ? 'هل أنت متأكد؟ لا يمكن التراجع.' : 'Are you sure? This action cannot be undone.'}
        confirmText={locale === 'ar' ? 'حذف' : 'Delete'}
        variant="danger"
        loading={loading}
      />
    </MainLayout>
  );
}
