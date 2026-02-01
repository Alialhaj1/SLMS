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
import { companyStore } from '../../lib/companyStore';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  UserGroupIcon,
  MagnifyingGlassIcon,
  BuildingOfficeIcon,
  UserIcon,
  GlobeAltIcon,
  StarIcon,
} from '@heroicons/react/24/outline';

interface CustomerClassification {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  classification_type: 'size' | 'industry' | 'region' | 'priority' | 'custom';
  parent_id?: number;
  parent_name?: string;
  credit_limit_default?: number;
  payment_terms_default?: number;
  discount_percentage?: number;
  color?: string;
  customer_count?: number;
  is_active: boolean;
  description?: string;
  created_at: string;
}

const CLASSIFICATION_TYPES = [
  { value: 'size', label: 'Business Size', labelAr: 'حجم الأعمال', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', icon: BuildingOfficeIcon },
  { value: 'industry', label: 'Industry', labelAr: 'الصناعة', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: BuildingOfficeIcon },
  { value: 'region', label: 'Geographic Region', labelAr: 'المنطقة الجغرافية', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400', icon: GlobeAltIcon },
  { value: 'priority', label: 'Priority Level', labelAr: 'مستوى الأولوية', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: StarIcon },
  { value: 'custom', label: 'Custom', labelAr: 'مخصص', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400', icon: UserIcon },
];

const BADGE_COLORS = [
  { value: 'blue', label: 'Blue', class: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'green', label: 'Green', class: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
  { value: 'yellow', label: 'Yellow', class: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  { value: 'red', label: 'Red', class: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
];

function CustomerClassificationsPage() {
  const { hasAnyPermission } = usePermissions();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const hasFetched = useRef(false);

  const canCreate = hasAnyPermission([
    'master:customer_classifications:manage',
    'master:customer_classifications:create',
    'customer_classifications:manage',
    'customer_classifications:create',
    // compatibility (existing roles)
    'master:customers:create',
  ]);

  const canEdit = hasAnyPermission([
    'master:customer_classifications:manage',
    'master:customer_classifications:edit',
    'customer_classifications:manage',
    'customer_classifications:edit',
    // compatibility (existing roles)
    'master:customers:edit',
  ]);

  const canDelete = hasAnyPermission([
    'master:customer_classifications:manage',
    'master:customer_classifications:delete',
    'customer_classifications:manage',
    'customer_classifications:delete',
    // compatibility (existing roles)
    'master:customers:delete',
  ]);

  const [items, setItems] = useState<CustomerClassification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<CustomerClassification | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    name_ar: '',
    classification_type: 'size' as CustomerClassification['classification_type'],
    parent_id: 0,
    credit_limit_default: 0,
    payment_terms_default: 30,
    discount_percentage: 0,
    color: 'blue',
    is_active: true,
    description: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchData();
    }
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const companyId = companyStore.getActiveCompanyId();
      if (!companyId) {
        showToast('Please select an active company first', 'error');
        setItems([]);
        return;
      }
      const res = await fetch('http://localhost:4000/api/customer-classifications', {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Company-Id': String(companyId),
        }
      });
      if (res.ok) {
        const result = await res.json();
        setItems(Array.isArray(result) ? result : result.data || []);
      } else if (res.status === 401 || res.status === 403) {
        showToast('Access denied', 'error');
        setItems([]);
      } else if (res.status === 400) {
        showToast('Please select an active company first', 'error');
        setItems([]);
      } else {
        showToast(t('common.fetchError'), 'error');
        setItems([]);
      }
    } catch {
      showToast(t('common.fetchError'), 'error');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.code.trim()) newErrors.code = t('validation.required');
    if (!formData.name.trim()) newErrors.name = t('validation.required');
    if (formData.discount_percentage < 0 || formData.discount_percentage > 100) {
      newErrors.discount_percentage = t('validation.invalidPercentage');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const companyId = companyStore.getActiveCompanyId();
      if (!companyId) {
        showToast('Please select an active company first', 'error');
        return;
      }
      const url = editingItem 
        ? `http://localhost:4000/api/customer-classifications/${editingItem.id}`
        : 'http://localhost:4000/api/customer-classifications';
      
      const res = await fetch(url, {
        method: editingItem ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-Company-Id': String(companyId),
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        showToast(editingItem ? t('common.updateSuccess') : t('common.createSuccess'), 'success');
        fetchData();
        setShowModal(false);
        resetForm();
      } else {
        if (res.status === 401 || res.status === 403) {
          showToast('Access denied', 'error');
        } else if (res.status === 400) {
          showToast(t('common.failed'), 'error');
        } else {
          showToast(t('common.error'), 'error');
        }
      }
    } catch {
      showToast(t('common.error'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const companyId = companyStore.getActiveCompanyId();
      if (!companyId) {
        showToast('Please select an active company first', 'error');
        return;
      }

      const res = await fetch(`http://localhost:4000/api/customer-classifications/${deletingId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Company-Id': String(companyId),
        },
      });
      if (res.ok) {
        setItems(items.filter(i => i.id !== deletingId));
        showToast(t('common.deleteSuccess'), 'success');
      } else if (res.status === 401 || res.status === 403) {
        showToast('Access denied', 'error');
      } else {
        showToast(t('common.error'), 'error');
      }
    } catch {
      showToast(t('common.error'), 'error');
    } finally {
      setIsDeleting(false);
      setConfirmOpen(false);
      setDeletingId(null);
    }
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormData({ code: '', name: '', name_ar: '', classification_type: 'size', parent_id: 0, credit_limit_default: 0, payment_terms_default: 30, discount_percentage: 0, color: 'blue', is_active: true, description: '' });
    setErrors({});
  };

  const openEdit = (item: CustomerClassification) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      name_ar: item.name_ar || '',
      classification_type: item.classification_type,
      parent_id: item.parent_id || 0,
      credit_limit_default: item.credit_limit_default || 0,
      payment_terms_default: item.payment_terms_default || 30,
      discount_percentage: item.discount_percentage || 0,
      color: item.color || 'blue',
      is_active: item.is_active,
      description: item.description || '',
    });
    setShowModal(true);
  };

  const getColorClass = (colorName?: string) => {
    return BADGE_COLORS.find(c => c.value === colorName)?.class || BADGE_COLORS[0].class;
  };

  const filteredItems = items.filter(item => {
    const matchSearch = !searchTerm || 
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name_ar?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = !filterType || item.classification_type === filterType;
    return matchSearch && matchType;
  });

  const totalCustomers = items.reduce((sum, i) => sum + (i.customer_count || 0), 0);

  return (
    <MainLayout>
      <Head>
        <title>{t('customerClassifications.title')} - SLMS</title>
      </Head>

      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('customerClassifications.title')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t('customerClassifications.subtitle')}
            </p>
          </div>
          {canCreate && (
            <Button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-2">
              <PlusIcon className="w-5 h-5" />
              {t('customerClassifications.new')}
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
              <UserGroupIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('common.total')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{items.length}</p>
            </div>
          </div>
        </Card>
        {CLASSIFICATION_TYPES.slice(0, 4).map(type => {
          const Icon = type.icon;
          return (
            <Card key={type.value} className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${type.color.split(' ')[0]}`}>
                  <Icon className={`w-6 h-6 ${type.color.split(' ')[1]}`} />
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{type.label}</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {items.filter(i => i.classification_type === type.value).length}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <UserIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">{t('common.customers')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{totalCustomers}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">{t('common.allTypes')}</option>
            {CLASSIFICATION_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
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
              <UserGroupIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">{t('common.noData')}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.code')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.name')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.type')}</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('customerClassifications.creditLimit')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('customerClassifications.paymentTerms')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('customerClassifications.discount')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.customers')}</th>
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
                    <td className="px-6 py-4 text-right font-mono text-sm text-gray-900 dark:text-white">
                      {item.credit_limit_default ? item.credit_limit_default.toLocaleString() : '-'}
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-600 dark:text-gray-400">
                      {item.payment_terms_default || '-'} {t('common.days')}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {item.discount_percentage ? (
                        <span className="font-semibold text-green-600 dark:text-green-400">
                          {item.discount_percentage}%
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 rounded-full">
                        {item.customer_count || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${item.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400'}`}>
                        {item.is_active ? t('common.active') : t('common.inactive')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {canEdit && (
                          <button onClick={() => openEdit(item)} className="p-1 text-blue-600 hover:bg-blue-50 rounded dark:hover:bg-blue-900/20">
                            <PencilIcon className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
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
        title={editingItem ? t('customerClassifications.edit') : t('customerClassifications.create')}
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
              placeholder="e.g., ENT"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('common.type')} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.classification_type}
                onChange={(e) => setFormData({ ...formData, classification_type: e.target.value as any })}
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
          <div className="grid grid-cols-3 gap-4">
            <Input
              label={t('customerClassifications.creditLimit')}
              type="number"
              value={formData.credit_limit_default}
              onChange={(e) => setFormData({ ...formData, credit_limit_default: Number(e.target.value) })}
            />
            <Input
              label={t('customerClassifications.paymentTerms')}
              type="number"
              value={formData.payment_terms_default}
              onChange={(e) => setFormData({ ...formData, payment_terms_default: Number(e.target.value) })}
            />
            <Input
              label={t('customerClassifications.discount')}
              type="number"
              min="0"
              max="100"
              value={formData.discount_percentage}
              onChange={(e) => setFormData({ ...formData, discount_percentage: Number(e.target.value) })}
              error={errors.discount_percentage}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('customerClassifications.badgeColor')}
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
    </MainLayout>
  );
}

export default withPermission(MenuPermissions.Master.View, CustomerClassificationsPage);
