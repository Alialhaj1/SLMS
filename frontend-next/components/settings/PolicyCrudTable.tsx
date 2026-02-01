import { useEffect, useMemo, useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import ConfirmDialog from '../ui/ConfirmDialog';
import { DataTablePro, Column, RowAction } from '../ui/DataTablePro';
import { useMasterData } from '../../hooks/useMasterData';
import { useTranslation } from '../../hooks/useTranslation';
import { usePermissions } from '../../hooks/usePermissions';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

export interface SystemPolicy {
  id: number;
  policy_key: string;
  policy_value: string;
  description_en?: string | null;
  description_ar?: string | null;
  data_type: 'string' | 'integer' | 'float' | 'number' | 'boolean' | 'json';
  category?: string | null;
  default_value?: string | null;
  validation_regex?: string | null;
  is_system_policy: boolean;
  is_active: boolean;
  company_id?: number | null;
  created_at?: string;
  updated_at?: string;
}

type FormState = {
  policy_key: string;
  policy_value: string;
  data_type: SystemPolicy['data_type'];
  category: string;
  description_en: string;
  description_ar: string;
  default_value: string;
  validation_regex: string;
  is_active: boolean;
  is_system_policy: boolean;
};

const emptyForm: FormState = {
  policy_key: '',
  policy_value: '',
  data_type: 'string',
  category: '',
  description_en: '',
  description_ar: '',
  default_value: '',
  validation_regex: '',
  is_active: true,
  is_system_policy: false,
};

function validatePolicyForm(t: (key: string) => string, form: FormState) {
  const errors: Record<string, string> = {};

  if (!form.policy_key.trim()) errors.policy_key = t('settingsAdmin.fields.policyKeyRequired');
  if (!form.policy_value.trim()) errors.policy_value = t('settingsAdmin.fields.valueRequired');

  if (form.data_type === 'integer' || form.data_type === 'number' || form.data_type === 'float') {
    if (Number.isNaN(Number(form.policy_value))) {
      errors.policy_value = t('settingsAdmin.fields.valueMustBeNumber');
    }
  }

  if (form.data_type === 'boolean') {
    const v = form.policy_value.trim().toLowerCase();
    if (!['true', 'false', '1', '0'].includes(v)) {
      errors.policy_value = t('settingsAdmin.fields.valueMustBeBoolean');
    }
  }

  if (form.data_type === 'json') {
    try {
      JSON.parse(form.policy_value);
    } catch {
      errors.policy_value = t('settingsAdmin.fields.valueMustBeJson');
    }
  }

  if (form.validation_regex) {
    try {
      // eslint-disable-next-line no-new
      new RegExp(form.validation_regex);
    } catch {
      errors.validation_regex = t('settingsAdmin.fields.invalidRegex');
    }
  }

  return errors;
}

interface PolicyCrudTableProps {
  titleKey: string;
  subtitleKey: string;
  viewPermission: string;
  managePermissions?: { create: string; edit: string; delete: string };
  filters?: Record<string, any>;
}

export default function PolicyCrudTable(props: PolicyCrudTableProps) {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();

  const canView = hasPermission(props.viewPermission as any);
  const canCreate = props.managePermissions ? hasPermission(props.managePermissions.create as any) : false;
  const canEdit = props.managePermissions ? hasPermission(props.managePermissions.edit as any) : false;
  const canDelete = props.managePermissions ? hasPermission(props.managePermissions.delete as any) : false;

  const {
    data,
    loading,
    pagination,
    fetchList,
    create,
    update,
    remove,
  } = useMasterData<SystemPolicy>({ endpoint: '/api/system-policies' });

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SystemPolicy | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toDelete, setToDelete] = useState<SystemPolicy | null>(null);

  useEffect(() => {
    if (!canView) return;
    fetchList({
      page,
      pageSize: pagination.pageSize,
      search,
      filters: props.filters,
    });
  }, [canView, fetchList, page, pagination.pageSize, props.filters, search]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, category: String(props.filters?.category || '') });
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (row: SystemPolicy) => {
    setEditing(row);
    setForm({
      policy_key: row.policy_key,
      policy_value: row.policy_value ?? '',
      data_type: row.data_type ?? 'string',
      category: row.category ?? '',
      description_en: row.description_en ?? '',
      description_ar: row.description_ar ?? '',
      default_value: row.default_value ?? '',
      validation_regex: row.validation_regex ?? '',
      is_active: !!row.is_active,
      is_system_policy: !!row.is_system_policy,
    });
    setErrors({});
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
  };

  const onSubmit = async () => {
    const newErrors = validatePolicyForm(t, form);
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSubmitting(true);
    try {
      if (editing) {
        await update(editing.id, {
          policy_value: form.policy_value,
          description_en: form.description_en || null,
          description_ar: form.description_ar || null,
          data_type: form.data_type,
          category: form.category || null,
          default_value: form.default_value || null,
          validation_regex: form.validation_regex || null,
          is_active: form.is_active,
        } as any);
      } else {
        await create({
          policy_key: form.policy_key,
          policy_value: form.policy_value,
          description_en: form.description_en || null,
          description_ar: form.description_ar || null,
          data_type: form.data_type,
          category: form.category || null,
          default_value: form.default_value || null,
          validation_regex: form.validation_regex || null,
          is_system_policy: form.is_system_policy,
          is_active: form.is_active,
        } as any);
      }

      closeModal();
      await fetchList({ page, pageSize: pagination.pageSize, search, filters: props.filters });
    } finally {
      setSubmitting(false);
    }
  };

  const requestDelete = (row: SystemPolicy) => {
    setToDelete(row);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await remove(toDelete.id);
      await fetchList({ page, pageSize: pagination.pageSize, search, filters: props.filters });
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
      setToDelete(null);
    }
  };

  const columns: Column<SystemPolicy>[] = useMemo(
    () => [
      { key: 'policy_key', label: t('settingsAdmin.fields.policyKey'), sortable: true },
      { key: 'policy_value', label: t('settingsAdmin.fields.value') },
      { key: 'data_type', label: t('settingsAdmin.fields.dataType'), sortable: true },
      {
        key: 'is_active',
        label: t('settingsAdmin.fields.active'),
        render: (row) => (row.is_active ? t('common.yes') : t('common.no')),
      },
    ],
    [t]
  );

  const actions: RowAction<SystemPolicy>[] = useMemo(
    () => [
      {
        label: t('common.edit'),
        onClick: openEdit,
        icon: <PencilIcon className="w-4 h-4" />,
        show: () => canEdit,
      },
      {
        label: t('common.delete'),
        onClick: requestDelete,
        icon: <TrashIcon className="w-4 h-4" />,
        variant: 'danger',
        show: (row) => canDelete && !row.is_system_policy,
      },
    ],
    [canDelete, canEdit, t]
  );

  if (!canView) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
            {t(props.titleKey)}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{t(props.subtitleKey)}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => fetchList({ page, pageSize: pagination.pageSize, search, filters: props.filters })}
            disabled={loading}
          >
            <ArrowPathIcon className="w-5 h-5" />
          </Button>
          {canCreate && (
            <Button onClick={openCreate}>
              <PlusIcon className="w-5 h-5 me-2" />
              {t('common.add')}
            </Button>
          )}
        </div>
      </div>

      <Card>
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <Input
              label={t('common.search')}
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
              placeholder={t('settingsAdmin.searchPlaceholder')}
            />
          </div>
        </div>
      </Card>

      <Card>
        <DataTablePro<SystemPolicy>
          data={data}
          columns={columns}
          keyExtractor={(row) => row.id}
          loading={loading}
          emptyMessage={t('settingsAdmin.empty')}
          actions={actions}
          pagination={{
            page: pagination.currentPage,
            pageSize: pagination.pageSize,
            total: pagination.totalItems,
            onPageChange: (p) => setPage(p),
          }}
        />
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editing ? t('settingsAdmin.editPolicyTitle') : t('settingsAdmin.addPolicyTitle')}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label={t('settingsAdmin.fields.policyKey')}
            required
            value={form.policy_key}
            disabled={!!editing}
            onChange={(e) => setForm((p) => ({ ...p, policy_key: e.target.value }))}
            error={errors.policy_key}
          />

          <Input
            label={t('settingsAdmin.fields.value')}
            required
            value={form.policy_value}
            onChange={(e) => setForm((p) => ({ ...p, policy_value: e.target.value }))}
            error={errors.policy_value}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('settingsAdmin.fields.dataType')}
              </label>
              <select
                value={form.data_type}
                onChange={(e) => setForm((p) => ({ ...p, data_type: e.target.value as any }))}
                className="input w-full"
              >
                {(['string', 'integer', 'float', 'number', 'boolean', 'json'] as const).map((dt) => (
                  <option key={dt} value={dt}>
                    {dt}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label={t('settingsAdmin.fields.category')}
              value={form.category}
              onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={t('settingsAdmin.fields.descriptionEn')}
              value={form.description_en}
              onChange={(e) => setForm((p) => ({ ...p, description_en: e.target.value }))}
            />
            <Input
              label={t('settingsAdmin.fields.descriptionAr')}
              value={form.description_ar}
              onChange={(e) => setForm((p) => ({ ...p, description_ar: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={t('settingsAdmin.fields.defaultValue')}
              value={form.default_value}
              onChange={(e) => setForm((p) => ({ ...p, default_value: e.target.value }))}
            />
            <Input
              label={t('settingsAdmin.fields.validationRegex')}
              value={form.validation_regex}
              onChange={(e) => setForm((p) => ({ ...p, validation_regex: e.target.value }))}
              error={errors.validation_regex}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="is_active"
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
            />
            <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-gray-300">
              {t('settingsAdmin.fields.active')}
            </label>
          </div>

          {!editing && (
            <div className="flex items-center gap-2">
              <input
                id="is_system_policy"
                type="checkbox"
                checked={form.is_system_policy}
                onChange={(e) => setForm((p) => ({ ...p, is_system_policy: e.target.checked }))}
              />
              <label htmlFor="is_system_policy" className="text-sm text-gray-700 dark:text-gray-300">
                {t('settingsAdmin.fields.systemPolicy')}
              </label>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={closeModal}>
              {t('common.cancel')}
            </Button>
            <Button onClick={onSubmit} loading={submitting} disabled={submitting || (!editing && !canCreate) || (editing && !canEdit)}>
              {t('common.save')}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={confirmDelete}
        title={t('settingsAdmin.deleteTitle')}
        message={t('settingsAdmin.deleteMessage')}
        confirmText={t('common.delete')}
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
