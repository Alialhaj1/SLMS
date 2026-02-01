import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import MainLayout from '../layout/MainLayout';
import MasterDataTable, { TableColumn } from '../common/MasterDataTable';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import ConfirmDialog from '../ui/ConfirmDialog';
import { useMasterData } from '../../hooks/useMasterData';
import { usePermissions } from '../../hooks/usePermissions';
import { useTranslation } from '../../hooks/useTranslation';
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

export type ReferenceDataItem = {
  id: number;
  type: string;
  company_id?: number | null;
  code: string;
  name_en: string;
  name_ar: string;
  description_en?: string | null;
  description_ar?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  // For item_types: count of related items
  items_count?: number;
};

type FormData = {
  code: string;
  name_en: string;
  name_ar: string;
  description_en: string;
  description_ar: string;
  is_active: boolean;
};

type Props = {
  /** reference_data.type (snake_case) */
  type: string;
  /** i18n title key (menu.*) */
  titleKey: string;
};

function toBooleanFilter(v: string): boolean | undefined {
  if (v === 'true') return true;
  if (v === 'false') return false;
  return undefined;
}

function normalizeActionArg<T extends { id: number }>(arg: unknown, rows: T[]): T | null {
  if (typeof arg === 'number') {
    return rows.find((r) => r.id === arg) ?? null;
  }
  if (arg && typeof arg === 'object' && 'id' in (arg as any)) {
    return arg as T;
  }
  return null;
}

