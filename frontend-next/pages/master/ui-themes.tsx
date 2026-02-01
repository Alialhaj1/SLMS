/**
 * 🎨 UI Themes Management
 * مظاهر الواجهة
 */

import { useState } from 'react';
import Head from 'next/head';
import { SwatchIcon } from '@heroicons/react/24/outline';
import MainLayout from '../../components/layout/MainLayout';
import MasterDataTable from '../../components/common/MasterDataTable';
import { useMasterData } from '../../hooks/useMasterData';
import { usePermissions } from '../../hooks/usePermissions';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { useToast } from '../../contexts/ToastContext';

interface UITheme {
  id: number;
  theme_name: string;
  theme_code: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  text_color: string;
  sidebar_color: string;
  header_color: string;
  logo_url: string;
  favicon_url: string;
  is_default: boolean;
  is_active: boolean;
  company_id: number;
  created_at: string;
  updated_at: string;
}

export default function UIThemesPage() {
  const { showToast } = useToast();
  const { can } = usePermissions();
  
  const {
    data,
    loading,
    error,
    create,
    update,
    remove,
    fetchList
  } = useMasterData<UITheme>({ endpoint: '/api/ui-themes' });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<UITheme | null>(null);
  const [formData, setFormData] = useState({
    theme_name: '',
    theme_code: '',
    primary_color: '#3B82F6',
    secondary_color: '#64748B',
    accent_color: '#10B981',
    background_color: '#FFFFFF',
    text_color: '#1F2937',
    sidebar_color: '#1E293B',
    header_color: '#FFFFFF',
    logo_url: '',
    favicon_url: '',
    is_default: false,
    is_active: true,
    company_id: 1
  });

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({
      theme_name: '',
      theme_code: '',
      primary_color: '#3B82F6',
      secondary_color: '#64748B',
      accent_color: '#10B981',
      background_color: '#FFFFFF',
      text_color: '#1F2937',
      sidebar_color: '#1E293B',
      header_color: '#FFFFFF',
      logo_url: '',
      favicon_url: '',
      is_default: false,
      is_active: true,
      company_id: 1
    });
    setIsModalOpen(true);
  };

  const handleEdit = (id: number) => {
    const item = data.find(d => d.id === id);
    if (item) {
      setEditingItem(item);
      setFormData({
        theme_name: item.theme_name,
        theme_code: item.theme_code,
        primary_color: item.primary_color || '#3B82F6',
        secondary_color: item.secondary_color || '#64748B',
        accent_color: item.accent_color || '#10B981',
        background_color: item.background_color || '#FFFFFF',
        text_color: item.text_color || '#1F2937',
        sidebar_color: item.sidebar_color || '#1E293B',
        header_color: item.header_color || '#FFFFFF',
        logo_url: item.logo_url || '',
        favicon_url: item.favicon_url || '',
        is_default: item.is_default,
        is_active: item.is_active,
        company_id: item.company_id
      });
      setIsModalOpen(true);
    }
  };

  const handleSubmit = async () => {
    try {
      if (editingItem) {
        await update(editingItem.id, formData);
        showToast('Theme updated successfully', 'success');
      } else {
        await create(formData);
        showToast('Theme created successfully', 'success');
      }
      setIsModalOpen(false);
      fetchList();
    } catch (error) {
      showToast('Operation failed', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this theme?')) {
      try {
        await remove(id);
        showToast('Theme deleted successfully', 'success');
        fetchList();
      } catch (error) {
        showToast('Delete failed', 'error');
      }
    }
  };

  const columns = [
    {
      key: 'theme_name',
      label: 'Name / الاسم',
      render: (item: UITheme) => item?.theme_name || '-'
    },
    {
      key: 'theme_code',
      label: 'Code / الرمز',
      render: (item: UITheme) => item?.theme_code || '-'
    },
    {
      key: 'colors',
      label: 'Colors / الألوان',
      render: (item: UITheme) => {
        if (!item) return '-';
        return (
          <div className="flex gap-1">
            <div 
              className="w-6 h-6 rounded border border-gray-300" 
              style={{ backgroundColor: item.primary_color }}
              title="Primary"
            />
            <div 
              className="w-6 h-6 rounded border border-gray-300" 
              style={{ backgroundColor: item.secondary_color }}
              title="Secondary"
            />
            <div 
              className="w-6 h-6 rounded border border-gray-300" 
              style={{ backgroundColor: item.accent_color }}
              title="Accent"
            />
          </div>
        );
      }
    },
    {
      key: 'is_default',
      label: 'Default / افتراضي',
      render: (item: UITheme) => (
        item?.is_default ? 
          <span className="text-green-600">✓</span> : 
          <span className="text-gray-400">-</span>
      )
    },
    {
      key: 'is_active',
      label: 'Status / الحالة',
      render: (item: UITheme) => (
        item?.is_active ?
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Active</span> :
          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">Inactive</span>
      )
    }
  ];

  return (
    <MainLayout>
      <Head>
        <title>UI Themes | SLMS</title>
      </Head>

      {/* Header Section */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <SwatchIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                UI Themes
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                مظاهر الواجهة
              </p>
            </div>
          </div>
          <Button
            onClick={handleAdd}
            variant="primary"
            disabled={loading}
          >
            + Add Theme / إضافة مظهر
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-lg text-red-800 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Table Component */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <MasterDataTable
          data={data}
          columns={columns}
          loading={loading}
          error={error}
          onEdit={handleEdit}
          onDelete={handleDelete}
          canEdit={can('ui_themes:edit')}
          canDelete={can('ui_themes:delete')}
          emptyMessage="No themes yet. Click 'Add Theme' to create one. / لا توجد مظاهر بعد"
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Theme' : 'Add Theme'}
        size="xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Theme Name / اسم المظهر"
              value={formData.theme_name}
              onChange={(e) => setFormData({ ...formData, theme_name: e.target.value })}
              required
            />
            <Input
              label="Theme Code / رمز المظهر"
              value={formData.theme_code}
              onChange={(e) => setFormData({ ...formData, theme_code: e.target.value })}
              required
            />
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              🎨 Color Scheme / نظام الألوان
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                  Primary / الأساسي
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.primary_color}
                    onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                    className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                  />
                  <Input
                    value={formData.primary_color}
                    onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                  Secondary / الثانوي
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.secondary_color}
                    onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                    className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                  />
                  <Input
                    value={formData.secondary_color}
                    onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                  Accent / التمييز
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.accent_color}
                    onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                    className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                  />
                  <Input
                    value={formData.accent_color}
                    onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                  Background / الخلفية
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.background_color}
                    onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                    className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                  />
                  <Input
                    value={formData.background_color}
                    onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                  Text / النص
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.text_color}
                    onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
                    className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                  />
                  <Input
                    value={formData.text_color}
                    onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                  Sidebar / الشريط الجانبي
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.sidebar_color}
                    onChange={(e) => setFormData({ ...formData, sidebar_color: e.target.value })}
                    className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                  />
                  <Input
                    value={formData.sidebar_color}
                    onChange={(e) => setFormData({ ...formData, sidebar_color: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                  Header / الرأس
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.header_color}
                    onChange={(e) => setFormData({ ...formData, header_color: e.target.value })}
                    className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                  />
                  <Input
                    value={formData.header_color}
                    onChange={(e) => setFormData({ ...formData, header_color: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              🖼️ Branding / العلامة التجارية
            </h3>
            <Input
              label="Logo URL / رابط الشعار"
              value={formData.logo_url}
              onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
              placeholder="https://example.com/logo.png"
            />
            <Input
              label="Favicon URL / رابط الأيقونة"
              value={formData.favicon_url}
              onChange={(e) => setFormData({ ...formData, favicon_url: e.target.value })}
              placeholder="https://example.com/favicon.ico"
            />
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_default}
                onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Default Theme / مظهر افتراضي</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Active / نشط</span>
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button onClick={handleSubmit} variant="primary" className="flex-1">
              {editingItem ? 'Update / تحديث' : 'Create / إنشاء'}
            </Button>
            <Button onClick={() => setIsModalOpen(false)} variant="secondary" className="flex-1">
              Cancel / إلغاء
            </Button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}
