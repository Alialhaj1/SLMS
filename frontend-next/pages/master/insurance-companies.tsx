/**
 * Insurance Companies Master Data Page
 * Manage insurance companies for shipment insurance expenses
 */

import Head from 'next/head';
import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/contexts/ToastContext';
import { useLocale } from '@/contexts/LocaleContext';
import { usePermissions } from '@/hooks/usePermissions';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

interface InsuranceCompany {
  id: number;
  code: string;
  name: string;
  name_ar: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
}

export default function InsuranceCompaniesPage() {
  const { locale, t } = useLocale();
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  
  const [data, setData] = useState<InsuranceCompany[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    name_ar: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    is_active: true
  });
  
  const canCreate = hasPermission('insurance_companies:create');
  const canUpdate = hasPermission('insurance_companies:update');
  const canDelete = hasPermission('insurance_companies:delete');
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:4000/api/insurance-companies', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await res.json();
      if (result.success) {
        setData(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      showToast(t('common.fetchError'), 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('accessToken');
      const url = editingId 
        ? `http://localhost:4000/api/insurance-companies/${editingId}`
        : 'http://localhost:4000/api/insurance-companies';
      
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      const result = await res.json();
      
      if (result.success) {
        showToast(
          editingId ? t('common.updateSuccess') : t('common.createSuccess'),
          'success'
        );
        setModalOpen(false);
        resetForm();
        fetchData();
      } else {
        showToast(result.error?.message || t('common.saveError'), 'error');
      }
    } catch (error) {
      console.error('Error saving:', error);
      showToast(t('common.saveError'), 'error');
    }
  };
  
  const handleEdit = (item: InsuranceCompany) => {
    setEditingId(item.id);
    setFormData({
      code: item.code,
      name: item.name,
      name_ar: item.name_ar,
      contact_person: item.contact_person || '',
      phone: item.phone || '',
      email: item.email || '',
      address: item.address || '',
      is_active: item.is_active
    });
    setModalOpen(true);
  };
  
  const handleDelete = async () => {
    if (!itemToDelete) return;
    
    setDeleting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/insurance-companies/${itemToDelete}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const result = await res.json();
      
      if (result.success) {
        showToast(t('common.deleteSuccess'), 'success');
        fetchData();
      } else {
        showToast(result.error?.message || t('common.deleteError'), 'error');
      }
    } catch (error) {
      console.error('Error deleting:', error);
      showToast(t('common.deleteError'), 'error');
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    }
  };
  
  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      name_ar: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      is_active: true
    });
    setEditingId(null);
  };
  
  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'شركات التأمين' : 'Insurance Companies'} - SLMS</title>
      </Head>
      
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {locale === 'ar' ? 'شركات التأمين' : 'Insurance Companies'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {locale === 'ar' ? 'إدارة شركات التأمين لمصاريف تأمين الشحنات' : 'Manage insurance companies for shipment insurance expenses'}
            </p>
          </div>
          {canCreate && (
            <Button onClick={() => setModalOpen(true)}>
              <PlusIcon className="w-5 h-5 mr-2" />
              {locale === 'ar' ? 'إضافة شركة تأمين' : 'Add Insurance Company'}
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {locale === 'ar' ? 'الكود' : 'Code'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {locale === 'ar' ? 'الاسم' : 'Name'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {locale === 'ar' ? 'جهة الاتصال' : 'Contact'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {locale === 'ar' ? 'الهاتف' : 'Phone'}
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {locale === 'ar' ? 'الحالة' : 'Status'}
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {locale === 'ar' ? 'الإجراءات' : 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      {locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      {locale === 'ar' ? 'لا توجد سجلات' : 'No records found'}
                    </td>
                  </tr>
                ) : (
                  data.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                        {item.code}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {locale === 'ar' ? item.name_ar : item.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {item.contact_person || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {item.phone || '-'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          item.is_active 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {item.is_active 
                            ? (locale === 'ar' ? 'نشط' : 'Active')
                            : (locale === 'ar' ? 'غير نشط' : 'Inactive')
                          }
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {canUpdate && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleEdit(item)}
                            >
                              <PencilIcon className="w-4 h-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => {
                                setItemToDelete(item.id);
                                setDeleteConfirmOpen(true);
                              }}
                            >
                              <TrashIcon className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add/Edit Modal */}
        <Modal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            resetForm();
          }}
          title={editingId 
            ? (locale === 'ar' ? 'تعديل شركة التأمين' : 'Edit Insurance Company')
            : (locale === 'ar' ? 'إضافة شركة تأمين' : 'Add Insurance Company')
          }
          size="lg"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label={locale === 'ar' ? 'الكود' : 'Code'}
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                required
              />
              
              <Input
                label={locale === 'ar' ? 'الاسم (English)' : 'Name (English)'}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              
              <Input
                label={locale === 'ar' ? 'الاسم (عربي)' : 'Name (Arabic)'}
                value={formData.name_ar}
                onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                required
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
              />
              
              <Input
                label={locale === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            
            <Input
              label={locale === 'ar' ? 'العنوان' : 'Address'}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-gray-300">
                {locale === 'ar' ? 'نشط' : 'Active'}
              </label>
            </div>
            
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setModalOpen(false);
                  resetForm();
                }}
              >
                {locale === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button type="submit">
                {locale === 'ar' ? 'حفظ' : 'Save'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Delete Confirmation */}
        <ConfirmDialog
          isOpen={deleteConfirmOpen}
          onClose={() => {
            setDeleteConfirmOpen(false);
            setItemToDelete(null);
          }}
          onConfirm={handleDelete}
          title={locale === 'ar' ? 'حذف شركة التأمين' : 'Delete Insurance Company'}
          message={locale === 'ar' ? 'هل أنت متأكد من حذف هذه الشركة؟ لا يمكن التراجع عن هذا الإجراء.' : 'Are you sure you want to delete this company? This action cannot be undone.'}
          confirmText={locale === 'ar' ? 'حذف' : 'Delete'}
          variant="danger"
          loading={deleting}
        />
      </div>
    </MainLayout>
  );
}
