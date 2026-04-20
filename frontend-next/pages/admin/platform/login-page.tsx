/**
 * ============================================================================
 * LOGIN PAGE CONTENT MANAGEMENT — إدارة محتوى صفحة الدخول
 * ============================================================================
 * Admin interface for managing the public login page content.
 * Two tabs: Content Items | Settings
 *
 * Content Sections:
 *   hero_slide, announcement, news, feature, promo_banner,
 *   partner_logo, testimonial, faq
 *
 * @module pages/admin/platform/login-page
 */

import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/hooks/useToast';
import loginPageService from '@/lib/loginPageService';
import type { LoginPageContentItem, LoginPageSettings } from '@/lib/loginPageService';
import {
  PencilSquareIcon,
  TrashIcon,
  PlusIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  Cog6ToothIcon,
  NewspaperIcon,
  PhotoIcon,
  MegaphoneIcon,
  RocketLaunchIcon,
  StarIcon,
  QuestionMarkCircleIcon,
  SparklesIcon,
  CheckIcon,
  XMarkIcon,
  ArrowPathIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';

// ============================================================================
// SECTION LABELS
// ============================================================================
const SECTION_META: Record<string, { label: string; label_ar: string; icon: React.ComponentType<{ className?: string }> }> = {
  hero_slide:    { label: 'Hero Slides',       label_ar: 'شرائح العرض الرئيسية', icon: PhotoIcon },
  announcement:  { label: 'Announcements',     label_ar: 'الإعلانات',            icon: MegaphoneIcon },
  news:          { label: 'News',              label_ar: 'الأخبار',              icon: NewspaperIcon },
  feature:       { label: 'Features',          label_ar: 'المميزات',             icon: RocketLaunchIcon },
  promo_banner:  { label: 'Promo Banners',     label_ar: 'البانرات الترويجية',   icon: SparklesIcon },
  partner_logo:  { label: 'Partner Logos',     label_ar: 'شعارات الشركاء',       icon: DocumentDuplicateIcon },
  testimonial:   { label: 'Testimonials',      label_ar: 'آراء العملاء',         icon: StarIcon },
  faq:           { label: 'FAQ',               label_ar: 'الأسئلة الشائعة',      icon: QuestionMarkCircleIcon },
};

const SECTIONS = Object.keys(SECTION_META);

// ============================================================================
// CONTENT ITEM FORM
// ============================================================================
interface ContentFormProps {
  item?: Partial<LoginPageContentItem>;
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
  isRTL: boolean;
  saving: boolean;
}

function ContentForm({ item, onSave, onCancel, isRTL, saving }: ContentFormProps) {
  const [form, setForm] = useState({
    section: item?.section || 'hero_slide',
    title: item?.title || '',
    title_ar: item?.title_ar || '',
    subtitle: item?.subtitle || '',
    subtitle_ar: item?.subtitle_ar || '',
    body: item?.body || '',
    body_ar: item?.body_ar || '',
    icon: item?.icon || '',
    image_url: item?.image_url || '',
    link_url: item?.link_url || '',
    link_label: item?.link_label || '',
    link_label_ar: item?.link_label_ar || '',
    badge_text: item?.badge_text || '',
    badge_text_ar: item?.badge_text_ar || '',
    display_order: item?.display_order ?? 0,
    is_active: item?.is_active ?? true,
  });

  const upd = (key: string, val: any) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(form);
  };

  const Field = ({ label, name, type = 'text', dir, rows }: { label: string; name: string; type?: string; dir?: string; rows?: number }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      {rows ? (
        <textarea value={(form as any)[name] || ''} onChange={e => upd(name, e.target.value)} rows={rows}
          dir={dir} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm" />
      ) : (
        <input type={type} value={(form as any)[name] || ''} onChange={e => upd(name, type === 'number' ? parseInt(e.target.value) || 0 : e.target.value)}
          dir={dir} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm" />
      )}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        {item?.id ? (isRTL ? 'تعديل المحتوى' : 'Edit Content') : (isRTL ? 'إضافة محتوى جديد' : 'Add New Content')}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {isRTL ? 'القسم' : 'Section'}
          </label>
          <select value={form.section} onChange={e => upd('section', e.target.value)} disabled={!!item?.id}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm">
            {SECTIONS.map(s => (
              <option key={s} value={s}>{isRTL ? SECTION_META[s].label_ar : SECTION_META[s].label}</option>
            ))}
          </select>
        </div>

        <Field label={isRTL ? 'ترتيب العرض' : 'Display Order'} name="display_order" type="number" />
        <Field label={isRTL ? 'العنوان (EN)' : 'Title (EN)'} name="title" />
        <Field label={isRTL ? 'العنوان (AR)' : 'Title (AR)'} name="title_ar" dir="rtl" />
        <Field label={isRTL ? 'العنوان الفرعي (EN)' : 'Subtitle (EN)'} name="subtitle" />
        <Field label={isRTL ? 'العنوان الفرعي (AR)' : 'Subtitle (AR)'} name="subtitle_ar" dir="rtl" />
        <Field label={isRTL ? 'الأيقونة' : 'Icon Name'} name="icon" />
        <Field label={isRTL ? 'رابط الصورة' : 'Image URL'} name="image_url" />
        <Field label={isRTL ? 'رابط' : 'Link URL'} name="link_url" />
        <Field label={isRTL ? 'نص الرابط (EN)' : 'Link Label (EN)'} name="link_label" />
        <Field label={isRTL ? 'نص الرابط (AR)' : 'Link Label (AR)'} name="link_label_ar" dir="rtl" />
        <Field label={isRTL ? 'نص الشارة (EN)' : 'Badge Text (EN)'} name="badge_text" />
        <Field label={isRTL ? 'نص الشارة (AR)' : 'Badge Text (AR)'} name="badge_text_ar" dir="rtl" />
      </div>

      <Field label={isRTL ? 'المحتوى (EN)' : 'Body (EN)'} name="body" rows={3} />
      <Field label={isRTL ? 'المحتوى (AR)' : 'Body (AR)'} name="body_ar" dir="rtl" rows={3} />

      <div className="flex items-center gap-2">
        <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => upd('is_active', e.target.checked)}
          className="w-4 h-4 rounded border-gray-300" />
        <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-gray-300">
          {isRTL ? 'نشط' : 'Active'}
        </label>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={saving}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2">
          {saving ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <CheckIcon className="w-4 h-4" />}
          {saving ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'حفظ' : 'Save')}
        </button>
        <button type="button" onClick={onCancel}
          className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2">
          <XMarkIcon className="w-4 h-4" />
          {isRTL ? 'إلغاء' : 'Cancel'}
        </button>
      </div>
    </form>
  );
}

