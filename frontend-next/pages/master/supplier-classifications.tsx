import { useEffect, useState, useRef, useMemo } from 'react';
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
import { useCompany } from '../../hooks/useCompany';
import apiClient from '../../lib/apiClient';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  TruckIcon,
  MagnifyingGlassIcon,
  BuildingStorefrontIcon,
  GlobeAltIcon,
  StarIcon,
  CubeIcon,
} from '@heroicons/react/24/outline';

interface SupplierClassification {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  classification_type: 'size' | 'category' | 'region' | 'priority' | 'performance';
  payment_terms_default?: number;
  lead_time_default?: number;
  rating?: number;
  color?: string;
  supplier_count?: number;
  is_active: boolean;
  description?: string;
  created_at: string;
}

interface FormData {
  code: string;
  name: string;
  name_ar: string;
  classification_type: string;
  payment_terms_default: number;
  lead_time_default: number;
  rating: number;
  color: string;
  description: string;
  is_active: boolean;
}

const initialFormData: FormData = {
  code: '',
  name: '',
  name_ar: '',
  classification_type: 'category',
  payment_terms_default: 30,
  lead_time_default: 7,
  rating: 0,
  color: 'blue',
  description: '',
  is_active: true,
};

const CLASSIFICATION_TYPES = [
  { value: 'size', label: 'Supplier Size', labelAr: 'حجم المورد', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', icon: BuildingStorefrontIcon },
  { value: 'category', label: 'Product Category', labelAr: 'فئة المنتج', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: CubeIcon },
  { value: 'region', label: 'Geographic Region', labelAr: 'المنطقة الجغرافية', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400', icon: GlobeAltIcon },
  { value: 'priority', label: 'Priority Level', labelAr: 'مستوى الأولوية', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: StarIcon },
  { value: 'performance', label: 'Performance Rating', labelAr: 'تصنيف الأداء', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400', icon: StarIcon },
];

const BADGE_COLORS = [
  { value: 'blue', label: 'Blue', class: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'green', label: 'Green', class: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
  { value: 'yellow', label: 'Yellow', class: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  { value: 'red', label: 'Red', class: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
];

function SupplierClassificationsPage() {
  const { hasPermission } = usePermissions();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { activeCompanyId, loading: companyLoading } = useCompany();
  const hasFetched = useRef(false);

  const [items, setItems] = useState<SupplierClassification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<SupplierClassification | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (companyLoading) return;
    if (!activeCompanyId) {
      setItems([]);
      setLoading(false);
      return;
    }
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchItems();
    }
  }, [activeCompanyId, companyLoading]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<{ success: boolean; data: SupplierClassification[] }>(
        '/api/reference-data/vendor_classifications'
      );
      setItems(Array.isArray(res?.data) ? res.data : []);
    } catch (error) {
      console.error('Failed to fetch supplier classifications:', error);
      showToast('Failed to load classifications', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        !searchTerm ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.name_ar?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = !filterType || item.classification_type === filterType;
      return matchesSearch && matchesType;
    });
  }, [items, searchTerm, filterType]);

  const resetForm = () => {
    setFormData(initialFormData);
    setErrors({});
    setEditingItem(null);
  };

  const openEdit = (item: SupplierClassification) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      name_ar: item.name_ar || '',
      classification_type: item.classification_type,
      payment_terms_default: item.payment_terms_default || 30,
      lead_time_default: item.lead_time_default || 7,
      rating: item.rating || 0,
      color: item.color || 'blue',
      description: item.description || '',
      is_active: item.is_active,
    });
    setShowModal(true);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.code.trim()) newErrors.code = 'Code is required';
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const payload = {
        code: formData.code.toUpperCase(),
        name_en: formData.name,
        name_ar: formData.name_ar || null,
        description_en: formData.description || null,
        is_active: formData.is_active,
      };

      if (editingItem) {
        await apiClient.put(`/api/reference-data/vendor_classifications/${editingItem.id}`, payload);
        showToast('Classification updated successfully', 'success');
      } else {
        await apiClient.post('/api/reference-data/vendor_classifications', payload);
        showToast('Classification created successfully', 'success');
      }

      setShowModal(false);
      resetForm();
      fetchItems();
    } catch (error: any) {
      showToast(error?.message || 'Failed to save', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/api/reference-data/vendor_classifications/${deletingId}`);
      showToast('Classification deleted successfully', 'success');
      setConfirmOpen(false);
      setDeletingId(null);
      fetchItems();
    } catch (error: any) {
      showToast(error?.message || 'Failed to delete', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const getColorClass = (color?: string) => {
    return BADGE_COLORS.find((c) => c.value === color)?.class || BADGE_COLORS[0].class;
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <StarIcon
            key={star}
            className={`w-4 h-4 ${star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
          />
        ))}
      </div>
    );
  };

  return (
    <MainLayout>
      <Head>
        <title>{t('supplierClassifications.title', 'Supplier Classifications')} - SLMS</title>
      </Head>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t('supplierClassifications.title', 'Supplier Classifications')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t('supplierClassifications.subtitle', 'Manage vendor classification categories')}
            </p>
          </div>
          {hasPermission('master:suppliers:create') && (
            <Button onClick={() => { resetForm(); setShowModal(true); }}>
              <PlusIcon className="w-5 h-5 mr-2" />
              {t('common.add')}
            </Button>
          )}
        </div>

        <Card>
          <div className="p-4 border-b dark:border-gray-700 flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={t('common.search', 'Search...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10 w-full"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="input w-full md:w-48"
            >
              <option value="">{t('common.allTypes', 'All Types')}</option>
              {CLASSIFICATION_TYPES.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-4">{t('common.loading', 'Loading...')}</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-8 text-center">
              <TruckIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">{t('common.noData', 'No data')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.code')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.name')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.type')}</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.status')}</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getColorClass(item.color)}`}>
                          {item.code}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</p>
                          {item.name_ar && <p className="text-xs text-gray-500 dark:text-gray-400">{item.name_ar}</p>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${CLASSIFICATION_TYPES.find(c => c.value === item.classification_type)?.color}`}>
                          {CLASSIFICATION_TYPES.find(c => c.value === item.classification_type)?.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${item.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400'}`}>
                          {item.is_active ? t('common.active') : t('common.inactive')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {hasPermission('master:suppliers:update') && (
                            <button onClick={() => openEdit(item)} className="p-1 text-blue-600 hover:bg-blue-50 rounded dark:hover:bg-blue-900/20">
                              <PencilIcon className="w-4 h-4" />
                            </button>
                          )}
                          {hasPermission('master:suppliers:delete') && (
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
            </div>
          )}
        </Card>

        {/* Modal */}
        <Modal
          isOpen={showModal}
          onClose={() => { setShowModal(false); resetForm(); }}
          title={editingItem ? t('supplierClassifications.edit', 'Edit Classification') : t('supplierClassifications.create', 'Create Classification')}
          size="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label={t('common.code')}
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                error={errors.code}
                required
                placeholder="e.g., STRAT"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('common.type')} <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.classification_type}
                  onChange={(e) => setFormData({ ...formData, classification_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                >
                  {CLASSIFICATION_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label={t('common.name')}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                error={errors.name}
                required
              />
              <Input
                label={t('common.nameAr')}
                value={formData.name_ar}
                onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('supplierClassifications.badgeColor', 'Badge Color')}
              </label>
              <div className="flex flex-wrap gap-2">
                {BADGE_COLORS.map(color => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: color.value })}
                    className={`px-4 py-2 text-sm rounded-lg ${color.class} ${formData.color === color.value ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}
                  >
                    {color.label}
                  </button>
                ))}
              </div>
            </div>
            <Input
              label={t('common.description')}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
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
      </div>
    </MainLayout>
  );
}

export default withPermission(MenuPermissions.Master.View, SupplierClassificationsPage);
