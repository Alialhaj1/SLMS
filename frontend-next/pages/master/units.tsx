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
  CubeIcon,
  MagnifyingGlassIcon,
  ScaleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

/**
 * Unit represents an actual unit of measure (kg, meter, piece, dozen, etc.)
 * Stored in units_of_measure table via /api/unit-types endpoint
 */
interface Unit {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  unit_category: 'basic' | 'derived' | 'packaging';
  unit_type_code?: string;  // Reference to unit type (WEIGHT, LENGTH, etc.)
  base_unit_id?: number;
  base_unit_name?: string;
  conversion_factor?: number;
  symbol?: string;
  decimal_places: number;
  is_active: boolean;
  created_at: string;
}

interface UnitTypeRef {
  id: number;
  code: string;
  name_en: string;
  name_ar: string;
}

const UNIT_CATEGORIES = [
  { value: 'basic', label: 'Basic Unit', labelAr: 'وحدة أساسية', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'derived', label: 'Derived Unit', labelAr: 'وحدة مشتقة', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  { value: 'packaging', label: 'Packaging Unit', labelAr: 'وحدة تعبئة', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
];

/**
 * Units of Measure Management Page
 * Manages actual units: kg, meter, piece, dozen, box, etc.
 * Uses /api/unit-types endpoint (units_of_measure table)
 */
function UnitsPage() {
  const { hasPermission } = usePermissions();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { locale } = useLocale();
  const hasWarnedNoCompany = useRef(false);

  const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000')
    .replace(/\/$/, '')
    .replace(/\/api$/, '');

  const [activeCompanyId, setActiveCompanyId] = useState<number | null>(() => companyStore.getActiveCompanyId());
  const [items, setItems] = useState<Unit[]>([]);
  const [unitTypes, setUnitTypes] = useState<UnitTypeRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Unit | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    name_ar: '',
    unit_category: 'basic' as Unit['unit_category'],
    unit_type_code: '',
    base_unit_id: 0,
    conversion_factor: 1,
    symbol: '',
    decimal_places: 2,
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
    if (activeCompanyId) {
      fetchData();
      fetchUnitTypes();
    }
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

      const res = await fetch(`${apiBaseUrl}/api/unit-types`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Company-Id': String(activeCompanyId),
        }
      });
      if (!res.ok) throw new Error('Failed to fetch units');
      const data = await res.json();
      setItems(Array.isArray(data) ? data : data.data || []);
    } catch (err: any) {
      showToast(err?.message || t('common.error'), 'error');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnitTypes = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token || !activeCompanyId) return;

      const res = await fetch(`${apiBaseUrl}/api/reference-data/unit_types?limit=100&is_active=true`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Company-Id': String(activeCompanyId),
        }
      });
      if (res.ok) {
        const data = await res.json();
        setUnitTypes(Array.isArray(data) ? data : data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch unit types:', err);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.code.trim()) newErrors.code = t('validation.required');
    if (!formData.name.trim()) newErrors.name = t('validation.required');

    // Basic units should have a unit type (optional for existing units without it)
    // Only require unit_type_code for NEW basic units, not when editing existing ones
    if (formData.unit_category === 'basic' && !formData.unit_type_code && !editingItem) {
      newErrors.unit_type_code = t('validation.required');
    }

    // Derived/packaging units must have base unit and conversion factor
    if (formData.unit_category !== 'basic') {
      if (!formData.base_unit_id) {
        newErrors.base_unit_id = t('validation.required');
      }
      if (formData.conversion_factor <= 0) {
        newErrors.conversion_factor = t('validation.invalidNumber');
      }
      if (formData.conversion_factor === 1) {
        newErrors.conversion_factor = t('master.units.conversionMustNotBeOne', 'Conversion factor cannot be 1 for derived units');
      }
    }
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
        ? `${apiBaseUrl}/api/unit-types/${editingItem.id}`
        : `${apiBaseUrl}/api/unit-types`;

      // Map unit_type_code to measurement_type for API compatibility
      const payload = {
        ...formData,
        measurement_type: formData.unit_type_code, // Backend expects measurement_type
      };
      
      const res = await fetch(url, {
        method: editingItem ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-Company-Id': String(activeCompanyId),
        },
        body: JSON.stringify(payload),
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
      const res = await fetch(`${apiBaseUrl}/api/unit-types/${deletingId}`, {
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
    setFormData({
      code: '',
      name: '',
      name_ar: '',
      unit_category: 'basic',
      unit_type_code: '',
      base_unit_id: 0,
      conversion_factor: 1,
      symbol: '',
      decimal_places: 2,
      is_active: true,
    });
    setErrors({});
  };

  const normalizeCategory = (cat: any): 'basic' | 'derived' | 'packaging' => {
    if (!cat) return 'basic';
    const lower = String(cat).toLowerCase();
    if (lower === 'derived') return 'derived';
    if (lower === 'packaging') return 'packaging';
    return 'basic'; // default to basic for any other value
  };

  const openEdit = (item: Unit) => {
    setEditingItem(item);
    const category = normalizeCategory(item.unit_category);
    setFormData({
      code: item.code,
      name: item.name,
      name_ar: item.name_ar || '',
      unit_category: category,
      unit_type_code: item.unit_type_code || '',
      base_unit_id: item.base_unit_id || 0,
      conversion_factor: item.conversion_factor || 1,
      symbol: item.symbol || '',
      decimal_places: item.decimal_places ?? 2,
      is_active: item.is_active,
    });
    setShowModal(true);
  };

  const filteredItems = items.filter(item => {
    const matchSearch = !searchTerm || 
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name_ar?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = !filterCategory || item.unit_category === filterCategory;
    return matchSearch && matchCategory;
  });

  const basicUnits = items.filter(i => i.unit_category === 'basic' && i.is_active);

  const getUnitTypeName = (code?: string) => {
    if (!code) return '-';
    const ut = unitTypes.find(u => u.code === code);
    return ut ? (locale === 'ar' ? ut.name_ar : ut.name_en) : code;
  };

  return (
    <MainLayout>
      <Head>
        <title>{t('master.units.title', 'Units of Measure')} - SLMS</title>
      </Head>

      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('master.units.title', 'Units of Measure')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t('master.units.subtitle', 'Manage units (kg, meter, piece, dozen, etc.)')}
            </p>
          </div>
          {hasPermission('master:items:create') && (
            <Button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-2">
              <PlusIcon className="w-5 h-5" />
              {t('master.units.addNew', 'Add Unit')}
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <CubeIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('common.total')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{items.length}</p>
            </div>
          </div>
        </Card>
        {UNIT_CATEGORIES.map(cat => (
          <Card key={cat.value} className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${cat.color.split(' ')[0]}`}>
                {cat.value === 'basic' ? (
                  <ScaleIcon className={`w-6 h-6 ${cat.color.split(' ')[1]}`} />
                ) : cat.value === 'derived' ? (
                  <ArrowPathIcon className={`w-6 h-6 ${cat.color.split(' ')[1]}`} />
                ) : (
                  <CubeIcon className={`w-6 h-6 ${cat.color.split(' ')[1]}`} />
                )}
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {locale === 'ar' ? cat.labelAr : cat.label}
                </p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {items.filter(i => i.unit_category === cat.value).length}
                </p>
              </div>
            </div>
          </Card>
        ))}
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
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">{t('common.allCategories', 'All Categories')}</option>
            {UNIT_CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>
                {locale === 'ar' ? cat.labelAr : cat.label}
              </option>
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
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('master.units.category', 'Category')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('master.units.unitType', 'Unit Type')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('master.units.baseUnit', 'Base Unit')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('master.units.conversion', 'Conversion')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('master.units.symbol', 'Symbol')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.status')}</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                    <td className="px-6 py-4 font-mono text-sm font-medium text-gray-900 dark:text-white">{item.code}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{item.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{item.name_ar}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${UNIT_CATEGORIES.find(c => c.value === item.unit_category)?.color || 'bg-gray-100 text-gray-600'}`}>
                        {locale === 'ar' 
                          ? UNIT_CATEGORIES.find(c => c.value === item.unit_category)?.labelAr 
                          : UNIT_CATEGORIES.find(c => c.value === item.unit_category)?.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {getUnitTypeName(item.unit_type_code)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {item.base_unit_name || '-'}
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-white">
                      {item.unit_category === 'basic' ? '-' : `×${item.conversion_factor}`}
                    </td>
                    <td className="px-6 py-4 text-center font-mono text-sm text-gray-600 dark:text-gray-400">{item.symbol || '-'}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${item.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400'}`}>
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
        title={editingItem ? t('master.units.edit', 'Edit Unit') : t('master.units.create', 'Create Unit')}
        size="md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('common.code')}
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              error={errors.code}
              required
              placeholder="e.g., KG, PCS, MTR"
            />
            <Input
              label={t('master.units.symbol', 'Symbol')}
              value={formData.symbol}
              onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
              placeholder="e.g., kg, pcs, m"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('common.name')}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={errors.name}
              required
              placeholder="e.g., Kilogram, Piece, Meter"
            />
            <Input
              label={t('common.nameAr')}
              value={formData.name_ar}
              onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
              placeholder="e.g., كيلوجرام، قطعة، متر"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('master.units.category', 'Category')} <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.unit_category}
              onChange={(e) => {
                const nextCategory = e.target.value as Unit['unit_category'];
                setFormData(prev => ({
                  ...prev,
                  unit_category: nextCategory,
                  // Clear incompatible fields when switching category
                  unit_type_code: nextCategory === 'basic' ? prev.unit_type_code : '',
                  base_unit_id: nextCategory === 'basic' ? 0 : prev.base_unit_id,
                  conversion_factor: nextCategory === 'basic' ? 1 : prev.conversion_factor,
                }));
              }}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
            >
              {UNIT_CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {locale === 'ar' ? cat.labelAr : cat.label}
                </option>
              ))}
            </select>
          </div>

          {formData.unit_category === 'basic' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('master.units.unitType', 'Unit Type')} {!editingItem && <span className="text-red-500">*</span>}
              </label>
              <select
                value={formData.unit_type_code}
                onChange={(e) => setFormData({ ...formData, unit_type_code: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 ${errors.unit_type_code ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
              >
                <option value="">{editingItem ? t('common.optional', 'Optional') : t('common.select')}</option>
                {unitTypes.map(ut => (
                  <option key={ut.id} value={ut.code}>
                    {locale === 'ar' ? ut.name_ar : ut.name_en}
                  </option>
                ))}
              </select>
              {errors.unit_type_code && <p className="text-sm text-red-500 mt-1">{errors.unit_type_code}</p>}
            </div>
          )}

          {formData.unit_category !== 'basic' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('master.units.baseUnit', 'Base Unit')} <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.base_unit_id}
                  onChange={(e) => setFormData({ ...formData, base_unit_id: Number(e.target.value) })}
                  className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 ${errors.base_unit_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                >
                  <option value="">{t('common.select')}</option>
                  {basicUnits.map(u => (
                    <option key={u.id} value={u.id}>
                      {locale === 'ar' && u.name_ar ? u.name_ar : u.name} ({u.code})
                    </option>
                  ))}
                </select>
                {errors.base_unit_id && <p className="text-sm text-red-500 mt-1">{errors.base_unit_id}</p>}
              </div>
              <div>
                <Input
                  label={t('master.units.conversionFactor', 'Conversion Factor')}
                  type="number"
                  step="0.0001"
                  value={formData.conversion_factor}
                  onChange={(e) => setFormData({ ...formData, conversion_factor: Number(e.target.value) })}
                  error={errors.conversion_factor}
                  required
                  helperText={t('master.units.conversionHelp', 'How many base units in this unit? (e.g., 12 for dozen)')}
                />
              </div>
            </div>
          )}

          <Input
            label={t('master.units.decimalPlaces', 'Decimal Places')}
            type="number"
            min="0"
            max="6"
            value={formData.decimal_places}
            onChange={(e) => setFormData({ ...formData, decimal_places: Number(e.target.value) })}
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

export default withPermission(MenuPermissions.MasterData.Units.View, UnitsPage);