// ============================================================================
// SETTINGS TAB
// ============================================================================
interface SettingsTabProps {
  settings: Record<string, any>;
  onUpdate: (key: string, value: any) => Promise<void>;
  isRTL: boolean;
}

function SettingsTab({ settings, onUpdate, isRTL }: SettingsTabProps) {
  const settingsDef = [
    { key: 'show_announcements', label: 'Show Announcements', label_ar: 'إظهار الإعلانات', type: 'boolean' },
    { key: 'show_features', label: 'Show Features', label_ar: 'إظهار المميزات', type: 'boolean' },
    { key: 'show_news', label: 'Show News', label_ar: 'إظهار الأخبار', type: 'boolean' },
    { key: 'show_promo_banner', label: 'Show Promo Banner', label_ar: 'إظهار البانر الترويجي', type: 'boolean' },
    { key: 'show_testimonials', label: 'Show Testimonials', label_ar: 'إظهار آراء العملاء', type: 'boolean' },
    { key: 'show_faq', label: 'Show FAQ', label_ar: 'إظهار الأسئلة الشائعة', type: 'boolean' },
    { key: 'show_account_request', label: 'Show Account Request', label_ar: 'إظهار زر طلب حساب', type: 'boolean' },
    { key: 'auto_slide_interval', label: 'Slide Interval (ms)', label_ar: 'سرعة الشرائح (مللي ثانية)', type: 'number' },
    { key: 'footer_text', label: 'Footer Text (EN)', label_ar: 'نص التذييل (EN)', type: 'string' },
    { key: 'footer_text_ar', label: 'Footer Text (AR)', label_ar: 'نص التذييل (AR)', type: 'string' },
    { key: 'contact_email', label: 'Contact Email', label_ar: 'بريد التواصل', type: 'string' },
    { key: 'contact_phone', label: 'Contact Phone', label_ar: 'هاتف التواصل', type: 'string' },
    { key: 'contact_whatsapp', label: 'WhatsApp Number', label_ar: 'رقم واتساب', type: 'string' },
  ];

  return (
    <div className="space-y-4">
      {settingsDef.map(s => (
        <div key={s.key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {isRTL ? s.label_ar : s.label}
          </span>
          {s.type === 'boolean' ? (
            <button onClick={() => onUpdate(s.key, !settings[s.key])}
              className={`relative w-12 h-6 rounded-full transition-colors ${settings[s.key] ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${settings[s.key] ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          ) : s.type === 'number' ? (
            <input type="number" value={settings[s.key] || ''} onChange={e => onUpdate(s.key, parseInt(e.target.value) || 0)}
              className="w-28 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm text-center" />
          ) : (
            <input type="text" value={settings[s.key] || ''} onBlur={e => onUpdate(s.key, e.target.value)}
              onChange={e => {
                const val = e.target.value;
                // local change only — saved on blur
                e.target.dataset.pending = val;
              }}
              defaultValue={settings[s.key] || ''}
              className="w-64 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              dir={s.key.endsWith('_ar') ? 'rtl' : 'ltr'} />
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================
export default function LoginPageManagement() {
  const { token } = useAuth();
  const { locale } = useLocale();
  const { showToast } = useToast();
  const isRTL = locale === 'ar';

  const [tab, setTab] = useState<'content' | 'settings'>('content');
  const [items, setItems] = useState<LoginPageContentItem[]>([]);
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [sectionFilter, setSectionFilter] = useState<string>('all');
  const [editingItem, setEditingItem] = useState<Partial<LoginPageContentItem> | null>(null);
  const [saving, setSaving] = useState(false);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [contentRes, settingsRes] = await Promise.all([
        loginPageService.adminGetContent(token!),
        loginPageService.adminGetSettings(token!),
      ]);
      setItems(contentRes);
      const sMap: Record<string, any> = {};
      settingsRes.forEach((s: any) => {
        if (s.value_type === 'boolean') sMap[s.setting_key] = s.setting_value === 'true';
        else if (s.value_type === 'number') sMap[s.setting_key] = parseInt(s.setting_value) || 0;
        else sMap[s.setting_key] = s.setting_value;
      });
      setSettings(sMap);
    } catch (e) {
      showToast(isRTL ? 'فشل تحميل البيانات' : 'Failed to load data', 'error');
    }
    setLoading(false);
  }, [token, isRTL, showToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Save content item
  const handleSaveContent = async (data: any) => {
    setSaving(true);
    try {
      if (editingItem?.id) {
        await loginPageService.adminUpdateContent(token!, editingItem.id, data);
        showToast(isRTL ? 'تم التحديث بنجاح' : 'Updated successfully', 'success');
      } else {
        await loginPageService.adminCreateContent(token!, data);
        showToast(isRTL ? 'تمت الإضافة بنجاح' : 'Created successfully', 'success');
      }
      setEditingItem(null);
      fetchData();
    } catch {
      showToast(isRTL ? 'فشل الحفظ' : 'Save failed', 'error');
    }
    setSaving(false);
  };

  // Toggle active
  const handleToggle = async (id: number) => {
    try {
      await loginPageService.adminToggleContent(token!, id);
      fetchData();
    } catch {
      showToast(isRTL ? 'فشل التبديل' : 'Toggle failed', 'error');
    }
  };

  // Delete
  const handleDelete = async (id: number) => {
    if (!confirm(isRTL ? 'هل أنت متأكد من الحذف؟' : 'Are you sure you want to delete?')) return;
    try {
      await loginPageService.adminDeleteContent(token!, id);
      showToast(isRTL ? 'تم الحذف' : 'Deleted', 'success');
      fetchData();
    } catch {
      showToast(isRTL ? 'فشل الحذف' : 'Delete failed', 'error');
    }
  };

  // Move order
  const handleMove = async (id: number, direction: 'up' | 'down') => {
    const idx = items.findIndex(i => i.id === id);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= items.length) return;
    const ids = [items[idx].id, items[swapIdx].id];
    try {
      await loginPageService.adminReorderContent(token!, ids);
      fetchData();
    } catch { /* silent */ }
  };

  // Update setting
  const handleUpdateSetting = async (key: string, value: any) => {
    const strValue = String(value);
    setSettings(prev => ({ ...prev, [key]: value }));
    try {
      await loginPageService.adminUpdateSetting(token!, key, strValue);
    } catch {
      showToast(isRTL ? 'فشل تحديث الإعداد' : 'Setting update failed', 'error');
    }
  };

  // Filtered items
  const filteredItems = sectionFilter === 'all' ? items : items.filter(i => i.section === sectionFilter);

  return (
    <MainLayout>
      <Head>
        <title>{isRTL ? 'إدارة صفحة الدخول' : 'Login Page Management'} - SLMS</title>
      </Head>

      <div className="p-6 max-w-7xl mx-auto" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isRTL ? 'إدارة صفحة تسجيل الدخول' : 'Login Page Management'}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              {isRTL ? 'تحكم بمحتوى وإعدادات صفحة الدخول العامة' : 'Manage public login page content and settings'}
            </p>
          </div>
          <a href="/auth/login" target="_blank" rel="noopener noreferrer"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2">
            <EyeIcon className="w-4 h-4" />
            {isRTL ? 'معاينة' : 'Preview'}
          </a>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-6 w-fit">
          <button onClick={() => setTab('content')}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              tab === 'content' ? 'bg-white dark:bg-gray-700 shadow text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
            }`}>
            <NewspaperIcon className="w-4 h-4" />
            {isRTL ? 'المحتوى' : 'Content'}
          </button>
          <button onClick={() => setTab('settings')}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              tab === 'settings' ? 'bg-white dark:bg-gray-700 shadow text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
            }`}>
            <Cog6ToothIcon className="w-4 h-4" />
            {isRTL ? 'الإعدادات' : 'Settings'}
          </button>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block w-10 h-10 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : tab === 'content' ? (
          <div className="space-y-6">
            {/* Section filter + Add button */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setSectionFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    sectionFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                  }`}>
                  {isRTL ? 'الكل' : 'All'} ({items.length})
                </button>
                {SECTIONS.map(s => {
                  const count = items.filter(i => i.section === s).length;
                  if (count === 0 && sectionFilter !== s) return null;
                  const Icon = SECTION_META[s].icon;
                  return (
                    <button key={s} onClick={() => setSectionFilter(s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                        sectionFilter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                      }`}>
                      <Icon className="w-3.5 h-3.5" />
                      {isRTL ? SECTION_META[s].label_ar : SECTION_META[s].label} ({count})
                    </button>
                  );
                })}
              </div>
              <button onClick={() => setEditingItem({ section: sectionFilter === 'all' ? 'hero_slide' : sectionFilter })}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2">
                <PlusIcon className="w-4 h-4" />
                {isRTL ? 'إضافة محتوى' : 'Add Content'}
              </button>
            </div>

            {/* Edit Form */}
            {editingItem && (
              <ContentForm
                item={editingItem}
                onSave={handleSaveContent}
                onCancel={() => setEditingItem(null)}
                isRTL={isRTL}
                saving={saving}
              />
            )}

            {/* Content Table */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50">
                    <th className="px-4 py-3 text-start text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">#</th>
                    <th className="px-4 py-3 text-start text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                      {isRTL ? 'القسم' : 'Section'}
                    </th>
                    <th className="px-4 py-3 text-start text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                      {isRTL ? 'العنوان' : 'Title'}
                    </th>
                    <th className="px-4 py-3 text-start text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                      {isRTL ? 'الحالة' : 'Status'}
                    </th>
                    <th className="px-4 py-3 text-end text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                      {isRTL ? 'إجراءات' : 'Actions'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredItems.map((item, idx) => {
                    const meta = SECTION_META[item.section];
                    const Icon = meta?.icon || SparklesIcon;
                    return (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-500">{item.display_order}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-medium">
                            <Icon className="w-3.5 h-3.5" />
                            {isRTL ? meta?.label_ar : meta?.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-xs">
                            {isRTL ? item.title_ar || item.title : item.title || item.title_ar}
                          </p>
                          <p className="text-xs text-gray-500 truncate max-w-xs">
                            {isRTL ? item.subtitle_ar || item.subtitle : item.subtitle || item.subtitle_ar}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            item.is_active ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                          }`}>
                            {item.is_active ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'معطل' : 'Inactive')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => handleMove(item.id, 'up')} title="Move Up"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                              <ArrowUpIcon className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleMove(item.id, 'down')} title="Move Down"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                              <ArrowDownIcon className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleToggle(item.id)} title="Toggle"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
                              {item.is_active ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                            </button>
                            <button onClick={() => setEditingItem(item)} title="Edit"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
                              <PencilSquareIcon className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(item.id)} title="Delete"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredItems.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                        {isRTL ? 'لا يوجد محتوى' : 'No content items'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <SettingsTab settings={settings} onUpdate={handleUpdateSetting} isRTL={isRTL} />
        )}
      </div>
    </MainLayout>
  );
}
