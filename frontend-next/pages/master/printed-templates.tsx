/**
 * 🖨️ Printed Templates Management
 * قوالب الطباعة
 */

import { useState } from 'react';
import Head from 'next/head';
import { DocumentTextIcon } from '@heroicons/react/24/outline';
import MainLayout from '../../components/layout/MainLayout';
import MasterDataTable from '../../components/common/MasterDataTable';
import { useMasterData } from '../../hooks/useMasterData';
import { usePermissions } from '../../hooks/usePermissions';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { useToast } from '../../contexts/ToastContext';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useLocale } from '../../contexts/LocaleContext';

interface PrintedTemplate {
  id: number;
  name_en: string;
  name_ar: string;
  template_type: string;
  module?: string;
  language?: string;
  paper_size: string;
  orientation: string;
  header_html?: string;
  body_html?: string;
  footer_html?: string;
  css?: string;
  margin_top?: number;
  margin_bottom?: number;
  margin_left?: number;
  margin_right?: number;
  is_default: boolean;
  is_active: boolean;
  company_id?: number;
  created_at: string;
  updated_at: string;
}

export default function PrintedTemplatesPage() {
  const { showToast } = useToast();
  const { can } = usePermissions();
  const { locale } = useLocale();
  
  const {
    data,
    loading,
    error,
    create,
    update,
    remove,
    fetchList
  } = useMasterData<PrintedTemplate>({ endpoint: '/api/printed-templates', autoFetch: true, pageSize: 20 });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PrintedTemplate | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    name_en: '',
    name_ar: '',
    template_type: 'invoice',
    module: '',
    language: 'both',
    paper_size: 'A4',
    orientation: 'portrait',
    header_html: '',
    body_html: '',
    footer_html: '',
    css: '',
    is_default: false,
    is_active: true
  });

  const templateTypes = [
    { value: 'invoice', label: 'Invoice / فاتورة' },
    { value: 'shipment', label: 'Shipment / شحنة' },
    { value: 'receipt', label: 'Receipt / إيصال' },
    { value: 'quotation', label: 'Quotation / عرض سعر' },
    { value: 'delivery_note', label: 'Delivery Note / مذكرة تسليم' },
    { value: 'purchase_order', label: 'Purchase Order / أمر شراء' },
    { value: 'expense_request', label: 'Expense Request / طلب مصروف' },
    { value: 'payment_request', label: 'Payment Request / طلب سداد' },
    { value: 'report', label: 'Report / تقرير' }
  ];

  const languageOptions = [
    { value: 'en', label: 'English / إنجليزي' },
    { value: 'ar', label: 'Arabic / عربي' },
    { value: 'both', label: 'Both / كلاهما' }
  ];

  const paperSizes = [
    { value: 'A4', label: 'A4 (210x297mm)' },
    { value: 'A5', label: 'A5 (148x210mm)' },
    { value: 'Letter', label: 'Letter (8.5x11")' },
    { value: 'Legal', label: 'Legal (8.5x14")' }
  ];

  const orientations = [
    { value: 'portrait', label: 'Portrait / عمودي' },
    { value: 'landscape', label: 'Landscape / أفقي' }
  ];

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({
      name_en: '',
      name_ar: '',
      template_type: 'invoice',
      module: '',
      language: 'both',
      paper_size: 'A4',
      orientation: 'portrait',
      header_html: '',
      body_html: '',
      footer_html: '',
      css: '',
      is_default: false,
      is_active: true
    });
    setIsModalOpen(true);
  };

  const handleEdit = (id: number) => {
    const item = data.find(d => d.id === id);
    if (item) {
      setEditingItem(item);
      setFormData({
        name_en: item.name_en,
        name_ar: item.name_ar,
        template_type: item.template_type,
        module: item.module || '',
        language: item.language || 'both',
        paper_size: item.paper_size,
        orientation: item.orientation,
        header_html: item.header_html || '',
        body_html: item.body_html || '',
        footer_html: item.footer_html || '',
        css: item.css || '',
        is_default: item.is_default,
        is_active: item.is_active
      });
      setIsModalOpen(true);
    }
  };

  const handleSubmit = async () => {
    try {
      if (editingItem) {
        await update(editingItem.id, formData);
        showToast('Template updated successfully', 'success');
      } else {
        await create(formData);
        showToast('Template created successfully', 'success');
      }
      setIsModalOpen(false);
      fetchList();
    } catch (error) {
      showToast('Operation failed', 'error');
    }
  };

  const handleDeleteClick = (id: number) => {
    setDeletingId(id);
    setConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await remove(deletingId);
      showToast('Template deleted successfully', 'success');
      fetchList();
      setConfirmOpen(false);
      setDeletingId(null);
    } catch (error) {
      showToast('Delete failed', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Name / الاسم',
      render: (item: PrintedTemplate) => {
        if (!item) return '-';
        const display = locale === 'ar' ? item.name_ar : item.name_en;
        return display || item.name_en || item.name_ar || '-';
      }
    },
    {
      key: 'template_type',
      label: 'Type / النوع',
      render: (item: PrintedTemplate) => {
        if (!item) return '-';
        const type = templateTypes.find(t => t.value === item.template_type);
        return type?.label || item.template_type;
      }
    },
    {
      key: 'module',
      label: 'Module / الوحدة',
      render: (item: PrintedTemplate) => item?.module || '-'
    },
    {
      key: 'paper_size',
      label: 'Paper Size / الحجم',
      render: (item: PrintedTemplate) => item?.paper_size || '-'
    },
    {
      key: 'is_default',
      label: 'Default / افتراضي',
      render: (item: PrintedTemplate) => (
        item?.is_default ? 
          <span className="text-green-600">✓</span> : 
          <span className="text-gray-400">-</span>
      )
    },
    {
      key: 'is_active',
      label: 'Status / الحالة',
      render: (item: PrintedTemplate) => (
        item?.is_active ?
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">{locale === 'ar' ? 'نشط' : 'Active'}</span> :
          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">{locale === 'ar' ? 'غير نشط' : 'Inactive'}</span>
      )
    }
  ];

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'القوالب المطبوعة - SLMS' : 'Printed Templates - SLMS'}</title>
      </Head>

      {/* Header Section */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <DocumentTextIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                {locale === 'ar' ? 'القوالب المطبوعة' : 'Printed Templates'}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {locale === 'ar' ? 'قوالب الطباعة' : 'Manage printed templates'}
              </p>
            </div>
          </div>
          {can('printed_templates:create') && (
            <Button
              onClick={handleAdd}
              variant="primary"
              disabled={loading}
            >
              + Add Template / إضافة قالب
            </Button>
          )}
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
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
          showActions={can('printed_templates:edit') || can('printed_templates:delete')}
          canEdit={can('printed_templates:edit')}
          canDelete={can('printed_templates:delete')}
          emptyMessage="No templates yet. Click 'Add Template' to create one. / لا توجد قوالب بعد"
        />
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => {
          if (isDeleting) return;
          setConfirmOpen(false);
          setDeletingId(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Template"
        message="This action cannot be undone."
        confirmText="Delete"
        variant="danger"
        loading={isDeleting}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Template' : 'Add Template'}
        size="xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Template Type / النوع <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.template_type}
                onChange={(e) => setFormData({ ...formData, template_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                {templateTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <Input
              label="Module / الوحدة"
              value={formData.module}
              onChange={(e) => setFormData({ ...formData, module: e.target.value })}
              helperText="sales / purchases / logistics / accounting / hr"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Name (English) / الاسم بالإنجليزية"
              value={formData.name_en}
              onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
              required
            />
            <Input
              label="Name (Arabic) / الاسم بالعربية"
              value={formData.name_ar}
              onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Language / اللغة
            </label>
            <select
              value={formData.language}
              onChange={(e) => setFormData({ ...formData, language: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              {languageOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Paper Size / حجم الورق
              </label>
              <select
                value={formData.paper_size}
                onChange={(e) => setFormData({ ...formData, paper_size: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                {paperSizes.map(size => (
                  <option key={size.value} value={size.value}>{size.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Orientation / الاتجاه
              </label>
              <select
                value={formData.orientation}
                onChange={(e) => setFormData({ ...formData, orientation: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                {orientations.map(orient => (
                  <option key={orient.value} value={orient.value}>{orient.label}</option>
                ))}
              </select>
            </div>
          </div>

          <Input
            label="Header HTML / رأس الصفحة"
            value={formData.header_html}
            onChange={(e) => setFormData({ ...formData, header_html: e.target.value })}
            multiline
            rows={3}
          />

          <Input
            label="Body HTML / محتوى الصفحة"
            value={formData.body_html}
            onChange={(e) => setFormData({ ...formData, body_html: e.target.value })}
            multiline
            rows={6}
          />

          <Input
            label="Footer HTML / تذييل الصفحة"
            value={formData.footer_html}
            onChange={(e) => setFormData({ ...formData, footer_html: e.target.value })}
            multiline
            rows={3}
          />

          <Input
            label="CSS / أنماط CSS"
            value={formData.css}
            onChange={(e) => setFormData({ ...formData, css: e.target.value })}
            multiline
            rows={3}
          />

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_default}
                onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Default Template / قالب افتراضي</span>
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
