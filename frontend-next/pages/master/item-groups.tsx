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
  FolderIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';

interface ItemGroup {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  description?: string;
  parent_group_id?: number | null;
  parent_name?: string;
  category_id?: number | null;
  category_name?: string;
  category_name_ar?: string;
  group_type: 'main' | 'sub';
  item_count: number;
  item_count_total?: number;
  is_active: boolean;
  created_at: string;
}

interface ItemCategory {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
}

const GROUP_TYPES = [
  { value: 'main', label: 'Main Group', labelAr: 'مجموعة رئيسية' },
  { value: 'sub', label: 'Sub Group', labelAr: 'مجموعة فرعية' },
];

function ItemGroupsPage() {
  const { hasPermission } = usePermissions();
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const warnedMissingCompany = useRef(false);

  const [activeCompanyId, setActiveCompanyId] = useState<number | null>(companyStore.getActiveCompanyId());

  const [items, setItems] = useState<ItemGroup[]>([]);
  const [mainGroups, setMainGroups] = useState<ItemGroup[]>([]);
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemGroup | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    name_ar: '',
    description: '',
    parent_id: null as number | null,
    category_id: null as number | null,
    group_type: 'main' as 'main' | 'sub',
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
  }, [activeCompanyId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setItems([]);
        setMainGroups([]);
        setCategories([]);
        return;
      }

      if (!activeCompanyId) {
        setItems([]);
        setMainGroups([]);
        setCategories([]);
        if (!warnedMissingCompany.current) {
          warnedMissingCompany.current = true;
          showToast(t('common.selectCompany', 'Please select a company'), 'warning');
        }
        return;
      }

      warnedMissingCompany.current = false;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const [groupsRes, categoriesRes] = await Promise.all([
        fetch(`${apiUrl}/api/master/item-groups`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Company-Id': String(activeCompanyId),
          },
        }),
        fetch(`${apiUrl}/api/master/item-categories`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Company-Id': String(activeCompanyId),
          },
        }),
      ]);

      if (!groupsRes.ok) throw new Error('Failed to fetch item groups');
      const groupsData = await groupsRes.json();
      const list = Array.isArray(groupsData) ? groupsData : groupsData.data || [];
      setItems(list);
      setMainGroups(list.filter((g: ItemGroup) => g.group_type === 'main'));

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        const categoriesList = Array.isArray(categoriesData) ? categoriesData : categoriesData.data || [];
        setCategories(categoriesList);
      } else {
        setCategories([]);
      }
    } catch (err: any) {
      showToast(err?.message || t('common.error'), 'error');
      setItems([]);
      setMainGroups([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.code.trim()) newErrors.code = t('validation.required');
    if (!formData.name.trim()) newErrors.name = t('validation.required');
    if (!formData.category_id) newErrors.category_id = t('validation.required');
    if (formData.group_type === 'sub' && !formData.parent_id) {
      newErrors.parent_id = t('validation.parentRequired', 'Parent group is required for sub groups');
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
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      if (!token) throw new Error('Not authenticated');
      const url = editingItem 
        ? `${apiUrl}/api/master/item-groups/${editingItem.id}`
        : `${apiUrl}/api/master/item-groups`;
      
      const res = await fetch(url, {
        method: editingItem ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...(companyId ? { 'X-Company-Id': String(companyId) } : {}),
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        showToast(t('common.success'), 'success');
        fetchData();
        setShowModal(false);
        resetForm();
      } else {
        throw new Error('Failed to save');
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
      const companyId = companyStore.getActiveCompanyId();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${apiUrl}/api/master/item-groups/${deletingId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          ...(companyId ? { 'X-Company-Id': String(companyId) } : {}),
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
    setFormData({ code: '', name: '', name_ar: '', description: '', parent_id: null, category_id: null, group_type: 'main', is_active: true });
    setErrors({});
  };

  const openEdit = (item: ItemGroup) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      name_ar: item.name_ar || '',
      description: item.description || '',
      parent_id: item.parent_group_id || null,
      category_id: item.category_id || null,
      group_type: item.group_type,
      is_active: item.is_active,
    });
    setShowModal(true);
  };

  const filteredItems = items.filter(item => {
    const matchSearch = !searchTerm || 
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = !filterType || item.group_type === filterType;
    return matchSearch && matchType;
  });

  return (
    <MainLayout>
      <Head>
        <title>{t('itemGroups.title', 'Item Groups')} - SLMS</title>
      </Head>

      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('itemGroups.title', 'Item Groups')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t('itemGroups.subtitle', 'Manage item groups and sub-groups')}
            </p>
          </div>
          <div className="flex gap-2">
            {hasPermission('master:items:create') && (
              <Button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-2">
                <PlusIcon className="w-5 h-5" />
                {t('common.add')}
              </Button>
            )}
            <Button variant="secondary" className="flex items-center gap-2">
              <ArrowDownTrayIcon className="w-5 h-5" />
              {t('common.export')}
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FolderIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('itemGroups.totalGroups', 'Total Groups')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{items.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <FolderIcon className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('itemGroups.mainGroups', 'Main Groups')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{mainGroups.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <FolderIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('itemGroups.subGroups', 'Sub Groups')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{items.length - mainGroups.length}</p>
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
            <option value="">{t('common.allTypes', 'All Types')}</option>
            {GROUP_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
          <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
            {t('common.showing')}: {filteredItems.length} {t('common.of')} {items.length}
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
              <FolderIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">{t('common.noData')}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.code')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.name')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.category', 'Category')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('itemGroups.type', 'Type')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('itemGroups.parent', 'Parent')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('itemGroups.itemCount', 'Items')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.status')}</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                    <td className="px-6 py-4 font-mono text-sm text-gray-900 dark:text-white">{item.code}</td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</p>
                        {item.name_ar && <p className="text-xs text-gray-500 dark:text-gray-400">{item.name_ar}</p>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm text-gray-900 dark:text-white">
                          {locale === 'ar'
                            ? (item.category_name_ar && item.category_name_ar.trim()) || item.category_name || '-'
                            : item.category_name || (item.category_name_ar && item.category_name_ar.trim()) || '-'}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        item.group_type === 'main' 
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                      }`}>
                        {GROUP_TYPES.find(t => t.value === item.group_type)?.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{item.parent_name || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {item.group_type === 'main' ? (item.item_count_total ?? item.item_count) : item.item_count}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        item.is_active 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {item.is_active ? t('common.active') : t('common.inactive')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {hasPermission('master:items:update') && (
                          <button onClick={() => openEdit(item)} className="p-1 text-blue-600 hover:bg-blue-50 rounded dark:hover:bg-blue-900/20">
                            <PencilIcon className="w-4 h-4" />
                          </button>
                        )}
                        {hasPermission('master:items:delete') && (
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
        title={editingItem ? t('itemGroups.edit') : t('itemGroups.create')}
        size="md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('common.code')}
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              error={errors.code}
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('itemGroups.type')} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.group_type}
                onChange={(e) => {
                  const nextType = e.target.value as 'main' | 'sub';
                  if (nextType === 'main') {
                    setFormData({ ...formData, group_type: 'main', parent_id: null });
                    return;
                  }

                  const parent = formData.parent_id ? mainGroups.find((g) => g.id === formData.parent_id) : undefined;
                  setFormData({
                    ...formData,
                    group_type: 'sub',
                    category_id: parent?.category_id ?? null,
                  });
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                {GROUP_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
          </div>
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
          {formData.group_type === 'sub' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('itemGroups.parent')} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.parent_id || ''}
                onChange={(e) => {
                  const nextParentId = e.target.value ? Number(e.target.value) : null;
                  const parent = nextParentId ? mainGroups.find((g) => g.id === nextParentId) : undefined;
                  setFormData({
                    ...formData,
                    parent_id: nextParentId,
                    category_id: parent?.category_id ?? null,
                  });
                }}
                className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${errors.parent_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
              >
                <option value="">{t('common.select')}</option>
                {mainGroups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
              {errors.parent_id && <p className="text-sm text-red-500 mt-1">{errors.parent_id}</p>}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('common.category', 'Category')} <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.category_id || ''}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value ? Number(e.target.value) : null })}
              disabled={formData.group_type === 'sub'}
              className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${errors.category_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
            >
              <option value="">{t('common.select')}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {locale === 'ar' ? (c.name_ar || c.name) : c.name}
                </option>
              ))}
            </select>
            {errors.category_id && <p className="text-sm text-red-500 mt-1">{errors.category_id}</p>}
          </div>
          <Input
            label={t('common.description')}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-gray-300">{t('common.active')}</label>
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

export default withPermission(MenuPermissions.Master.View, ItemGroupsPage);
