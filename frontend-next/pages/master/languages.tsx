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

interface Language {
  id: number;
  code: string;
  name: string;
  native_name: string;
  direction: 'ltr' | 'rtl';
  status: 'active' | 'inactive';
  created_at: string;
}

export default function LanguagesPage() {
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  const { t } = useTranslation();

  const [languages, setLanguages] = useState<Language[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    native_name: '',
    direction: 'ltr' as 'ltr' | 'rtl',
    status: 'active' as 'active' | 'inactive',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchLanguages();
  }, []);

  const fetchLanguages = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://localhost:4000/api/master/languages', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setLanguages(data.data || []);
      }
    } catch (error) {
      showToast(t('messages.error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.code?.trim()) newErrors.code = t('master.languages.validation.required');
    else if (!/^[a-z]{2}(-[A-Z]{2})?$/.test(formData.code)) newErrors.code = t('master.languages.validation.invalidCode');
    
    if (!formData.name?.trim()) newErrors.name = t('master.languages.validation.required');
    if (!formData.native_name?.trim()) newErrors.native_name = t('master.languages.validation.required');
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      const token = localStorage.getItem('accessToken');
      const url = editingId
        ? `http://localhost:4000/api/master/languages/${editingId}`
        : 'http://localhost:4000/api/master/languages';

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
          setLanguages(languages.map((l) => (l.id === editingId ? result.data : l)));
          showToast(t('master.languages.messages.updated'), 'success');
        } else {
          setLanguages([...languages, result.data]);
          showToast(t('master.languages.messages.created'), 'success');
        }
        setIsModalOpen(false);
        setEditingId(null);
        setFormData({ code: '', name: '', native_name: '', direction: 'ltr', status: 'active' });
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
      const response = await fetch(`http://localhost:4000/api/master/languages/${deleteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setLanguages(languages.filter((l) => l.id !== deleteId));
        showToast(t('master.languages.messages.deleted'), 'success');
        setDeleteId(null);
      } else {
        showToast(t('messages.error'), 'error');
      }
    } catch (error) {
      showToast(t('messages.error'), 'error');
    }
  };

  if (!hasPermission('languages:view')) {
    return <MainLayout><div className="p-6 text-red-600">{t('messages.accessDenied')}</div></MainLayout>;
  }

  const filteredLanguages = languages.filter((l) =>
    l.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <MainLayout>
      <Head><title>{t('master.languages.title')} - SLMS</title></Head>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">{t('master.languages.title')}</h1>
          {hasPermission('languages:create') && (
            <Button
              onClick={() => {
                setEditingId(null);
                setFormData({ code: '', name: '', native_name: '', direction: 'ltr', status: 'active' });
                setIsModalOpen(true);
              }}
              className="bg-blue-600 text-white"
            >
              {t('master.languages.buttons.create')}
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
          ) : filteredLanguages.length === 0 ? (
            <div className="p-6 text-center text-gray-500">{t('common.noData')}</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-700 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold">{t('master.languages.columns.code')}</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">{t('master.languages.columns.name')}</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">{t('master.languages.columns.nativeName')}</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">{t('master.languages.columns.direction')}</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">{t('master.languages.columns.status')}</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredLanguages.map((lang) => (
                  <tr key={lang.id} className="border-b hover:bg-gray-50 dark:hover:bg-slate-700">
                    <td className="px-6 py-4 font-mono">{lang.code}</td>
                    <td className="px-6 py-4">{lang.name}</td>
                    <td className="px-6 py-4">{lang.native_name}</td>
                    <td className="px-6 py-4">{lang.direction === 'rtl' ? 'RTL' : 'LTR'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs ${lang.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {lang.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2 flex justify-end">
                      {hasPermission('languages:edit') && (
                        <Button size="sm" variant="secondary" onClick={() => { setFormData({ code: lang.code, name: lang.name, native_name: lang.native_name, direction: lang.direction, status: lang.status }); setEditingId(lang.id); setIsModalOpen(true); }}>
                          {t('common.edit')}
                        </Button>
                      )}
                      {hasPermission('languages:delete') && (
                        <Button size="sm" variant="danger" onClick={() => setDeleteId(lang.id)}>
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
            <Input label={t('master.languages.fields.code')} value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} error={errors.code} placeholder="en, ar, fr, etc" disabled={!!editingId} />
            <Input label={t('master.languages.fields.name')} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} error={errors.name} />
            <Input label={t('master.languages.fields.nativeName')} value={formData.native_name} onChange={(e) => setFormData({ ...formData, native_name: e.target.value })} error={errors.native_name} />
            <div>
              <label className="block text-sm font-medium mb-2">{t('master.languages.fields.direction')}</label>
              <select value={formData.direction} onChange={(e) => setFormData({ ...formData, direction: e.target.value as 'ltr' | 'rtl' })} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700">
                <option value="ltr">LTR (Left to Right)</option>
                <option value="rtl">RTL (Right to Left)</option>
              </select>
            </div>
            <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700">
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

      <ConfirmDialog isOpen={!!deleteId} title={t('common.confirmDelete')} message={t('master.languages.messages.deleteConfirm')} onConfirm={handleDelete} onClose={() => setDeleteId(null)} variant="danger" />
    </MainLayout>
  );
}
