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
  BuildingOfficeIcon,
  MagnifyingGlassIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  StarIcon,
} from '@heroicons/react/24/outline';

interface ClearingAgent {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  license_number: string;
  license_expiry?: string;
  customs_id?: string;
  service_type: 'customs_broker' | 'freight_forwarder' | 'both';
  specialization: string[];
  country: string;
  city?: string;
  address?: string;
  contact_person?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  website?: string;
  tax_number?: string;
  bank_account?: string;
  rating?: number;
  commission_rate?: number;
  credit_limit?: number;
  payment_terms?: number;
  is_preferred: boolean;
  is_active: boolean;
  notes?: string;
  created_at: string;
}

const SERVICE_TYPES = [
  { value: 'customs_broker', label: 'Customs Broker', labelAr: 'مخلص جمركي', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'freight_forwarder', label: 'Freight Forwarder', labelAr: 'وكيل شحن', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  { value: 'both', label: 'Customs & Freight', labelAr: 'تخليص وشحن', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
];

const SPECIALIZATIONS = [
  { value: 'general', label: 'General Cargo' },
  { value: 'perishable', label: 'Perishable Goods' },
  { value: 'hazmat', label: 'Hazardous Materials' },
  { value: 'vehicles', label: 'Vehicles' },
  { value: 'machinery', label: 'Machinery & Equipment' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'textiles', label: 'Textiles & Apparel' },
  { value: 'food', label: 'Food & Beverages' },
  { value: 'pharmaceuticals', label: 'Pharmaceuticals' },
  { value: 'chemicals', label: 'Chemicals' },
];

function ClearingAgentsPage() {
  const { hasPermission } = usePermissions();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const hasFetched = useRef(false);

  const [items, setItems] = useState<ClearingAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ClearingAgent | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    name_ar: '',
    license_number: '',
    license_expiry: '',
    customs_id: '',
    service_type: 'customs_broker' as ClearingAgent['service_type'],
    specialization: [] as string[],
    country: 'Saudi Arabia',
    city: '',
    address: '',
    contact_person: '',
    phone: '',
    mobile: '',
    email: '',
    website: '',
    tax_number: '',
    bank_account: '',
    commission_rate: 0,
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
      const res = await fetch('http://localhost:4000/api/clearing-agents', {
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
      { id: 1, code: 'CA001', name: 'Al-Rajhi Customs Services', name_ar: 'خدمات الراجحي الجمركية', license_number: 'CB-2024-001', license_expiry: '2025-12-31', customs_id: 'JED-001', service_type: 'both', specialization: ['general', 'machinery', 'electronics'], country: 'Saudi Arabia', city: 'Jeddah', contact_person: 'Mohammed Al-Rajhi', phone: '+966 12 654 3210', mobile: '+966 50 123 4567', email: 'info@rajhi-customs.com.sa', rating: 5, commission_rate: 2.5, is_preferred: true, is_active: true, created_at: '2025-01-01' },
      { id: 2, code: 'CA002', name: 'Gulf Freight & Logistics', name_ar: 'الخليج للشحن واللوجستيات', license_number: 'FF-2024-025', license_expiry: '2025-06-30', service_type: 'freight_forwarder', specialization: ['general', 'perishable', 'food'], country: 'Saudi Arabia', city: 'Dammam', contact_person: 'Ahmed Al-Ghamdi', phone: '+966 13 825 4321', rating: 4, commission_rate: 3.0, is_preferred: true, is_active: true, created_at: '2025-01-01' },
      { id: 3, code: 'CA003', name: 'National Customs Clearance', name_ar: 'التخليص الجمركي الوطني', license_number: 'CB-2024-102', customs_id: 'RUH-015', service_type: 'customs_broker', specialization: ['vehicles', 'machinery'], country: 'Saudi Arabia', city: 'Riyadh', contact_person: 'Khalid Abdullah', rating: 5, commission_rate: 2.0, is_preferred: false, is_active: true, created_at: '2025-01-01' },
      { id: 4, code: 'CA004', name: 'Red Sea Shipping Agency', name_ar: 'وكالة البحر الأحمر للشحن', license_number: 'FF-2024-089', service_type: 'freight_forwarder', specialization: ['general', 'hazmat', 'chemicals'], country: 'Saudi Arabia', city: 'Jeddah', contact_person: 'Omar Saeed', rating: 4, commission_rate: 2.8, is_preferred: false, is_active: true, created_at: '2025-01-01' },
      { id: 5, code: 'CA005', name: 'Saudi Pharma Logistics', name_ar: 'اللوجستيات الدوائية السعودية', license_number: 'CB-2024-156', license_expiry: '2026-03-15', service_type: 'both', specialization: ['pharmaceuticals', 'perishable'], country: 'Saudi Arabia', city: 'Riyadh', contact_person: 'Dr. Fatima Hassan', rating: 5, commission_rate: 3.5, is_preferred: true, is_active: true, created_at: '2025-01-01' },
    ]);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.code.trim()) newErrors.code = t('validation.required');
    if (!formData.name.trim()) newErrors.name = t('validation.required');
    if (!formData.license_number.trim()) newErrors.license_number = t('validation.required');
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
        ? `http://localhost:4000/api/clearing-agents/${editingItem.id}`
        : 'http://localhost:4000/api/clearing-agents';
      
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
      const newItem: ClearingAgent = {
        id: editingItem?.id || Date.now(),
        ...formData,
        rating: 0,
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
      await fetch(`http://localhost:4000/api/clearing-agents/${deletingId}`, {
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
    setFormData({ code: '', name: '', name_ar: '', license_number: '', license_expiry: '', customs_id: '', service_type: 'customs_broker', specialization: [], country: 'Saudi Arabia', city: '', address: '', contact_person: '', phone: '', mobile: '', email: '', website: '', tax_number: '', bank_account: '', commission_rate: 0, credit_limit: 0, payment_terms: 30, is_preferred: false, is_active: true, notes: '' });
    setErrors({});
  };

  const openEdit = (item: ClearingAgent) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      name_ar: item.name_ar || '',
      license_number: item.license_number,
      license_expiry: item.license_expiry || '',
      customs_id: item.customs_id || '',
      service_type: item.service_type,
      specialization: item.specialization || [],
      country: item.country,
      city: item.city || '',
      address: item.address || '',
      contact_person: item.contact_person || '',
      phone: item.phone || '',
      mobile: item.mobile || '',
      email: item.email || '',
      website: item.website || '',
      tax_number: item.tax_number || '',
      bank_account: item.bank_account || '',
      commission_rate: item.commission_rate || 0,
      credit_limit: item.credit_limit || 0,
      payment_terms: item.payment_terms || 30,
      is_preferred: item.is_preferred,
      is_active: item.is_active,
      notes: item.notes || '',
    });
    setShowModal(true);
  };

  const toggleSpecialization = (spec: string) => {
    if (formData.specialization.includes(spec)) {
      setFormData({ ...formData, specialization: formData.specialization.filter(s => s !== spec) });
    } else {
      setFormData({ ...formData, specialization: [...formData.specialization, spec] });
    }
  };

  const filteredItems = items.filter(item => {
    const matchSearch = !searchTerm || 
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name_ar?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.license_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = !filterType || item.service_type === filterType;
    return matchSearch && matchType;
  });

  const renderStars = (rating: number | undefined) => {
    if (!rating) return null;
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(star => (
          <StarIcon
            key={star}
            className={`w-4 h-4 ${star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
          />
        ))}
      </div>
    );
  };

  return (
    <MainLayout>
      <Head>
        <title>{t('clearingAgents.title', 'Clearing Agents')} - SLMS</title>
      </Head>

      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('clearingAgents.title', 'Clearing Agents')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t('clearingAgents.subtitle', 'Customs brokers and freight forwarders')}
            </p>
          </div>
          {hasPermission('master:logistics:create') && (
            <Button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-2">
              <PlusIcon className="w-5 h-5" />
              {t('clearingAgents.new', 'New Clearing Agent')}
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
              <BuildingOfficeIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('common.total')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{items.length}</p>
            </div>
          </div>
        </Card>
        {SERVICE_TYPES.map(type => (
          <Card key={type.value} className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${type.color.split(' ')[0]}`}>
                <BuildingOfficeIcon className={`w-6 h-6 ${type.color.split(' ')[1]}`} />
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">{type.label}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {items.filter(i => i.service_type === type.value).length}
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
            {SERVICE_TYPES.map(type => (
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
              <BuildingOfficeIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">{t('common.noData')}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.code')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.name')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('clearingAgents.license', 'License')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.type')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('clearingAgents.contact', 'Contact')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('clearingAgents.rating', 'Rating')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.status')}</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredItems.map((item) => {
                  const type = SERVICE_TYPES.find(t => t.value === item.service_type);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                      <td className="px-6 py-4 font-mono text-sm font-semibold text-gray-900 dark:text-white">{item.code}</td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                            {item.name}
                            {item.is_preferred && (
                              <span className="px-1.5 py-0.5 text-xs font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 rounded">
                                ⭐ Preferred
                              </span>
                            )}
                          </p>
                          {item.name_ar && <p className="text-xs text-gray-500 dark:text-gray-400">{item.name_ar}</p>}
                          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            <MapPinIcon className="w-3 h-3" />
                            {item.city}, {item.country}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{item.license_number}</p>
                          {item.customs_id && <p className="text-xs text-gray-500">Customs ID: {item.customs_id}</p>}
                          {item.license_expiry && (
                            <p className={`text-xs ${new Date(item.license_expiry) < new Date() ? 'text-red-500' : 'text-gray-500'}`}>
                              Expires: {item.license_expiry}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${type?.color}`}>
                          {type?.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          {item.contact_person && <p className="text-gray-900 dark:text-white">{item.contact_person}</p>}
                          {item.phone && (
                            <p className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                              <PhoneIcon className="w-3 h-3" /> {item.phone}
                            </p>
                          )}
                          {item.email && (
                            <p className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                              <EnvelopeIcon className="w-3 h-3" /> {item.email}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {renderStars(item.rating)}
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
        title={editingItem ? t('clearingAgents.edit') : t('clearingAgents.create')}
        size="xl"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-3 gap-4">
            <Input
              label={t('common.code')}
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              error={errors.code}
              required
              placeholder="e.g., CA001"
            />
            <Input
              label={t('clearingAgents.licenseNumber', 'License Number')}
              value={formData.license_number}
              onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
              error={errors.license_number}
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('common.type')} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.service_type}
                onChange={(e) => setFormData({ ...formData, service_type: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                {SERVICE_TYPES.map(type => (
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
              label={t('clearingAgents.licenseExpiry', 'License Expiry')}
              type="date"
              value={formData.license_expiry}
              onChange={(e) => setFormData({ ...formData, license_expiry: e.target.value })}
            />
            <Input
              label={t('clearingAgents.customsId', 'Customs ID')}
              value={formData.customs_id}
              onChange={(e) => setFormData({ ...formData, customs_id: e.target.value })}
            />
            <Input
              label={t('clearingAgents.taxNumber', 'Tax Number')}
              value={formData.tax_number}
              onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })}
            />
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              {t('clearingAgents.specializations', 'Specializations')}
            </h4>
            <div className="flex flex-wrap gap-2">
              {SPECIALIZATIONS.map(spec => (
                <button
                  key={spec.value}
                  type="button"
                  onClick={() => toggleSpecialization(spec.value)}
                  className={`px-3 py-1.5 text-sm rounded-full border transition ${
                    formData.specialization.includes(spec.value)
                      ? 'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-400'
                      : 'bg-gray-50 border-gray-300 text-gray-600 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400'
                  }`}
                >
                  {spec.label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              {t('clearingAgents.contactInfo', 'Contact Information')}
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <Input
                label={t('clearingAgents.contactPerson', 'Contact Person')}
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
              />
              <Input
                label={t('common.phone')}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
              <Input
                label={t('common.mobile', 'Mobile')}
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <Input
                label={t('common.email')}
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                error={errors.email}
              />
              <Input
                label={t('clearingAgents.website', 'Website')}
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <Input
                label={t('clearingAgents.city', 'City')}
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
              <Input
                label={t('clearingAgents.country', 'Country')}
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              />
            </div>
            <Input
              label={t('common.address')}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="mt-4"
            />
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              {t('clearingAgents.financial', 'Financial Terms')}
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <Input
                label={t('clearingAgents.commissionRate', 'Commission Rate %')}
                type="number"
                step="0.1"
                value={formData.commission_rate}
                onChange={(e) => setFormData({ ...formData, commission_rate: Number(e.target.value) })}
              />
              <Input
                label={t('clearingAgents.creditLimit', 'Credit Limit')}
                type="number"
                value={formData.credit_limit}
                onChange={(e) => setFormData({ ...formData, credit_limit: Number(e.target.value) })}
              />
              <Input
                label={t('clearingAgents.paymentTerms', 'Payment Terms (Days)')}
                type="number"
                value={formData.payment_terms}
                onChange={(e) => setFormData({ ...formData, payment_terms: Number(e.target.value) })}
              />
            </div>
          </div>

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
                {t('clearingAgents.preferred', 'Preferred Agent')}
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

export default withPermission(MenuPermissions.Master.View, ClearingAgentsPage);
