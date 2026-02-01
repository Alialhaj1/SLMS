import { useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { useTranslation } from '../../hooks/useTranslation';
import { usePermissions } from '../../hooks/usePermissions';
import { useToast } from '../../contexts/ToastContext';
import {
  TableCellsIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  PlayIcon,
  EyeIcon,
  Cog6ToothIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface Template {
  id: number;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  category: string;
  categoryAr: string;
  type: 'pivot' | 'cross-tab' | 'trend' | 'comparison';
  columns: string[];
  filters: string[];
  createdBy: string;
  createdAt: string;
  lastUsed: string | null;
  usageCount: number;
}

const mockTemplates: Template[] = [
  { id: 1, name: 'Shipment Analysis by Route', nameAr: 'تحليل الشحنات حسب المسار', description: 'Analyze shipments grouped by routes', descriptionAr: 'تحليل الشحنات مجمعة حسب المسارات', category: 'Shipments', categoryAr: 'الشحنات', type: 'pivot', columns: ['Route', 'Count', 'Total Value', 'Avg Days'], filters: ['Date Range', 'Status'], createdBy: 'Admin', createdAt: '2024-01-15', lastUsed: '2024-01-28', usageCount: 45 },
  { id: 2, name: 'Revenue by Customer Segment', nameAr: 'الإيرادات حسب شريحة العملاء', description: 'Revenue breakdown by customer type', descriptionAr: 'تفصيل الإيرادات حسب نوع العميل', category: 'Financial', categoryAr: 'مالي', type: 'cross-tab', columns: ['Segment', 'Revenue', 'Orders', 'Avg Order'], filters: ['Period', 'Region'], createdBy: 'Finance', createdAt: '2024-01-10', lastUsed: '2024-01-27', usageCount: 32 },
  { id: 3, name: 'Monthly Expense Trend', nameAr: 'اتجاه المصروفات الشهرية', description: 'Track expense trends over time', descriptionAr: 'تتبع اتجاهات المصروفات عبر الزمن', category: 'Financial', categoryAr: 'مالي', type: 'trend', columns: ['Month', 'Total', 'By Category'], filters: ['Year', 'Category'], createdBy: 'Finance', createdAt: '2024-01-05', lastUsed: '2024-01-26', usageCount: 28 },
  { id: 4, name: 'Port Performance Comparison', nameAr: 'مقارنة أداء الموانئ', description: 'Compare clearance times across ports', descriptionAr: 'مقارنة أوقات التخليص عبر الموانئ', category: 'Customs', categoryAr: 'الجمارك', type: 'comparison', columns: ['Port', 'Avg Time', 'Volume', 'Efficiency'], filters: ['Date Range'], createdBy: 'Operations', createdAt: '2024-01-08', lastUsed: '2024-01-25', usageCount: 21 },
  { id: 5, name: 'Supplier Cost Analysis', nameAr: 'تحليل تكاليف الموردين', description: 'Analyze costs by supplier', descriptionAr: 'تحليل التكاليف حسب المورد', category: 'Purchasing', categoryAr: 'المشتريات', type: 'pivot', columns: ['Supplier', 'Orders', 'Total', 'Avg Price'], filters: ['Category', 'Period'], createdBy: 'Procurement', createdAt: '2024-01-12', lastUsed: null, usageCount: 0 },
  { id: 6, name: 'Warehouse Utilization Report', nameAr: 'تقرير استخدام المستودع', description: 'Track warehouse space usage', descriptionAr: 'تتبع استخدام مساحة المستودع', category: 'Inventory', categoryAr: 'المخزون', type: 'trend', columns: ['Location', 'Capacity', 'Used', 'Available'], filters: ['Warehouse', 'Date'], createdBy: 'Warehouse', createdAt: '2024-01-18', lastUsed: '2024-01-24', usageCount: 15 },
];

export default function AnalyticalTemplatesPage() {
  const { t, locale } = useTranslation();
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<Template[]>(mockTemplates);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(false);

  const categories = ['all', ...new Set(templates.map(t => t.category))];

  const filteredTemplates = templates.filter(template => {
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) || template.nameAr.includes(searchQuery);
    return matchesCategory && matchesSearch;
  });

  const handleRun = async (template: Template) => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setLoading(false);
    showToast(locale === 'ar' ? 'تم تشغيل القالب بنجاح' : 'Template executed successfully', 'success');
  };

  const handleDuplicate = (template: Template) => {
    const newTemplate = {
      ...template,
      id: templates.length + 1,
      name: `${template.name} (Copy)`,
      nameAr: `${template.nameAr} (نسخة)`,
      usageCount: 0,
      lastUsed: null,
    };
    setTemplates([...templates, newTemplate]);
    showToast(locale === 'ar' ? 'تم نسخ القالب' : 'Template duplicated', 'success');
  };

  const handleDelete = (id: number) => {
    setTemplates(templates.filter(t => t.id !== id));
    showToast(locale === 'ar' ? 'تم حذف القالب' : 'Template deleted', 'success');
  };

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      pivot: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      'cross-tab': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      trend: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      comparison: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    };
    const labels: Record<string, { en: string; ar: string }> = {
      pivot: { en: 'Pivot', ar: 'محوري' },
      'cross-tab': { en: 'Cross-Tab', ar: 'جدول متقاطع' },
      trend: { en: 'Trend', ar: 'اتجاه' },
      comparison: { en: 'Comparison', ar: 'مقارنة' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[type])}>
        {locale === 'ar' ? labels[type]?.ar : labels[type]?.en}
      </span>
    );
  };

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'القوالب التحليلية - SLMS' : 'Analytical Templates - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
              <TableCellsIcon className="h-6 w-6 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {locale === 'ar' ? 'القوالب التحليلية' : 'Analytical Templates'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'إنشاء وإدارة قوالب التقارير المخصصة' : 'Create and manage custom report templates'}
              </p>
            </div>
          </div>
          <Button onClick={() => setShowModal(true)}>
            <PlusIcon className="h-4 w-4 mr-1" />
            {locale === 'ar' ? 'قالب جديد' : 'New Template'}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600">
                <TableCellsIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'إجمالي القوالب' : 'Total Templates'}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{templates.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600">
                <ChartBarIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الأكثر استخداماً' : 'Most Used'}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{Math.max(...templates.map(t => t.usageCount))}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600">
                <FunnelIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الفئات' : 'Categories'}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{categories.length - 1}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-600">
                <PlayIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'إجمالي التشغيلات' : 'Total Runs'}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{templates.reduce((sum, t) => sum + t.usageCount, 0)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder={locale === 'ar' ? 'بحث في القوالب...' : 'Search templates...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={clsx(
                    'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                    selectedCategory === cat
                      ? 'bg-teal-600 text-white'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  )}
                >
                  {cat === 'all' ? (locale === 'ar' ? 'الكل' : 'All') : cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <div key={template.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 dark:text-white">{locale === 'ar' ? template.nameAr : template.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{locale === 'ar' ? template.descriptionAr : template.description}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {getTypeBadge(template.type)}
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                  {locale === 'ar' ? template.categoryAr : template.category}
                </span>
              </div>
              <div className="text-xs text-gray-400 mb-3 space-y-1">
                <p>{locale === 'ar' ? 'الأعمدة:' : 'Columns:'} {template.columns.join(', ')}</p>
                <p>{locale === 'ar' ? 'استخدم' : 'Used'} {template.usageCount} {locale === 'ar' ? 'مرة' : 'times'}</p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" onClick={() => handleRun(template)} loading={loading}>
                  <PlayIcon className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setSelectedTemplate(template)}>
                  <EyeIcon className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="secondary" onClick={() => handleDuplicate(template)}>
                  <DocumentDuplicateIcon className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="secondary">
                  <PencilIcon className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="danger" onClick={() => handleDelete(template.id)}>
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <TableCellsIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'لا توجد قوالب مطابقة' : 'No matching templates found'}</p>
          </div>
        )}
      </div>

      {/* Create Template Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={locale === 'ar' ? 'قالب جديد' : 'New Template'} size="lg">
        <div className="space-y-4">
          <Input label={locale === 'ar' ? 'اسم القالب' : 'Template Name'} placeholder={locale === 'ar' ? 'أدخل اسم القالب' : 'Enter template name'} />
          <Input label={locale === 'ar' ? 'الاسم بالعربية' : 'Arabic Name'} placeholder={locale === 'ar' ? 'أدخل الاسم بالعربية' : 'Enter Arabic name'} />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الوصف' : 'Description'}</label>
            <textarea className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" rows={3} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'النوع' : 'Type'}</label>
            <select className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option value="pivot">{locale === 'ar' ? 'محوري' : 'Pivot'}</option>
              <option value="cross-tab">{locale === 'ar' ? 'جدول متقاطع' : 'Cross-Tab'}</option>
              <option value="trend">{locale === 'ar' ? 'اتجاه' : 'Trend'}</option>
              <option value="comparison">{locale === 'ar' ? 'مقارنة' : 'Comparison'}</option>
            </select>
          </div>
          <div className="flex gap-2 pt-4">
            <Button onClick={() => { setShowModal(false); showToast(locale === 'ar' ? 'تم إنشاء القالب' : 'Template created', 'success'); }}>{locale === 'ar' ? 'إنشاء' : 'Create'}</Button>
            <Button variant="secondary" onClick={() => setShowModal(false)}>{locale === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
          </div>
        </div>
      </Modal>

      {/* Template Detail Modal */}
      <Modal isOpen={!!selectedTemplate} onClose={() => setSelectedTemplate(null)} title={locale === 'ar' ? 'تفاصيل القالب' : 'Template Details'} size="lg">
        {selectedTemplate && (
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white text-lg">{locale === 'ar' ? selectedTemplate.nameAr : selectedTemplate.name}</h3>
              <p className="text-gray-500 dark:text-gray-400 mt-1">{locale === 'ar' ? selectedTemplate.descriptionAr : selectedTemplate.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'النوع' : 'Type'}</p>
                <p className="font-medium mt-1">{getTypeBadge(selectedTemplate.type)}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'الفئة' : 'Category'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{locale === 'ar' ? selectedTemplate.categoryAr : selectedTemplate.category}</p>
              </div>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-xs text-gray-500 mb-2">{locale === 'ar' ? 'الأعمدة' : 'Columns'}</p>
              <div className="flex flex-wrap gap-1">
                {selectedTemplate.columns.map((col, idx) => (
                  <span key={idx} className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded">{col}</span>
                ))}
              </div>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-xs text-gray-500 mb-2">{locale === 'ar' ? 'الفلاتر' : 'Filters'}</p>
              <div className="flex flex-wrap gap-1">
                {selectedTemplate.filters.map((filter, idx) => (
                  <span key={idx} className="px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded">{filter}</span>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
              <Button onClick={() => handleRun(selectedTemplate)} loading={loading}>{locale === 'ar' ? 'تشغيل' : 'Run'}</Button>
              <Button variant="secondary"><PencilIcon className="h-4 w-4 mr-1" />{locale === 'ar' ? 'تعديل' : 'Edit'}</Button>
              <Button variant="secondary" onClick={() => handleDuplicate(selectedTemplate)}><DocumentDuplicateIcon className="h-4 w-4 mr-1" />{locale === 'ar' ? 'نسخ' : 'Duplicate'}</Button>
            </div>
          </div>
        )}
      </Modal>
    </MainLayout>
  );
}
