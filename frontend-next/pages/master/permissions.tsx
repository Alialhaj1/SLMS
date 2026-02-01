import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/contexts/ToastContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useTranslation } from '@/hooks/useTranslation';

interface Permission {
  id: number;
  permission_code: string;
  resource: string;
  action: string;
  description?: string;
  created_at: string;
}

export default function PermissionsPage() {
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  const { t } = useTranslation();

  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    permission_code: '',
    resource: '',
    action: '',
    description: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://localhost:4000/api/roles/permissions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setPermissions(data.data || []);
      }
    } catch (error) {
      showToast(t('messages.error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.permission_code?.trim()) newErrors.permission_code = t('master.permissions.validation.required');
    if (!formData.resource?.trim()) newErrors.resource = t('master.permissions.validation.required');
    if (!formData.action?.trim()) newErrors.action = t('master.permissions.validation.required');
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      const token = localStorage.getItem('accessToken');
      const url = editingId
        ? `http://localhost:4000/api/roles/permissions/${editingId}`
        : 'http://localhost:4000/api/roles/permissions';

      const response = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const result = await response.json();
        if (editingId) {
          setPermissions(permissions.map((p) => (p.id === editingId ? result.data : p)));
          showToast(t('master.permissions.messages.updated'), 'success');
        } else {
          setPermissions([...permissions, result.data]);
          showToast(t('master.permissions.messages.created'), 'success');
        }
        setIsModalOpen(false);
        setEditingId(null);
        setFormData({ permission_code: '', resource: '', action: '', description: '' });
      } else {
        showToast(t('messages.error'), 'error');
      }
    } catch (error) {
      showToast(t('messages.error'), 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`http://localhost:4000/api/roles/permissions/${deleteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setPermissions(permissions.filter((p) => p.id !== deleteId));
        showToast(t('master.permissions.messages.deleted'), 'success');
        setDeleteId(null);
      } else {
        showToast(t('messages.error'), 'error');
      }
    } catch (error) {
      showToast(t('messages.error'), 'error');
    }
  };

  if (!hasPermission('permissions:view')) {
    return <MainLayout><div className="p-6 text-red-600">{t('messages.accessDenied')}</div></MainLayout>;
  }

  const filteredPermissions = permissions.filter((p) =>
    p.permission_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.resource.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <MainLayout>
      <Head><title>{t('master.permissions.title')} - SLMS</title></Head>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">{t('master.permissions.title')}</h1>
          {hasPermission('permissions:create') && (
            <Button
              onClick={() => {
                setEditingId(null);
                setFormData({ permission_code: '', resource: '', action: '', description: '' });
                setIsModalOpen(true);
              }}
              className="bg-blue-600 text-white"
            >
              {t('master.permissions.buttons.create')}
            </Button>
          )}
        </div>

        <div className="mb-6">
          <Input
            placeholder={t('common.search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-64"
          />
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-6 text-center">{t('common.loading')}</div>
          ) : filteredPermissions.length === 0 ? (
            <div className="p-6 text-center text-gray-500">{t('common.noData')}</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-700 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold">{t('master.permissions.columns.code')}</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">{t('master.permissions.columns.resource')}</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">{t('master.permissions.columns.action')}</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">{t('master.permissions.columns.description')}</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredPermissions.map((perm) => (
                  <tr key={perm.id} className="border-b hover:bg-gray-50 dark:hover:bg-slate-700">
                    <td className="px-6 py-4 font-mono text-sm">{perm.permission_code}</td>
                    <td className="px-6 py-4">{perm.resource}</td>
                    <td className="px-6 py-4">{perm.action}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{perm.description}</td>
                    <td className="px-6 py-4 text-right space-x-2 flex justify-end">
                      {hasPermission('permissions:edit') && (
                        <Button size="sm" variant="secondary" onClick={() => { setFormData({ permission_code: perm.permission_code, resource: perm.resource, action: perm.action, description: perm.description || '' }); setEditingId(perm.id); setIsModalOpen(true); }}>
                          {t('common.edit')}
                        </Button>
                      )}
                      {hasPermission('permissions:delete') && (
                        <Button size="sm" variant="danger" onClick={() => setDeleteId(perm.id)}>
                          {t('common.delete')}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isModalOpen && (
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? t('common.edit') : t('common.create')}>
          <div className="space-y-4">
            <Input label={t('master.permissions.fields.code')} value={formData.permission_code} onChange={(e) => setFormData({ ...formData, permission_code: e.target.value })} error={errors.permission_code} placeholder="resource:action" />
            <Input label={t('master.permissions.fields.resource')} value={formData.resource} onChange={(e) => setFormData({ ...formData, resource: e.target.value })} error={errors.resource} />
            <Input label={t('master.permissions.fields.action')} value={formData.action} onChange={(e) => setFormData({ ...formData, action: e.target.value })} error={errors.action} />
            <div>
              <label className="block text-sm font-medium mb-1">{t('master.permissions.fields.description')}</label>
              <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700" rows={3} />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>{t('common.cancel')}</Button>
              <Button onClick={handleSubmit} className="bg-blue-600 text-white">{t('common.save')}</Button>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmDialog isOpen={!!deleteId} title={t('common.confirmDelete')} message={t('master.permissions.messages.deleteConfirm')} onConfirm={handleDelete} onClose={() => setDeleteId(null)} variant="danger" />
    </MainLayout>
  );
}
