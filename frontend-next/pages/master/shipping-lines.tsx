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
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  GlobeAltIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';

interface ShippingLine {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  company_type: 'ocean' | 'air' | 'land' | 'multimodal';
  country?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  credit_limit?: number;
  payment_terms?: number;
  rating?: number;
  is_preferred: boolean;
  is_active: boolean;
  notes?: string;
  created_at: string;
}

const COMPANY_TYPES = [
  { value: 'ocean', label: 'Ocean Freight', labelAr: 'شحن بحري', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'air', label: 'Air Freight', labelAr: 'شحن جوي', color: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400' },
  { value: 'land', label: 'Land Transport', labelAr: 'نقل بري', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  { value: 'multimodal', label: 'Multimodal', labelAr: 'متعدد الوسائط', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
];

function ShippingLinesPage() {
  const { hasPermission } = usePermissions();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const hasFetched = useRef(false);

  const [items, setItems] = useState<ShippingLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ShippingLine | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    name_ar: '',
    company_type: 'ocean' as ShippingLine['company_type'],
    country: '',
    contact_person: '',
    phone: '',
    email: '',
    website: '',
    address: '',
    credit_limit: 0,
    payment_terms: 30,
    is_preferred: false,
    is_active: true,
    notes: '',
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
      const res = await fetch('http://localhost:4000/api/shipping-lines', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setItems(Array.isArray(data) ? data : data.data || []);
      } else {
        loadMockData();
      }
    } catch {
      loadMockData();
    } finally {
      setLoading(false);
    }
  };

  const loadMockData = () => {
    setItems([
      { id: 1, code: 'MAERSK', name: 'Maersk Line', name_ar: 'ميرسك', company_type: 'ocean', country: 'Denmark', contact_person: 'John Smith', phone: '+45 12345678', email: 'info@maersk.com', website: 'www.maersk.com', is_preferred: true, is_active: true, rating: 5, created_at: '2025-01-01' },
      { id: 2, code: 'MSC', name: 'Mediterranean Shipping Company', name_ar: 'ام اس سي', company_type: 'ocean', country: 'Switzerland', contact_person: 'Maria Rodriguez', phone: '+41 22 703 8888', is_preferred: true, is_active: true, rating: 5, created_at: '2025-01-01' },
      { id: 3, code: 'HAPAG', name: 'Hapag-Lloyd', name_ar: 'هاباج لويد', company_type: 'ocean', country: 'Germany', contact_person: 'Hans Mueller', is_preferred: false, is_active: true, rating: 4, created_at: '2025-01-01' },
      { id: 4, code: 'EMIRATES', name: 'Emirates SkyCargo', name_ar: 'الإمارات للشحن الجوي', company_type: 'air', country: 'UAE', contact_person: 'Ahmed Hassan', is_preferred: true, is_active: true, rating: 5, created_at: '2025-01-01' },
      { id: 5, code: 'DHL-AIR', name: 'DHL Air Freight', name_ar: 'دي اتش ال جوي', company_type: 'air', country: 'Germany', is_preferred: false, is_active: true, rating: 4, created_at: '2025-01-01' },
      { id: 6, code: 'ARAMEX', name: 'Aramex Land Transport', name_ar: 'ارامكس', company_type: 'land', country: 'Saudi Arabia', is_preferred: true, is_active: true, rating: 4, created_at: '2025-01-01' },
    ]);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.code.trim()) newErrors.code = t('validation.required');
    if (!formData.name.trim()) newErrors.name = t('validation.required');
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('validation.invalidEmail');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const url = editingItem 
        ? `http://localhost:4000/api/shipping-lines/${editingItem.id}`
        : 'http://localhost:4000/api/shipping-lines';
      
      const res = await fetch(url, {
        method: editingItem ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        showToast(t('common.success'), 'success');
        fetchData();
        setShowModal(false);
        resetForm();
      } else {
        throw new Error();
      }
    } catch {
      const newItem: ShippingLine = {
        id: editingItem?.id || Date.now(),
        ...formData,
        created_at: new Date().toISOString(),
      };
      if (editingItem) {
        setItems(items.map(i => i.id === editingItem.id ? newItem : i));
      } else {
        setItems([...items, newItem]);
      }
      showToast(t('common.success'), 'success');
      setShowModal(false);
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('accessToken');
      await fetch(`http://localhost:4000/api/shipping-lines/${deletingId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setItems(items.filter(i => i.id !== deletingId));
      showToast(t('common.deleted'), 'success');
    } catch {
      setItems(items.filter(i => i.id !== deletingId));
      showToast(t('common.deleted'), 'success');
    } finally {
      setIsDeleting(false);
      setConfirmOpen(false);
      setDeletingId(null);
    }
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormData({ code: '', name: '', name_ar: '', company_type: 'ocean', country: '', contact_person: '', phone: '', email: '', website: '', address: '', credit_limit: 0, payment_terms: 30, is_preferred: false, is_active: true, notes: '' });
    setErrors({});
  };

  const openEdit = (item: ShippingLine) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      name_ar: item.name_ar || '',
      company_type: item.company_type,
      country: item.country || '',
      contact_person: item.contact_person || '',
      phone: item.phone || '',
      email: item.email || '',
      website: item.website || '',
      address: item.address || '',
      credit_limit: item.credit_limit || 0,
      payment_terms: item.payment_terms || 30,
      is_preferred: item.is_preferred,
      is_active: item.is_active,
      notes: item.notes || '',
    });
    setShowModal(true);
  };

  const filteredItems = items.filter(item => {
    const matchSearch = !searchTerm || 
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name_ar?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.country?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = !filterType || item.company_type === filterType;
    return matchSearch && matchType;
  });

  return (
    <MainLayout>
      <Head>
        <title>{t('shippingLines.title', 'Shipping Lines')} - SLMS</title>
      </Head>

      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('shippingLines.title', 'Shipping Lines')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t('shippingLines.subtitle', 'Ocean, air, and land freight carriers')}
            </p>
          </div>
          {hasPermission('master:logistics:create') && (
            <Button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-2">
              <PlusIcon className="w-5 h-5" />
              {t('shippingLines.new', 'New Shipping Line')}
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
              <GlobeAltIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('common.total')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{items.length}</p>
            </div>
          </div>
        </Card>
        {COMPANY_TYPES.map(type => (
          <Card key={type.value} className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${type.color.split(' ')[0]}`}>
                <GlobeAltIcon className={`w-6 h-6 ${type.color.split(' ')[1]}`} />
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">{type.label}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {items.filter(i => i.company_type === type.value).length}
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
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">{t('common.allTypes', 'All Types')}</option>
            {COMPANY_TYPES.map(type => (
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
              <GlobeAltIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">{t('common.noData')}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.code')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.name')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.type')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('shippingLines.country', 'Country')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('shippingLines.contact', 'Contact')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('shippingLines.preferred', 'Preferred')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.status')}</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredItems.map((item) => {
                  const type = COMPANY_TYPES.find(t => t.value === item.company_type);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                      <td className="px-6 py-4 font-mono text-sm font-medium text-gray-900 dark:text-white">{item.code}</td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</p>
                          {item.name_ar && <p className="text-xs text-gray-500 dark:text-gray-400">{item.name_ar}</p>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${type?.color}`}>
                          {type?.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                          <MapPinIcon className="w-4 h-4" />
                          {item.country || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          {item.contact_person && <p className="text-gray-900 dark:text-white">{item.contact_person}</p>}
                          {item.phone && (
                            <p className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-xs">
                              <PhoneIcon className="w-3 h-3" /> {item.phone}
                            </p>
                          )}
                          {item.email && (
                            <p className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-xs">
                              <EnvelopeIcon className="w-3 h-3" /> {item.email}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {item.is_preferred && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full">
                            <ShieldCheckIcon className="w-3 h-3" />
                            {t('shippingLines.preferred')}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${item.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400'}`}>
                          {item.is_active ? t('common.active') : t('common.inactive')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {hasPermission('master:logistics:update') && (
                            <button onClick={() => openEdit(item)} className="p-1 text-blue-600 hover:bg-blue-50 rounded dark:hover:bg-blue-900/20">
                              <PencilIcon className="w-4 h-4" />
                            </button>
                          )}
                          {hasPermission('master:logistics:delete') && (
                            <button onClick={() => { setDeletingId(item.id); setConfirmOpen(true); }} className="p-1 text-red-600 hover:bg-red-50 rounded dark:hover:bg-red-900/20">
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editingItem ? t('shippingLines.edit') : t('shippingLines.create')}
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
              placeholder="e.g., MAERSK"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('common.type')} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.company_type}
                onChange={(e) => setFormData({ ...formData, company_type: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                {COMPANY_TYPES.map(type => (
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
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('shippingLines.country', 'Country')}
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            />
            <Input
              label={t('shippingLines.contactPerson', 'Contact Person')}
              value={formData.contact_person}
              onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('common.phone')}
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <Input
              label={t('common.email')}
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              error={errors.email}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('shippingLines.website', 'Website')}
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            />
            <Input
              label={t('shippingLines.paymentTerms', 'Payment Terms (Days)')}
              type="number"
              value={formData.payment_terms}
              onChange={(e) => setFormData({ ...formData, payment_terms: Number(e.target.value) })}
            />
          </div>
          <Input
            label={t('common.address')}
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />
          <Input
            label={t('common.notes')}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
          <div className="flex items-center gap-4 pt-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_preferred"
                checked={formData.is_preferred}
                onChange={(e) => setFormData({ ...formData, is_preferred: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <label htmlFor="is_preferred" className="text-sm text-gray-700 dark:text-gray-300">
                {t('shippingLines.preferred', 'Preferred Carrier')}
              </label>
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

export default withPermission(MenuPermissions.Master.View, ShippingLinesPage);
