import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/contexts/ToastContext';
import { useTranslation } from '@/hooks/useTranslation';

interface Branch {
  id: number;
  name: string;
  name_ar?: string;
  code: string;
  company_id: number;
  company_name?: string;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  manager_name?: string;
  is_active: boolean;
  is_headquarters: boolean;
  created_at: string;
  updated_at?: string;
}

export default function BranchesPage() {
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  const { t } = useTranslation();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    name_ar: '',
    code: '',
    company_id: 0,
    address: '',
    city: '',
    country: '',
    phone: '',
    email: '',
    manager_name: '',
    is_headquarters: false,
    is_active: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://localhost:4000/api/branches', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setBranches(Array.isArray(data?.data) ? data.data : []);
      } else {
        const body = await response.json().catch(() => null);
        showToast(body?.error || t('messages.error'), 'error');
      }
    } catch (error) {
      showToast(t('messages.error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name?.trim()) newErrors.name = t('master.branches.validation.required');
    if (!formData.code?.trim()) newErrors.code = t('master.branches.validation.required');
    if (!formData.company_id || formData.company_id <= 0) newErrors.company_id = t('validation.required');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      const token = localStorage.getItem('accessToken');
      const url = editingId
        ? `http://localhost:4000/api/branches/${editingId}`
        : 'http://localhost:4000/api/branches';

      const payload = editingId
        ? {
            code: formData.code,
            name: formData.name,
            name_ar: formData.name_ar || undefined,
            country: formData.country || undefined,
            city: formData.city || undefined,
            address: formData.address || undefined,
            phone: formData.phone || undefined,
            email: formData.email || undefined,
            manager_name: formData.manager_name || undefined,
            is_active: formData.is_active,
            is_headquarters: formData.is_headquarters,
          }
        : {
            company_id: formData.company_id,
            code: formData.code,
            name: formData.name,
            name_ar: formData.name_ar || undefined,
            country: formData.country || undefined,
            city: formData.city || undefined,
            address: formData.address || undefined,
            phone: formData.phone || undefined,
            email: formData.email || undefined,
            manager_name: formData.manager_name || undefined,
            is_active: formData.is_active,
            is_headquarters: formData.is_headquarters,
          };

      const response = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const result = await response.json();
        showToast(editingId ? t('master.branches.messages.updated') : t('master.branches.messages.created'), 'success');
        await fetchBranches();
        setIsModalOpen(false);
        setEditingId(null);
        setFormData({
          name: '',
          name_ar: '',
          code: '',
          company_id: 0,
          address: '',
          city: '',
          country: '',
          phone: '',
          email: '',
          manager_name: '',
          is_headquarters: false,
          is_active: true,
        });
      } else {
        const body = await response.json().catch(() => null);
        showToast(body?.error || t('messages.error'), 'error');
      }
    } catch (error) {
      showToast(t('messages.error'), 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`http://localhost:4000/api/branches/${deleteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        await fetchBranches();
        showToast(t('master.branches.messages.deleted'), 'success');
        setDeleteId(null);
      } else {
        const body = await response.json().catch(() => null);
        showToast(body?.error || t('messages.error'), 'error');
      }
    } catch (error) {
      showToast(t('messages.error'), 'error');
    }
  };

  if (!hasPermission('branches:view')) {
    return <MainLayout><div className="p-6 text-red-600">{t('messages.accessDenied')}</div></MainLayout>;
  }

  const filteredBranches = branches.filter((b) =>
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <MainLayout>
      <Head><title>{t('master.branches.title')} - SLMS</title></Head>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">{t('master.branches.title')}</h1>
          {hasPermission('branches:create') && (
            <Button
              onClick={() => {
                setEditingId(null);
                setFormData({
                  name: '',
                  name_ar: '',
                  code: '',
                  company_id: 0,
                  address: '',
                  city: '',
                  country: '',
                  phone: '',
                  email: '',
                  manager_name: '',
                  is_headquarters: false,
                  is_active: true,
                });
                setIsModalOpen(true);
              }}
              className="bg-blue-600 text-white"
            >
              {t('master.branches.buttons.create')}
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
          ) : filteredBranches.length === 0 ? (
            <div className="p-6 text-center text-gray-500">{t('common.noData')}</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-700 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold">{t('master.branches.columns.name')}</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">{t('master.branches.columns.code')}</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">{t('master.branches.columns.city')}</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">{t('master.branches.columns.status')}</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredBranches.map((branch) => (
                  <tr key={branch.id} className="border-b hover:bg-gray-50 dark:hover:bg-slate-700">
                    <td className="px-6 py-4">{branch.name}</td>
                    <td className="px-6 py-4">{branch.code}</td>
                    <td className="px-6 py-4">{branch.city}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs ${branch.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {branch.is_active ? t('common.active') : t('common.inactive')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2 flex justify-end">
                      {hasPermission('branches:edit') && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setFormData({
                              name: branch.name,
                              name_ar: branch.name_ar || '',
                              code: branch.code,
                              company_id: branch.company_id,
                              address: branch.address || '',
                              city: branch.city || '',
                              country: branch.country || '',
                              phone: branch.phone || '',
                              email: branch.email || '',
                              manager_name: branch.manager_name || '',
                              is_headquarters: branch.is_headquarters,
                              is_active: branch.is_active,
                            });
                            setEditingId(branch.id);
                            setIsModalOpen(true);
                          }}
                        >
                          {t('common.edit')}
                        </Button>
                      )}
                      {hasPermission('branches:delete') && (
                        <Button size="sm" variant="danger" onClick={() => setDeleteId(branch.id)}>
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
            <Input
              label={t('master.branches.fields.companyId') || 'Company ID'}
              value={String(formData.company_id || '')}
              onChange={(e) => setFormData({ ...formData, company_id: Number(e.target.value) })}
              error={errors.company_id}
              disabled={!!editingId}
            />
            <Input label={t('master.branches.fields.name')} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} error={errors.name} />
            <Input label={t('common.nameAr') || 'Name (Arabic)'} value={formData.name_ar} onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })} />
            <Input label={t('master.branches.fields.code')} value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} error={errors.code} />
            <Input label={t('master.branches.fields.city')} value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
            <select value={formData.is_active ? 'active' : 'inactive'} onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'active' })} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700">
              <option value="active">{t('common.active')}</option>
              <option value="inactive">{t('common.inactive')}</option>
            </select>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>{t('common.cancel')}</Button>
              <Button onClick={handleSubmit} className="bg-blue-600 text-white">{t('common.save')}</Button>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmDialog isOpen={!!deleteId} title={t('common.confirmDelete')} message={t('master.branches.messages.deleteConfirm')} onConfirm={handleDelete} onClose={() => setDeleteId(null)} variant="danger" />
    </MainLayout>
  );
}
