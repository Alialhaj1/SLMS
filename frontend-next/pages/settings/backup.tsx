import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { DataTablePro, Column } from '../../components/ui/DataTablePro';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import { usePermissions } from '../../hooks/usePermissions';
import { useMasterData } from '../../hooks/useMasterData';
import { withPermission } from '../../utils/withPermission';

interface BackupSetting {
  id: number;
  company_id: number;
  storage_type: 'local' | 's3' | 'azure';
  storage_path?: string | null;
  schedule_cron?: string | null;
  retention_days: number;
  is_enabled: boolean;
  last_run_at?: string | null;
  last_status?: string | null;
  last_error?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface BackupRun {
  id: number;
  status: string;
  started_at?: string | null;
  completed_at?: string | null;
  error_message?: string | null;
  created_at: string;
}

function BackupSettingsPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();

  const canView = hasPermission('backup_settings:view');
  const canEdit = hasPermission('backup_settings:edit');
  const canExecute = hasPermission('backup_settings:execute');

  const {
    data,
    loading,
    pagination,
    fetchList,
    create,
    update,
    remove,
  } = useMasterData<BackupSetting>({ endpoint: '/api/backup-settings', autoFetch: false, pageSize: 10 });

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BackupSetting | null>(null);
  const [form, setForm] = useState({
    storage_type: 'local' as BackupSetting['storage_type'],
    storage_path: '',
    schedule_cron: '',
    retention_days: '30',
    is_enabled: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [runsOpen, setRunsOpen] = useState(false);
  const [runsFor, setRunsFor] = useState<BackupSetting | null>(null);
  const [runs, setRuns] = useState<BackupRun[]>([]);
  const [runsLoading, setRunsLoading] = useState(false);
  const [runsPagination, setRunsPagination] = useState({ page: 1, pageSize: 10, total: 0 });

  useEffect(() => {
    if (!canView) return;
    fetchList({ page: 1, pageSize: 10 });
  }, [canView, fetchList]);

  const validateForm = () => {
    const next: Record<string, string> = {};
    if (!form.storage_type) next.storage_type = t('common.required');

    const retention = Number(form.retention_days);
    if (!Number.isFinite(retention) || retention < 1) next.retention_days = t('common.invalidValue');

    // storage_path required for local
    if (form.storage_type === 'local' && !form.storage_path.trim()) {
      next.storage_path = t('common.required');
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const openCreate = () => {
    setEditing(null);
    setErrors({});
    setForm({
      storage_type: 'local',
      storage_path: '',
      schedule_cron: '',
      retention_days: '30',
      is_enabled: false,
    });
    setModalOpen(true);
  };

  const openEdit = (item: BackupSetting) => {
    setEditing(item);
    setErrors({});
    setForm({
      storage_type: item.storage_type,
      storage_path: item.storage_path ?? '',
      schedule_cron: item.schedule_cron ?? '',
      retention_days: String(item.retention_days ?? 30),
      is_enabled: Boolean(item.is_enabled),
    });
    setModalOpen(true);
  };

  const submitForm = async () => {
    if (!validateForm()) return;

    const payload = {
      storage_type: form.storage_type,
      storage_path: form.storage_path ? form.storage_path : null,
      schedule_cron: form.schedule_cron ? form.schedule_cron : null,
      retention_days: Number(form.retention_days),
      is_enabled: Boolean(form.is_enabled),
    };

    const res = editing ? await update(editing.id, payload) : await create(payload);
    if (res) {
      setModalOpen(false);
      setEditing(null);
    }
  };

  const executeNow = async (item: BackupSetting) => {
    if (!canExecute) return;

    try {
      const token = localStorage.getItem('accessToken');
      const companyId = localStorage.getItem('activeCompanyId');
      const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/backup-settings/${item.id}/execute`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...(companyId ? { 'X-Company-Id': String(companyId) } : {}),
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || err.message || 'Failed');
      }

      showToast(t('settingsAdmin.backup.execute'), 'success');
      await fetchList({ page: pagination.currentPage, pageSize: pagination.pageSize });
    } catch (e) {
      showToast(e instanceof Error ? e.message : t('common.error'), 'error');
    }
  };

  const openRuns = async (item: BackupSetting) => {
    setRunsFor(item);
    setRunsOpen(true);
    await fetchRuns(item.id, 1);
  };

  const fetchRuns = async (settingsId: number, page: number) => {
    setRunsLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const companyId = localStorage.getItem('activeCompanyId');
      const params = new URLSearchParams({ page: String(page), limit: String(runsPagination.pageSize) });
      const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/backup-settings/${settingsId}/runs?${params.toString()}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          ...(companyId ? { 'X-Company-Id': String(companyId) } : {}),
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || err.message || 'Failed');
      }

      const json = await res.json();
      setRuns(json.data || []);
      if (json.meta) {
        setRunsPagination((p) => ({ ...p, page: json.meta.page, total: json.meta.total }));
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : t('common.error'), 'error');
    } finally {
      setRunsLoading(false);
    }
  };

  const exportCsv = () => {
    const headers = ['id', 'storage_type', 'storage_path', 'schedule_cron', 'retention_days', 'is_enabled', 'last_status', 'last_run_at'];
    const lines = [headers.join(',')].concat(
      data.map((row) =>
        headers
          .map((h) => {
            const v = (row as any)[h];
            const s = v === null || v === undefined ? '' : String(v);
            return `"${s.replace(/\"/g, '""')}"`;
          })
          .join(',')
      )
    );

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'backup-settings.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const printPage = () => {
    if (typeof window === 'undefined') return;
    window.print();
  };

  const columns: Column<BackupSetting>[] = useMemo(
    () => [
      { key: 'id', label: t('common.id'), sortable: true },
      { key: 'storage_type', label: t('settingsAdmin.fields.storageType'), sortable: true },
      { key: 'storage_path', label: t('settingsAdmin.fields.storagePath') },
      { key: 'schedule_cron', label: t('settingsAdmin.fields.scheduleCron') },
      { key: 'retention_days', label: t('settingsAdmin.fields.retentionDays'), sortable: true },
      { key: 'is_enabled', label: t('settingsAdmin.fields.enabled'), sortable: true },
      { key: 'last_status', label: t('settingsAdmin.fields.lastStatus') },
      { key: 'last_run_at', label: t('settingsAdmin.fields.lastRunAt') },
    ],
    [t]
  );

  if (!canView) {
    return (
      <MainLayout>
        <Head>
          <title>{t('settingsAdmin.backup.title')} - SLMS</title>
        </Head>
        <div className="p-6">
          <Card>
            <div className="text-center text-gray-700 dark:text-gray-300">{t('errors.403.title')}</div>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>{t('settingsAdmin.backup.title')} - SLMS</title>
      </Head>

      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">{t('settingsAdmin.backup.title')}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">{t('settingsAdmin.backup.subtitle')}</p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => fetchList({ page: pagination.currentPage, pageSize: pagination.pageSize })}>
              {t('common.refresh')}
            </Button>
            <Button variant="secondary" onClick={exportCsv}>
              {t('common.export')}
            </Button>
            <Button variant="secondary" onClick={printPage}>
              {t('common.print')}
            </Button>
            {canEdit && <Button onClick={openCreate}>{t('common.add')}</Button>}
          </div>
        </div>

        <Card>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              label={t('common.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              helperText={t('settingsAdmin.searchPlaceholder')}
            />
            <div className="md:col-span-2 flex items-end justify-end">
              <Button
                variant="secondary"
                onClick={() => {
                  fetchList({ page: 1, pageSize: pagination.pageSize, search: search || undefined });
                }}
              >
                {t('common.search')}
              </Button>
            </div>
          </div>
        </Card>

        <Card>
          <DataTablePro<BackupSetting>
            data={data}
            columns={columns}
            keyExtractor={(row) => row.id}
            loading={loading}
            emptyMessage={t('settingsAdmin.empty')}
            actions={[
              {
                label: t('common.edit'),
                onClick: (row) => openEdit(row),
                show: () => canEdit,
              },
              {
                label: t('settingsAdmin.backup.execute'),
                onClick: (row) => executeNow(row),
                show: () => canExecute,
              },
              {
                label: t('settingsAdmin.backup.viewRuns'),
                onClick: (row) => openRuns(row),
              },
              {
                label: t('common.delete'),
                variant: 'danger',
                onClick: (row) => {
                  setDeletingId(row.id);
                  setConfirmOpen(true);
                },
                show: () => canEdit,
              },
            ]}
            pagination={{
              page: pagination.currentPage,
              pageSize: pagination.pageSize,
              total: pagination.totalItems,
              onPageChange: (p) => fetchList({ page: p, pageSize: pagination.pageSize, search: search || undefined }),
            }}
          />
        </Card>

        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editing ? t('common.edit') : t('common.create')}
          size="lg"
          footer={
            <>
              <Button variant="secondary" onClick={() => setModalOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={submitForm} loading={loading}>
                {t('common.save')}
              </Button>
            </>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('settingsAdmin.fields.storageType')}
              </label>
              <select
                className="input w-full"
                value={form.storage_type}
                onChange={(e) => setForm((p) => ({ ...p, storage_type: e.target.value as any }))}
                disabled={!canEdit}
              >
                <option value="local">local</option>
                <option value="s3">s3</option>
                <option value="azure">azure</option>
              </select>
              {errors.storage_type && <p className="text-sm text-red-600 mt-1">{errors.storage_type}</p>}
            </div>

            <Input
              label={t('settingsAdmin.fields.retentionDays')}
              type="number"
              value={form.retention_days}
              onChange={(e) => setForm((p) => ({ ...p, retention_days: e.target.value }))}
              error={errors.retention_days}
              disabled={!canEdit}
            />

            <Input
              label={t('settingsAdmin.fields.storagePath')}
              value={form.storage_path}
              onChange={(e) => setForm((p) => ({ ...p, storage_path: e.target.value }))}
              error={errors.storage_path}
              disabled={!canEdit}
            />

            <Input
              label={t('settingsAdmin.fields.scheduleCron')}
              value={form.schedule_cron}
              onChange={(e) => setForm((p) => ({ ...p, schedule_cron: e.target.value }))}
              disabled={!canEdit}
            />

            <div className="flex items-center gap-2">
              <input
                id="is_enabled"
                type="checkbox"
                checked={form.is_enabled}
                onChange={(e) => setForm((p) => ({ ...p, is_enabled: e.target.checked }))}
                disabled={!canEdit}
              />
              <label htmlFor="is_enabled" className="text-sm text-gray-700 dark:text-gray-300">
                {t('settingsAdmin.fields.enabled')}
              </label>
            </div>
          </div>
        </Modal>

        <ConfirmDialog
          isOpen={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={async () => {
            if (!deletingId) return;
            await remove(deletingId);
            setDeletingId(null);
          }}
          title={t('settingsAdmin.deleteTitle')}
          message={t('settingsAdmin.deleteMessage')}
          confirmText={t('common.delete')}
          cancelText={t('common.cancel')}
          variant="danger"
          loading={loading}
        />

        <Modal
          isOpen={runsOpen}
          onClose={() => {
            setRunsOpen(false);
            setRunsFor(null);
            setRuns([]);
          }}
          title={t('settingsAdmin.backup.runsTitle')}
          size="xl"
          footer={
            <Button variant="secondary" onClick={() => setRunsOpen(false)}>
              {t('common.close')}
            </Button>
          }
        >
          {runsFor && (
            <DataTablePro<BackupRun>
              data={runs}
              columns={[
                { key: 'id', label: t('common.id') },
                { key: 'status', label: t('common.status') },
                { key: 'started_at', label: t('settingsAdmin.fields.startedAt') },
                { key: 'completed_at', label: t('settingsAdmin.fields.completedAt') },
                { key: 'error_message', label: t('settingsAdmin.fields.errorMessage') },
                { key: 'created_at', label: t('common.createdAt') },
              ]}
              keyExtractor={(r) => r.id}
              loading={runsLoading}
              emptyMessage={t('settingsAdmin.empty')}
              pagination={{
                page: runsPagination.page,
                pageSize: runsPagination.pageSize,
                total: runsPagination.total,
                onPageChange: (p) => fetchRuns(runsFor.id, p),
              }}
            />
          )}
        </Modal>
      </div>
    </MainLayout>
  );
}

export default withPermission('backup_settings:view', BackupSettingsPage);
