import { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '../../config/menu.permissions';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Card from '../../components/ui/Card';
import { usePermissions } from '../../hooks/usePermissions';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import { useLocale } from '../../contexts/LocaleContext';
import { companyStore } from '../../lib/companyStore';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ScaleIcon,
} from '@heroicons/react/24/outline';

/**
 * UnitType represents a measurement dimension (Weight, Length, Area, Count, Time, etc.)
 * Stored in reference_data table with type='unit_types'
 */
interface UnitType {
  id: number;
  code: string;
  name_en: string;
  name_ar: string;
  description_en?: string;
  description_ar?: string;
  is_active: boolean;
  created_at: string;
}

/**
 * Unit Types Management Page
 * Manages measurement dimensions: Weight, Length, Area, Volume, Count, Time, etc.
 * Uses reference_data API with type='unit_types'
 */
function UnitTypesPage() {
  const { hasPermission } = usePermissions();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { locale } = useLocale();
  const hasWarnedNoCompany = useRef(false);

  const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000')
    .replace(/\/$/, '')
    .replace(/\/api$/, '');

  const [activeCompanyId, setActiveCompanyId] = useState<number | null>(() => companyStore.getActiveCompanyId());
  const [items, setItems] = useState<UnitType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<UnitType | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    name_en: '',
    name_ar: '',
    description_en: '',
    description_ar: '',
    is_active: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const unsubscribe = companyStore.subscribe(() => {
      setActiveCompanyId(companyStore.getActiveCompanyId());
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompanyId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setItems([]);
        return;
      }

      if (!activeCompanyId) {
        setItems([]);
        if (!hasWarnedNoCompany.current) {
          hasWarnedNoCompany.current = true;
          showToast(t('common.selectCompany', 'Please select a company first'), 'warning');
        }
        return;
      }

      // Use reference_data API with type='unit_types'
      const res = await fetch(`${apiBaseUrl}/api/reference-data/unit_types?limit=100`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Company-Id': String(activeCompanyId),
        }
      });
      if (!res.ok) throw new Error('Failed to fetch unit types');
      const data = await res.json();
      setItems(Array.isArray(data) ? data : data.data || []);
    } catch (err: any) {
      showToast(err?.message || t('common.error'), 'error');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.code.trim()) newErrors.code = t('validation.required');
    if (!formData.name_en.trim()) newErrors.name_en = t('validation.required');
    if (!formData.name_ar.trim()) newErrors.name_ar = t('validation.required');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) throw new Error('No authentication token');
      if (!activeCompanyId) {
        showToast(t('common.selectCompany', 'Please select a company first'), 'warning');
        return;
      }
      
      const url = editingItem 
        ? `${apiBaseUrl}/api/reference-data/unit_types/${editingItem.id}`
        : `${apiBaseUrl}/api/reference-data/unit_types`;
      
      const res = await fetch(url, {
        method: editingItem ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-Company-Id': String(activeCompanyId),
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        showToast(t('common.success'), 'success');
        fetchData();
        setShowModal(false);
        resetForm();
      } else {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Failed to save');
      }
    } catch (err: any) {
      showToast(err?.message || t('common.error'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) throw new Error('No authentication token');
      if (!activeCompanyId) {
        showToast(t('common.selectCompany', 'Please select a company first'), 'warning');
        return;
      }
      const res = await fetch(`${apiBaseUrl}/api/reference-data/unit_types/${deletingId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Company-Id': String(activeCompanyId),
        },
      });
      if (!res.ok) throw new Error('Failed to delete');
      fetchData();
      showToast(t('common.deleted'), 'success');
    } catch (err: any) {
      showToast(err?.message || t('common.error'), 'error');
    } finally {
      setIsDeleting(false);
      setConfirmOpen(false);
      setDeletingId(null);
    }
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormData({ code: '', name_en: '', name_ar: '', description_en: '', description_ar: '', is_active: true });
    setErrors({});
  };

  const openEdit = (item: UnitType) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      name_en: item.name_en,
      name_ar: item.name_ar || '',
      description_en: item.description_en || '',
      description_ar: item.description_ar || '',
      is_active: item.is_active,
    });
    setShowModal(true);
  };

  const filteredItems = items.filter(item => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.code.toLowerCase().includes(term) ||
      item.name_en.toLowerCase().includes(term) ||
      item.name_ar?.toLowerCase().includes(term)
    );
  });

  return (
    <MainLayout>
      <Head>
        <title>{t('master.unitTypes.title', 'Unit Types')} - SLMS</title>
      </Head>

      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('master.unitTypes.title', 'Unit Types')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t('master.unitTypes.subtitle', 'Manage measurement types (Weight, Length, Area, Count, etc.)')}
            </p>
          </div>
          {hasPermission('master:reference_data:create') && (
            <Button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-2">
              <PlusIcon className="w-5 h-5" />
              {t('master.unitTypes.addNew', 'Add Unit Type')}
            </Button>
          )}
        </div>
      </div>

      {/* Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <ScaleIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('common.total')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{items.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <ScaleIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('common.active')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {items.filter(i => i.is_active).length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-900/30">
              <ScaleIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('common.inactive')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {items.filter(i => !i.is_active).length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={t('common.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
            {t('common.showing')}: {filteredItems.length}
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-8 text-center">
              <ScaleIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">{t('common.noData')}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.code')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.name')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.nameAr')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.description')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.status')}</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                    <td className="px-6 py-4 font-mono text-sm font-medium text-gray-900 dark:text-white">{item.code}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{item.name_en}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{item.name_ar}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
                      {locale === 'ar' ? item.description_ar : item.description_en}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${item.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400'}`}>
                        {item.is_active ? t('common.active') : t('common.inactive')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {hasPermission('master:reference_data:update') && (
                          <button onClick={() => openEdit(item)} className="p-1 text-blue-600 hover:bg-blue-50 rounded dark:hover:bg-blue-900/20">
                            <PencilIcon className="w-4 h-4" />
                          </button>
                        )}
                        {hasPermission('master:reference_data:delete') && (
                          <button onClick={() => { setDeletingId(item.id); setConfirmOpen(true); }} className="p-1 text-red-600 hover:bg-red-50 rounded dark:hover:bg-red-900/20">
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editingItem ? t('master.unitTypes.edit', 'Edit Unit Type') : t('master.unitTypes.create', 'Create Unit Type')}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label={t('common.code')}
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            error={errors.code}
            required
            placeholder="e.g., WEIGHT, LENGTH, COUNT"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('common.name')}
              value={formData.name_en}
              onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
              error={errors.name_en}
              required
              placeholder="e.g., Weight"
            />
            <Input
              label={t('common.nameAr')}
              value={formData.name_ar}
              onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
              error={errors.name_ar}
              required
              placeholder="e.g., وزن"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('common.descriptionEn', 'Description (EN)')}
              value={formData.description_en}
              onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
              placeholder="Description in English"
            />
            <Input
              label={t('common.descriptionAr', 'Description (AR)')}
              value={formData.description_ar}
              onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
              placeholder="الوصف بالعربية"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-gray-300">
              {t('common.active')}
            </label>
          </div>
          <div className="flex gap-3 pt-4">
            <Button onClick={handleSubmit} loading={isSubmitting} className="flex-1">{t('common.save')}</Button>
            <Button variant="secondary" onClick={() => { setShowModal(false); resetForm(); }} className="flex-1">{t('common.cancel')}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        title={t('common.confirmDelete')}
        message={t('common.deleteMessage')}
        confirmText={t('common.delete')}
        variant="danger"
        loading={isDeleting}
      />
    </MainLayout>
  );
}

export default withPermission(MenuPermissions.MasterData.Units.View, UnitTypesPage);
