import { useEffect, useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '../../config/menu.permissions';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { usePermissions } from '../../hooks/usePermissions';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import { useLocale } from '../../contexts/LocaleContext';
import {
  Cog6ToothIcon,
  PencilIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

interface Setting {
  id: number;
  key: string;
  value: string;
  data_type: 'string' | 'number' | 'boolean' | 'json';
  category: 'general' | 'security' | 'appearance' | 'notifications';
  description?: string;
  is_public: boolean;
  updated_at: string;
}

interface FormData {
  value: string;
  data_type: 'string' | 'number' | 'boolean' | 'json';
}

const categoryLabels: Record<string, string> = {
  general: 'General',
  security: 'Security',
  appearance: 'Appearance',
  notifications: 'Notifications',
};

const categoryIcons: Record<string, string> = {
  general: '⚙️',
  security: '🔒',
  appearance: '🎨',
  notifications: '🔔',
};

function SettingsPage() {
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  const { locale, dir } = useLocale();
  const { t } = useTranslation();

  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSetting, setEditingSetting] = useState<Setting | null>(null);
  const [formData, setFormData] = useState<FormData>({ value: '', data_type: 'string' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:4000/api/settings', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const result = await res.json();
        setSettings(result.data || []);
      } else if (res.status === 401 || res.status === 403) {
        showToast('Access denied', 'error');
      } else {
        showToast('Failed to load settings', 'error');
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      showToast('Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.value.trim()) {
      errors.value = 'Value is required';
    }

    // Type-specific validation
    if (editingSetting) {
      const dataType = editingSetting.data_type;
      
      if (dataType === 'number') {
        if (isNaN(Number(formData.value))) {
          errors.value = 'Must be a valid number';
        }
      } else if (dataType === 'boolean') {
        if (!['true', 'false', '1', '0'].includes(formData.value.toLowerCase())) {
          errors.value = 'Must be true or false';
        }
      } else if (dataType === 'json') {
        try {
          JSON.parse(formData.value);
        } catch {
          errors.value = 'Must be valid JSON';
        }
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenModal = (setting: Setting) => {
    setEditingSetting(setting);
    setFormData({
      value: setting.value || '',
      data_type: setting.data_type,
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingSetting(null);
    setFormData({ value: '', data_type: 'string' });
    setFormErrors({});
  };

  const handleSubmit = async () => {
    if (!validateForm() || !editingSetting) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/settings/${editingSetting.key}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ value: formData.value }),
      });

      if (res.ok) {
        showToast('Setting updated successfully', 'success');
        handleCloseModal();
        fetchSettings();
      } else {
        const error = await res.json();
        showToast(error.error || 'Failed to update setting', 'error');
      }
    } catch (error) {
      console.error('Failed to update setting:', error);
      showToast('Failed to update setting', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter settings
  const filteredSettings = settings.filter((setting) => {
    const matchesSearch =
      setting.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      setting.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = !categoryFilter || setting.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  // Group by category
  const groupedSettings = filteredSettings.reduce((acc, setting) => {
    if (!acc[setting.category]) {
      acc[setting.category] = [];
    }
    acc[setting.category].push(setting);
    return acc;
  }, {} as Record<string, Setting[]>);

  // Get display value based on type
  const getDisplayValue = (setting: Setting): string => {
    if (!setting.value) return '—';
    
    switch (setting.data_type) {
      case 'boolean':
        return setting.value === 'true' || setting.value === '1' ? '✓ Enabled' : '✗ Disabled';
      case 'json':
        try {
          return JSON.stringify(JSON.parse(setting.value), null, 2);
        } catch {
          return setting.value;
        }
      default:
        return setting.value;
    }
  };

  // Permission check
  if (!hasPermission('system_settings:view' as any)) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <Cog6ToothIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            You don't have permission to view system settings.
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>System Settings - SLMS</title>
      </Head>

      <div className="space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">System Settings</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Configure system-wide preferences and options
          </p>
        </div>

        {/* Filters */}
        <div className="card">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search settings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10 w-full"
                />
              </div>
            </div>
            <div className="w-full md:w-64">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="input w-full"
              >
                <option value="">All Categories</option>
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {categoryIcons[key]} {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Settings grouped by category */}
        {loading ? (
          <div className="card text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="text-gray-500 dark:text-gray-400 mt-4">Loading settings...</p>
          </div>
        ) : Object.keys(groupedSettings).length === 0 ? (
          <div className="card text-center py-12">
            <Cog6ToothIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">No settings found</h3>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Try adjusting your search criteria
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedSettings).map(([category, categorySettings]) => (
              <div key={category} className="card">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <span className="text-2xl">{categoryIcons[category]}</span>
                  {categoryLabels[category]}
                </h2>
                
                <div className="space-y-4">
                  {categorySettings.map((setting) => (
                    <div
                      key={setting.id}
                      className="flex items-start justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
                    >
                      <div className="flex-1 min-w-0 mr-4">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {setting.key}
                          </h3>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                            {setting.data_type}
                          </span>
                          {setting.is_public && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                              Public
                            </span>
                          )}
                        </div>
                        
                        {setting.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {setting.description}
                          </p>
                        )}
                        
                        <div className="mt-2">
                          <span className="text-xs text-gray-500 dark:text-gray-500 uppercase tracking-wider">
                            Value:
                          </span>
                          <div className={`text-sm font-mono mt-1 ${
                            setting.data_type === 'json' ? 'whitespace-pre-wrap' : ''
                          }`}>
                            {setting.data_type === 'boolean' ? (
                              <span className={
                                setting.value === 'true' || setting.value === '1'
                                  ? 'text-green-600 dark:text-green-400'
                                  : 'text-red-600 dark:text-red-400'
                              }>
                                {getDisplayValue(setting)}
                              </span>
                            ) : (
                              <span className="text-gray-900 dark:text-gray-100">
                                {getDisplayValue(setting)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {hasPermission('system_settings:edit' as any) && (
                        <button
                          onClick={() => handleOpenModal(setting)}
                          className="flex-shrink-0 p-2 text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <PencilIcon className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        title={`Edit Setting: ${editingSetting?.key}`}
        size="md"
      >
        <div className="space-y-4">
          {editingSetting && (
            <>
              <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Setting Information
                </h4>
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-gray-600 dark:text-gray-400">Key:</dt>
                    <dd className="font-mono text-gray-900 dark:text-gray-100">{editingSetting.key}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-600 dark:text-gray-400">Type:</dt>
                    <dd className="font-mono text-gray-900 dark:text-gray-100">{editingSetting.data_type}</dd>
                  </div>
                  {editingSetting.description && (
                    <div>
                      <dt className="text-gray-600 dark:text-gray-400">Description:</dt>
                      <dd className="text-gray-900 dark:text-gray-100">{editingSetting.description}</dd>
                    </div>
                  )}
                </dl>
              </div>

              {editingSetting.data_type === 'boolean' ? (
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Value <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    className="input"
                  >
                    <option value="true">Enabled (true)</option>
                    <option value="false">Disabled (false)</option>
                  </select>
                  {formErrors.value && (
                    <p className="text-sm text-red-600 dark:text-red-400">{formErrors.value}</p>
                  )}
                </div>
              ) : editingSetting.data_type === 'json' ? (
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Value (JSON) <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    rows={6}
                    className="input font-mono text-sm"
                    placeholder='{"key": "value"}'
                  />
                  {formErrors.value && (
                    <p className="text-sm text-red-600 dark:text-red-400">{formErrors.value}</p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Must be valid JSON format
                  </p>
                </div>
              ) : (
                <Input
                  label="Value"
                  required
                  type={editingSetting.data_type === 'number' ? 'number' : 'text'}
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  error={formErrors.value}
                />
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <Button variant="secondary" onClick={handleCloseModal} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={submitting}>
            Update
          </Button>
        </div>
      </Modal>
    </MainLayout>
  );
}

export default withPermission(MenuPermissions.System.Settings.View, SettingsPage);