export default function ReferenceDataCrudPage({ type, titleKey }: Props) {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const { hasPermission } = usePermissions();

  const canView = hasPermission('master:reference_data:view' as any);
  const canCreate = hasPermission('master:reference_data:create' as any);
  const canEdit = hasPermission('master:reference_data:edit' as any);
  const canDelete = hasPermission('master:reference_data:delete' as any);

  useEffect(() => {
    if (!canView) router.push('/dashboard');
  }, [canView, router]);

  const { data, loading, pagination, fetchList, create, update, remove } = useMasterData<ReferenceDataItem>({
    endpoint: `/api/reference-data/${type}`,
    pageSize: 10,
    autoFetch: false,
  });

  const [filters, setFilters] = useState({
    search: '',
    is_active: '',
  });

  const [sortBy, setSortBy] = useState<'code' | 'name_en' | 'name_ar' | 'is_active'>('name_en');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [editingItem, setEditingItem] = useState<ReferenceDataItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<ReferenceDataItem | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<FormData>({
    code: '',
    name_en: '',
    name_ar: '',
    description_en: '',
    description_ar: '',
    is_active: true,
  });

  const columns: TableColumn<ReferenceDataItem>[] = useMemo(
    () => [
      {
        key: 'code',
        label: t('common.code'),
        sortable: true,
        render: (value, _row) => <span className="font-mono font-medium">{String(value ?? '')}</span>,
      },
      {
        key: 'name',
        label: t('common.name'),
        sortable: true,
        render: (_value, row) => (
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {locale === 'ar' ? row.name_ar : row.name_en}
            </div>
            {(locale === 'ar' ? row.description_ar : row.description_en) && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                {locale === 'ar' ? row.description_ar : row.description_en}
              </div>
            )}
          </div>
        ),
      },
      // Add items count column for item_types only
      ...(type === 'item_types'
        ? [
            {
              key: 'items_count' as keyof ReferenceDataItem,
              label: locale === 'ar' ? 'عدد الأصناف' : 'Items Count',
              sortable: false,
              render: (value: any) => (
                <div className="flex items-center gap-2">
                  <span
                    className={clsx(
                      'px-3 py-1.5 text-sm font-semibold rounded-lg',
                      Number(value) > 0
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    )}
                  >
                    {Number(value ?? 0).toLocaleString()}
                  </span>
                </div>
              ),
            },
          ]
        : []),
      {
        key: 'is_active',
        label: t('common.status'),
        sortable: true,
        render: (value, _row) => (
          <span
            className={clsx(
              'px-2 py-1 text-xs font-medium rounded-full',
              value
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
            )}
          >
            {value ? t('common.active') : t('common.inactive')}
          </span>
        ),
      },
    ],
    [locale, t, type]
  );

  const validate = (dataToValidate: FormData) => {
    const next: Record<string, string> = {};
    if (!dataToValidate.code.trim()) next.code = t('validation.required');
    if (!dataToValidate.name_en.trim()) next.name_en = t('validation.required');
    if (!dataToValidate.name_ar.trim()) next.name_ar = t('validation.required');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const load = async (page = 1) => {
    await fetchList({
      page,
      search: filters.search,
      filters: {
        is_active: toBooleanFilter(filters.is_active),
      },
      sortBy,
      sortOrder,
    });
  };

  useEffect(() => {
    if (!canView) return;
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView, type]);

  const handleSort = (key: string) => {
    const nextSortBy = (['code', 'name_en', 'name_ar', 'is_active'].includes(key) ? key : 'name_en') as any;
    const nextOrder = sortBy === nextSortBy && sortOrder === 'asc' ? 'desc' : 'asc';
    setSortBy(nextSortBy);
    setSortOrder(nextOrder);
    load(1);
  };

  const openCreate = () => {
    setEditingItem(null);
    setErrors({});
    setFormData({
      code: '',
      name_en: '',
      name_ar: '',
      description_en: '',
      description_ar: '',
      is_active: true,
    });
    setShowModal(true);
  };

  const openEdit = (arg: unknown) => {
    const item = normalizeActionArg(arg, data);
    if (!item) return;

    setEditingItem(item);
    setErrors({});
    setFormData({
      code: item.code,
      name_en: item.name_en,
      name_ar: item.name_ar,
      description_en: item.description_en ?? '',
      description_ar: item.description_ar ?? '',
      is_active: item.is_active,
    });
    setShowModal(true);
  };

  const requestDelete = (arg: unknown) => {
    const item = normalizeActionArg(arg, data);
    if (!item) return;

    setDeletingItem(item);
    setConfirmOpen(true);
  };

  const onSubmit = async () => {
    if (!validate(formData)) return;

    setSaving(true);
    try {
      if (editingItem) {
        await update(editingItem.id, {
          code: formData.code,
          name_en: formData.name_en,
          name_ar: formData.name_ar,
          description_en: formData.description_en || null,
          description_ar: formData.description_ar || null,
          is_active: formData.is_active,
        });
      } else {
        await create({
          code: formData.code,
          name_en: formData.name_en,
          name_ar: formData.name_ar,
          description_en: formData.description_en || null,
          description_ar: formData.description_ar || null,
          is_active: formData.is_active,
        });
      }
      setShowModal(false);
      await load(pagination.currentPage);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingItem) return;

    setDeleting(true);
    try {
      const ok = await remove(deletingItem.id);
      if (ok) {
        setConfirmOpen(false);
        setDeletingItem(null);
        await load(pagination.currentPage);
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <MainLayout>
      <Head>
        <title>{t(titleKey)} - SLMS</title>
      </Head>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t(titleKey)}</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {t('master.referenceData.subtitle')}
            </p>
          </div>

          {canCreate && (
            <Button onClick={openCreate} className="w-full sm:w-auto">
              <PlusIcon className="w-4 h-4" />
              {t('common.add')}
            </Button>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              value={filters.search}
              onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
              placeholder={t('common.search')}
              className="w-full"
            />

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                {t('common.status')}
              </label>
              <select
                value={filters.is_active}
                onChange={(e) => setFilters((p) => ({ ...p, is_active: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              >
                <option value="">{t('common.all')}</option>
                <option value="true">{t('common.active')}</option>
                <option value="false">{t('common.inactive')}</option>
              </select>
            </div>

            <div className="flex items-end">
              <Button variant="secondary" onClick={() => load(1)} className="w-full">
                <MagnifyingGlassIcon className="w-4 h-4" />
                {t('common.search')}
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <MasterDataTable
            columns={columns}
            data={data}
            loading={loading}
            onEdit={canEdit ? (openEdit as any) : undefined}
            onDelete={canDelete ? (requestDelete as any) : undefined}
            canEdit={canEdit}
            canDelete={canDelete}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
            pagination={{
              ...pagination,
              onPageChange: (page) => load(page),
            }}
            emptyMessage={t('common.noData')}
          />
        </div>

        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editingItem ? t('common.edit') : t('common.add')}
          size="md"
        >
          <div className="space-y-4">
            <Input
              label={t('common.code')}
              value={formData.code}
              onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value }))}
              error={errors.code}
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label={t('common.nameEn')}
                value={formData.name_en}
                onChange={(e) => setFormData((p) => ({ ...p, name_en: e.target.value }))}
                error={errors.name_en}
                required
              />
              <Input
                label={t('common.nameAr')}
                value={formData.name_ar}
                onChange={(e) => setFormData((p) => ({ ...p, name_ar: e.target.value }))}
                error={errors.name_ar}
                required
                dir="rtl"
              />
            </div>

            <Input
              label={t('common.descriptionEn')}
              value={formData.description_en}
              onChange={(e) => setFormData((p) => ({ ...p, description_en: e.target.value }))}
              multiline
              rows={3}
            />

            <Input
              label={t('common.descriptionAr')}
              value={formData.description_ar}
              onChange={(e) => setFormData((p) => ({ ...p, description_ar: e.target.value }))}
              multiline
              rows={3}
              dir="rtl"
            />

            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData((p) => ({ ...p, is_active: e.target.checked }))}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              {t('common.active')}
            </label>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setShowModal(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={onSubmit} loading={saving}>
                {editingItem ? t('common.save') : t('common.create')}
              </Button>
            </div>
          </div>
        </Modal>

        <ConfirmDialog
          isOpen={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={confirmDelete}
          title={t('common.delete')}
          message={t('common.deleteConfirm')}
          confirmText={t('common.delete')}
          variant="danger"
          loading={deleting}
        />
      </div>
    </MainLayout>
  );
}
