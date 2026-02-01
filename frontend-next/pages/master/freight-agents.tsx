import { useMemo, useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useToast } from '../../contexts/ToastContext';
import { useTranslation } from '../../hooks/useTranslation';
import { usePermissions } from '../../hooks/usePermissions';
import { MenuPermissions } from '../../config/menu.permissions';
import {
  BriefcaseIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface ShippingAgent {
  id: number;
  code: string;
  name: string;
  name_ar: string;
  agent_type: string | null;
  license_number: string | null;
  services: string | null;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
}

export default function FreightAgentsPage() {
  const { locale } = useTranslation();
  const { showToast } = useToast();
  const { hasAnyPermission } = usePermissions();

  const canView = hasAnyPermission([MenuPermissions.Master.View, 'shipping_agents:view']);
  const canCreate = hasAnyPermission([MenuPermissions.Master.Create, 'shipping_agents:create']);
  const canEdit = hasAnyPermission([MenuPermissions.Master.Edit, 'shipping_agents:update']);
  const canDelete = hasAnyPermission([MenuPermissions.Master.Delete, 'shipping_agents:delete']);

  const [items, setItems] = useState<ShippingAgent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [editMode, setEditMode] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<ShippingAgent | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    name_ar: '',
    agent_type: '',
    license_number: '',
    services: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://localhost:4000/api/shipping-agents', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setItems(data.data || []);
      } else {
        showToast(locale === 'ar' ? 'فشل تحميل البيانات' : 'Failed to load data', 'error');
      }
    } catch (error) {
      showToast(locale === 'ar' ? 'خطأ في الاتصال' : 'Connection error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    if (!canCreate) {
      showToast(locale === 'ar' ? 'غير مصرح' : 'Access denied', 'error');
      return;
    }
    setEditMode(false);
    setFormData({
      code: '',
      name: '',
      name_ar: '',
      agent_type: '',
      license_number: '',
      services: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
    });
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (agent: ShippingAgent) => {
    if (!canEdit) {
      showToast(locale === 'ar' ? 'غير مصرح' : 'Access denied', 'error');
      return;
    }
    setEditMode(true);
    setSelectedAgent(agent);
    setFormData({
      code: agent.code,
      name: agent.name,
      name_ar: agent.name_ar,
      agent_type: agent.agent_type || '',
      license_number: agent.license_number || '',
      services: agent.services || '',
      contact_person: agent.contact_person || '',
      email: agent.email || '',
      phone: agent.phone || '',
      address: agent.address || '',
    });
    setErrors({});
    setModalOpen(true);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.code.trim()) newErrors.code = locale === 'ar' ? 'مطلوب' : 'Required';
    if (!formData.name.trim()) newErrors.name = locale === 'ar' ? 'مطلوب' : 'Required';
    if (!formData.name_ar.trim()) newErrors.name_ar = locale === 'ar' ? 'مطلوب' : 'Required';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = locale === 'ar' ? 'بريد غير صالح' : 'Invalid email';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const url = editMode
        ? `http://localhost:4000/api/shipping-agents/${selectedAgent?.id}`
        : 'http://localhost:4000/api/shipping-agents';
      const method = editMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.success) {
        showToast(
          locale === 'ar'
            ? editMode ? 'تم التحديث بنجاح' : 'تم الإضافة بنجاح'
            : editMode ? 'Updated successfully' : 'Added successfully',
          'success'
        );
        setModalOpen(false);
        fetchAgents();
      } else {
        showToast(data.error?.message || (locale === 'ar' ? 'فشل الحفظ' : 'Save failed'), 'error');
      }
    } catch (error) {
      showToast(locale === 'ar' ? 'خطأ في الاتصال' : 'Connection error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedAgent) return;
    setDeleting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`http://localhost:4000/api/shipping-agents/${selectedAgent.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        showToast(locale === 'ar' ? 'تم الحذف بنجاح' : 'Deleted successfully', 'success');
        setDeleteConfirmOpen(false);
        setSelectedAgent(null);
        fetchAgents();
      } else {
        showToast(data.error?.message || (locale === 'ar' ? 'فشل الحذف' : 'Delete failed'), 'error');
      }
    } catch (error) {
      showToast(locale === 'ar' ? 'خطأ في الاتصال' : 'Connection error', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (selectedStatus === 'all') return true;
      return selectedStatus === 'active' ? i.is_active : !i.is_active;
    });
  }, [items, selectedStatus]);

  const totalCount = items.length;
  const activeCount = items.filter(i => i.is_active).length;
  const inactiveCount = items.filter(i => !i.is_active).length;

  const getStatusBadge = (isActive: boolean) => {
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', 
        isActive 
          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
      )}>
        {locale === 'ar' ? (isActive ? 'نشط' : 'غير نشط') : (isActive ? 'Active' : 'Inactive')}
      </span>
    );
  };

  if (!canView) {
    return (
      <MainLayout>
        <Head>
          <title>{locale === 'ar' ? 'وكلاء الشحن - SLMS' : 'Freight Agents - SLMS'}</title>
        </Head>
        <div className="text-center py-12">
          <BriefcaseIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{locale === 'ar' ? 'غير مصرح' : 'Access Denied'}</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {locale === 'ar' ? 'لا تملك صلاحية عرض وكلاء الشحن.' : "You don't have permission to view freight agents."}
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'وكلاء الشحن - SLMS' : 'Freight Agents - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <BriefcaseIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{locale === 'ar' ? 'وكلاء الشحن' : 'Freight Agents'}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'إدارة وكلاء الشحن وبيانات التواصل' : 'Manage freight agents and contact information'}</p>
            </div>
          </div>
          {canCreate && (
            <Button onClick={openCreate}>
              <PlusIcon className="h-4 w-4" />
              {locale === 'ar' ? 'وكيل جديد' : 'New Agent'}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الإجمالي' : 'Total'}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'نشط' : 'Active'}</p>
            <p className="text-2xl font-bold text-green-600">{activeCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'غير نشط' : 'Inactive'}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{inactiveCount}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
            <select 
              value={selectedStatus} 
              onChange={(e) => setSelectedStatus(e.target.value as any)} 
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">{locale === 'ar' ? 'كل الحالات' : 'All status'}</option>
              <option value="active">{locale === 'ar' ? 'نشط' : 'Active'}</option>
              <option value="inactive">{locale === 'ar' ? 'غير نشط' : 'Inactive'}</option>
            </select>
            <Button 
              variant="secondary" 
              onClick={() => showToast(locale === 'ar' ? 'تصدير (تجريبي)' : 'Export (demo)', 'info')}
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              {locale === 'ar' ? 'تصدير' : 'Export'}
            </Button>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center text-gray-500">{locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center text-gray-500">{locale === 'ar' ? 'لا توجد بيانات' : 'No data'}</div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الكود' : 'Code'}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الاسم' : 'Name'}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'النوع' : 'Type'}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الهاتف' : 'Phone'}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filtered.map((agent) => (
                    <tr key={agent.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{agent.code}</td>
                      <td className="px-4 py-3 text-gray-900 dark:text-white">{locale === 'ar' ? agent.name_ar : agent.name}</td>
                      <td className="px-4 py-3 text-gray-500">{agent.agent_type || '-'}</td>
                      <td className="px-4 py-3 text-gray-500">{agent.phone || '-'}</td>
                      <td className="px-4 py-3">{getStatusBadge(agent.is_active)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {canEdit && (
                            <Button size="sm" variant="secondary" onClick={() => openEdit(agent)}>
                              <PencilIcon className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button 
                              size="sm" 
                              variant="danger" 
                              onClick={() => {
                                setSelectedAgent(agent);
                                setDeleteConfirmOpen(true);
                              }}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        title={locale === 'ar' ? (editMode ? 'تعديل وكيل شحن' : 'وكيل شحن جديد') : (editMode ? 'Edit Shipping Agent' : 'New Shipping Agent')} 
        size="xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input 
              label={locale === 'ar' ? 'الكود *' : 'Code *'} 
              value={formData.code} 
              onChange={(e) => setFormData({ ...formData, code: e.target.value })} 
              error={errors.code}
              placeholder="SA-001"
            />
            <Input 
              label={locale === 'ar' ? 'رقم الترخيص' : 'License Number'} 
              value={formData.license_number} 
              onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
            />
            <Input 
              label={locale === 'ar' ? 'الاسم (EN) *' : 'Name (EN) *'} 
              value={formData.name} 
              onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
              error={errors.name}
            />
            <Input 
              label={locale === 'ar' ? 'الاسم (AR) *' : 'Name (AR) *'} 
              value={formData.name_ar} 
              onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })} 
              error={errors.name_ar}
            />
            <Select
              label={locale === 'ar' ? 'نوع الوكيل' : 'Agent Type'}
              value={formData.agent_type}
              onChange={(e) => setFormData({ ...formData, agent_type: e.target.value })}
            >
              <option value="">{locale === 'ar' ? '-- اختر --' : '-- Select --'}</option>
              <option value="freight_forwarder">{locale === 'ar' ? 'وكيل شحن' : 'Freight Forwarder'}</option>
              <option value="shipping_line">{locale === 'ar' ? 'خط ملاحي' : 'Shipping Line'}</option>
              <option value="air_cargo">{locale === 'ar' ? 'شحن جوي' : 'Air Cargo'}</option>
              <option value="land_transport">{locale === 'ar' ? 'نقل بري' : 'Land Transport'}</option>
            </Select>
            <Input 
              label={locale === 'ar' ? 'الخدمات' : 'Services'} 
              value={formData.services} 
              onChange={(e) => setFormData({ ...formData, services: e.target.value })}
              placeholder={locale === 'ar' ? 'مثال: شحن بحري، جوي' : 'e.g., Sea freight, Air freight'}
            />
            <Input 
              label={locale === 'ar' ? 'جهة الاتصال' : 'Contact Person'} 
              value={formData.contact_person} 
              onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
            />
            <Input 
              label={locale === 'ar' ? 'الهاتف' : 'Phone'} 
              value={formData.phone} 
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })} 
              placeholder="+966 ..."
            />
            <Input 
              label={locale === 'ar' ? 'البريد الإلكتروني' : 'Email'} 
              value={formData.email} 
              onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
              error={errors.email}
              placeholder="agent@example.com"
            />
          </div>
          <Input 
            label={locale === 'ar' ? 'العنوان' : 'Address'} 
            value={formData.address} 
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />
          <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
            <Button onClick={handleSave} loading={loading}>
              {locale === 'ar' ? (editMode ? 'تحديث' : 'إضافة') : (editMode ? 'Update' : 'Add')}
            </Button>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              {locale === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setSelectedAgent(null);
        }}
        onConfirm={handleDelete}
        title={locale === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete'}
        message={locale === 'ar' 
          ? `هل أنت متأكد من حذف "${selectedAgent?.name_ar || selectedAgent?.name}"؟` 
          : `Are you sure you want to delete "${selectedAgent?.name}"?`}
        confirmText={locale === 'ar' ? 'حذف' : 'Delete'}
        variant="danger"
        loading={deleting}
      />
    </MainLayout>
  );
}
