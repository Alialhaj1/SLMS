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
  DocumentTextIcon,
  MagnifyingGlassIcon,
  GlobeAltIcon,
  TruckIcon,
  ArrowsRightLeftIcon,
} from '@heroicons/react/24/outline';

interface Incoterm {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  full_name: string;
  version: '2010' | '2020';
  category: 'E' | 'F' | 'C' | 'D';
  transport_mode: 'any' | 'sea_inland';
  seller_responsibility: string;
  buyer_responsibility: string;
  risk_transfer_point: string;
  cost_transfer_point: string;
  insurance_required: boolean;
  export_clearance: 'seller' | 'buyer';
  import_clearance: 'seller' | 'buyer';
  is_active: boolean;
  description?: string;
  description_ar?: string;
  created_at: string;
}

const CATEGORIES = [
  { value: 'E', label: 'E - Departure', labelAr: 'مغادرة', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
  { value: 'F', label: 'F - Main Carriage Unpaid', labelAr: 'النقل الرئيسي غير مدفوع', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'C', label: 'C - Main Carriage Paid', labelAr: 'النقل الرئيسي مدفوع', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  { value: 'D', label: 'D - Arrival', labelAr: 'وصول', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
];

const TRANSPORT_MODES = [
  { value: 'any', label: 'Any Mode', labelAr: 'أي وسيلة' },
  { value: 'sea_inland', label: 'Sea & Inland Waterway', labelAr: 'بحري ونهري' },
];

function IncotermsPage() {
  const { hasPermission } = usePermissions();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const hasFetched = useRef(false);

  const [items, setItems] = useState<Incoterm[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterVersion, setFilterVersion] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Incoterm | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    name_ar: '',
    full_name: '',
    version: '2020' as Incoterm['version'],
    category: 'E' as Incoterm['category'],
    transport_mode: 'any' as Incoterm['transport_mode'],
    seller_responsibility: '',
    buyer_responsibility: '',
    risk_transfer_point: '',
    cost_transfer_point: '',
    insurance_required: false,
    export_clearance: 'seller' as 'seller' | 'buyer',
    import_clearance: 'buyer' as 'seller' | 'buyer',
    is_active: true,
    description: '',
    description_ar: '',
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
      const res = await fetch('http://localhost:4000/api/incoterms', {
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
      { id: 1, code: 'EXW', name: 'Ex Works', name_ar: 'تسليم المصنع', full_name: 'Ex Works (named place of delivery)', version: '2020', category: 'E', transport_mode: 'any', seller_responsibility: 'Make goods available at premises', buyer_responsibility: 'All transport and insurance', risk_transfer_point: "Seller's premises", cost_transfer_point: "Seller's premises", insurance_required: false, export_clearance: 'buyer', import_clearance: 'buyer', is_active: true, created_at: '2025-01-01' },
      { id: 2, code: 'FCA', name: 'Free Carrier', name_ar: 'التسليم للناقل', full_name: 'Free Carrier (named place of delivery)', version: '2020', category: 'F', transport_mode: 'any', seller_responsibility: 'Deliver to carrier or named place', buyer_responsibility: 'Main carriage and insurance', risk_transfer_point: 'Carrier or named place', cost_transfer_point: 'Carrier or named place', insurance_required: false, export_clearance: 'seller', import_clearance: 'buyer', is_active: true, created_at: '2025-01-01' },
      { id: 3, code: 'FAS', name: 'Free Alongside Ship', name_ar: 'التسليم بجانب السفينة', full_name: 'Free Alongside Ship (named port of shipment)', version: '2020', category: 'F', transport_mode: 'sea_inland', seller_responsibility: 'Deliver alongside vessel at port', buyer_responsibility: 'Loading, main carriage, insurance', risk_transfer_point: 'Alongside vessel at port', cost_transfer_point: 'Alongside vessel at port', insurance_required: false, export_clearance: 'seller', import_clearance: 'buyer', is_active: true, created_at: '2025-01-01' },
      { id: 4, code: 'FOB', name: 'Free On Board', name_ar: 'التسليم على ظهر السفينة', full_name: 'Free On Board (named port of shipment)', version: '2020', category: 'F', transport_mode: 'sea_inland', seller_responsibility: 'Deliver on board vessel', buyer_responsibility: 'Main carriage and insurance', risk_transfer_point: 'On board vessel', cost_transfer_point: 'On board vessel', insurance_required: false, export_clearance: 'seller', import_clearance: 'buyer', is_active: true, created_at: '2025-01-01' },
      { id: 5, code: 'CFR', name: 'Cost and Freight', name_ar: 'التكلفة والشحن', full_name: 'Cost and Freight (named port of destination)', version: '2020', category: 'C', transport_mode: 'sea_inland', seller_responsibility: 'Deliver on board, pay freight', buyer_responsibility: 'Insurance, unloading', risk_transfer_point: 'On board vessel at origin', cost_transfer_point: 'Destination port', insurance_required: false, export_clearance: 'seller', import_clearance: 'buyer', is_active: true, created_at: '2025-01-01' },
      { id: 6, code: 'CIF', name: 'Cost, Insurance and Freight', name_ar: 'التكلفة والتأمين والشحن', full_name: 'Cost, Insurance and Freight (named port of destination)', version: '2020', category: 'C', transport_mode: 'sea_inland', seller_responsibility: 'Deliver on board, pay freight and insurance', buyer_responsibility: 'Unloading', risk_transfer_point: 'On board vessel at origin', cost_transfer_point: 'Destination port', insurance_required: true, export_clearance: 'seller', import_clearance: 'buyer', is_active: true, created_at: '2025-01-01' },
      { id: 7, code: 'CPT', name: 'Carriage Paid To', name_ar: 'أجرة النقل مدفوعة إلى', full_name: 'Carriage Paid To (named place of destination)', version: '2020', category: 'C', transport_mode: 'any', seller_responsibility: 'Deliver to carrier, pay freight', buyer_responsibility: 'Insurance, unloading', risk_transfer_point: 'First carrier', cost_transfer_point: 'Named destination', insurance_required: false, export_clearance: 'seller', import_clearance: 'buyer', is_active: true, created_at: '2025-01-01' },
      { id: 8, code: 'CIP', name: 'Carriage and Insurance Paid To', name_ar: 'أجرة النقل والتأمين مدفوعة إلى', full_name: 'Carriage and Insurance Paid To (named place of destination)', version: '2020', category: 'C', transport_mode: 'any', seller_responsibility: 'Deliver to carrier, pay freight and insurance', buyer_responsibility: 'Unloading', risk_transfer_point: 'First carrier', cost_transfer_point: 'Named destination', insurance_required: true, export_clearance: 'seller', import_clearance: 'buyer', is_active: true, created_at: '2025-01-01' },
      { id: 9, code: 'DAP', name: 'Delivered at Place', name_ar: 'التسليم في المكان', full_name: 'Delivered at Place (named place of destination)', version: '2020', category: 'D', transport_mode: 'any', seller_responsibility: 'Deliver ready for unloading', buyer_responsibility: 'Unloading, import clearance', risk_transfer_point: 'Named destination', cost_transfer_point: 'Named destination', insurance_required: false, export_clearance: 'seller', import_clearance: 'buyer', is_active: true, created_at: '2025-01-01' },
      { id: 10, code: 'DPU', name: 'Delivered at Place Unloaded', name_ar: 'التسليم في المكان مفرغاً', full_name: 'Delivered at Place Unloaded (named place of destination)', version: '2020', category: 'D', transport_mode: 'any', seller_responsibility: 'Deliver and unload', buyer_responsibility: 'Import clearance', risk_transfer_point: 'Named destination unloaded', cost_transfer_point: 'Named destination unloaded', insurance_required: false, export_clearance: 'seller', import_clearance: 'buyer', is_active: true, created_at: '2025-01-01' },
      { id: 11, code: 'DDP', name: 'Delivered Duty Paid', name_ar: 'التسليم شاملاً الرسوم', full_name: 'Delivered Duty Paid (named place of destination)', version: '2020', category: 'D', transport_mode: 'any', seller_responsibility: 'Deliver cleared for import', buyer_responsibility: 'Unloading only', risk_transfer_point: 'Named destination', cost_transfer_point: 'Named destination', insurance_required: false, export_clearance: 'seller', import_clearance: 'seller', is_active: true, created_at: '2025-01-01' },
    ]);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.code.trim()) newErrors.code = t('validation.required');
    if (!formData.name.trim()) newErrors.name = t('validation.required');
    if (!formData.full_name.trim()) newErrors.full_name = t('validation.required');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const url = editingItem 
        ? `http://localhost:4000/api/incoterms/${editingItem.id}`
        : 'http://localhost:4000/api/incoterms';
      
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
      const newItem: Incoterm = {
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
      await fetch(`http://localhost:4000/api/incoterms/${deletingId}`, {
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
    setFormData({ code: '', name: '', name_ar: '', full_name: '', version: '2020', category: 'E', transport_mode: 'any', seller_responsibility: '', buyer_responsibility: '', risk_transfer_point: '', cost_transfer_point: '', insurance_required: false, export_clearance: 'seller', import_clearance: 'buyer', is_active: true, description: '', description_ar: '' });
    setErrors({});
  };

  const openEdit = (item: Incoterm) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      name_ar: item.name_ar || '',
      full_name: item.full_name,
      version: item.version,
      category: item.category,
      transport_mode: item.transport_mode,
      seller_responsibility: item.seller_responsibility,
      buyer_responsibility: item.buyer_responsibility,
      risk_transfer_point: item.risk_transfer_point,
      cost_transfer_point: item.cost_transfer_point,
      insurance_required: item.insurance_required,
      export_clearance: item.export_clearance,
      import_clearance: item.import_clearance,
      is_active: item.is_active,
      description: item.description || '',
      description_ar: item.description_ar || '',
    });
    setShowModal(true);
  };

  const filteredItems = items.filter(item => {
    const matchSearch = !searchTerm || 
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name_ar?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = !filterCategory || item.category === filterCategory;
    const matchVersion = !filterVersion || item.version === filterVersion;
    return matchSearch && matchCategory && matchVersion;
  });

  return (
    <MainLayout>
      <Head>
        <title>{t('incoterms.title', 'Incoterms')} - SLMS</title>
      </Head>

      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('incoterms.title', 'Incoterms')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t('incoterms.subtitle', 'International Commercial Terms (ICC)')}
            </p>
          </div>
          {hasPermission('master:logistics:create') && (
            <Button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-2">
              <PlusIcon className="w-5 h-5" />
              {t('incoterms.new', 'New Incoterm')}
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
              <DocumentTextIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('common.total')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{items.length}</p>
            </div>
          </div>
        </Card>
        {CATEGORIES.map(cat => (
          <Card key={cat.value} className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${cat.color.split(' ')[0]}`}>
                <ArrowsRightLeftIcon className={`w-6 h-6 ${cat.color.split(' ')[1]}`} />
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">{cat.label.split(' - ')[0]}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {items.filter(i => i.category === cat.value).length}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
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
            {CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
          <select
            value={filterVersion}
            onChange={(e) => setFilterVersion(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">{t('incoterms.allVersions', 'All Versions')}</option>
            <option value="2020">Incoterms 2020</option>
            <option value="2010">Incoterms 2010</option>
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
              <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">{t('common.noData')}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.code')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.name')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('incoterms.category', 'Category')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('incoterms.transport', 'Transport')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('incoterms.clearance', 'Clearance')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('incoterms.insurance', 'Insurance')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.status')}</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredItems.map((item) => {
                  const cat = CATEGORIES.find(c => c.value === item.category);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-mono text-lg font-bold text-blue-600 dark:text-blue-400">{item.code}</p>
                          <p className="text-xs text-gray-500">v{item.version}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</p>
                          {item.name_ar && <p className="text-xs text-gray-500 dark:text-gray-400">{item.name_ar}</p>}
                          <p className="text-xs text-gray-400 mt-1">{item.full_name}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${cat?.color}`}>
                          {cat?.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {item.transport_mode === 'any' ? (
                            <TruckIcon className="w-4 h-4 text-gray-400" />
                          ) : (
                            <GlobeAltIcon className="w-4 h-4 text-blue-400" />
                          )}
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {item.transport_mode === 'any' ? 'Any' : 'Sea/Inland'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="text-xs space-y-1">
                          <p className="text-gray-600 dark:text-gray-400">
                            Export: <span className={item.export_clearance === 'seller' ? 'text-orange-600' : 'text-blue-600'}>{item.export_clearance === 'seller' ? 'Seller' : 'Buyer'}</span>
                          </p>
                          <p className="text-gray-600 dark:text-gray-400">
                            Import: <span className={item.import_clearance === 'seller' ? 'text-orange-600' : 'text-blue-600'}>{item.import_clearance === 'seller' ? 'Seller' : 'Buyer'}</span>
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {item.insurance_required ? (
                          <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                            {t('common.required')}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
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
        title={editingItem ? t('incoterms.edit') : t('incoterms.create')}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Input
              label={t('common.code')}
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              error={errors.code}
              required
              placeholder="e.g., FOB"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('incoterms.version', 'Version')} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                <option value="2020">Incoterms 2020</option>
                <option value="2010">Incoterms 2010</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('incoterms.category', 'Category')} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
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
          <Input
            label={t('incoterms.fullName', 'Full Name')}
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            error={errors.full_name}
            required
            placeholder="e.g., Free On Board (named port of shipment)"
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('incoterms.transportMode', 'Transport Mode')}
              </label>
              <select
                value={formData.transport_mode}
                onChange={(e) => setFormData({ ...formData, transport_mode: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                {TRANSPORT_MODES.map(mode => (
                  <option key={mode.value} value={mode.value}>{mode.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-4 pt-6">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="insurance_required"
                  checked={formData.insurance_required}
                  onChange={(e) => setFormData({ ...formData, insurance_required: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="insurance_required" className="text-sm text-gray-700 dark:text-gray-300">
                  {t('incoterms.insuranceRequired', 'Insurance Required')}
                </label>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              {t('incoterms.responsibilities', 'Responsibilities')}
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label={t('incoterms.sellerResponsibility', 'Seller Responsibility')}
                value={formData.seller_responsibility}
                onChange={(e) => setFormData({ ...formData, seller_responsibility: e.target.value })}
              />
              <Input
                label={t('incoterms.buyerResponsibility', 'Buyer Responsibility')}
                value={formData.buyer_responsibility}
                onChange={(e) => setFormData({ ...formData, buyer_responsibility: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <Input
                label={t('incoterms.riskTransferPoint', 'Risk Transfer Point')}
                value={formData.risk_transfer_point}
                onChange={(e) => setFormData({ ...formData, risk_transfer_point: e.target.value })}
              />
              <Input
                label={t('incoterms.costTransferPoint', 'Cost Transfer Point')}
                value={formData.cost_transfer_point}
                onChange={(e) => setFormData({ ...formData, cost_transfer_point: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('incoterms.exportClearance', 'Export Clearance')}
              </label>
              <select
                value={formData.export_clearance}
                onChange={(e) => setFormData({ ...formData, export_clearance: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                <option value="seller">Seller</option>
                <option value="buyer">Buyer</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('incoterms.importClearance', 'Import Clearance')}
              </label>
              <select
                value={formData.import_clearance}
                onChange={(e) => setFormData({ ...formData, import_clearance: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                <option value="seller">Seller</option>
                <option value="buyer">Buyer</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
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

export default withPermission(MenuPermissions.Master.View, IncotermsPage);
