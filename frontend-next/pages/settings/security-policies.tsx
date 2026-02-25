/**
 * 🔐 Security Policies - سياسات الأمان
 * =====================================================
 * إدارة سياسات الأمان وكلمات المرور والجلسات
 * Connected to /api/system-policies?category=security
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';
import {
  LockClosedIcon,
  ArrowPathIcon,
  CheckIcon,
  KeyIcon,
  ClockIcon,
  ShieldExclamationIcon,
  FingerPrintIcon,
  DevicePhoneMobileIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useToast } from '../../contexts/ToastContext';
import { useTranslation } from '../../hooks/useTranslation';
import { usePermissions } from '../../hooks/usePermissions';
import clsx from 'clsx';

/* ------------------------------------------------------------------ */
/*  Types & helpers                                                   */
/* ------------------------------------------------------------------ */

interface SecurityPolicies {
  // Password Policies
  password_min_length: number;
  password_require_uppercase: boolean;
  password_require_lowercase: boolean;
  password_require_numbers: boolean;
  password_require_symbols: boolean;
  password_expiry_days: number;
  password_history_count: number;
  password_max_attempts: number;
  
  // Session Policies
  session_timeout_minutes: number;
  session_max_concurrent: number;
  session_extend_on_activity: boolean;
  session_single_device: boolean;
  session_remember_me_days: number;
  
  // Account Security
  account_lockout_duration_minutes: number;
  account_lockout_threshold: number;
  account_require_email_verification: boolean;
  account_require_phone_verification: boolean;
  
  // Two-Factor Authentication
  tfa_enabled: boolean;
  tfa_required_for_admins: boolean;
  tfa_methods: ('app' | 'sms' | 'email')[];
  
  // IP & Access
  ip_whitelist_enabled: boolean;
  ip_whitelist: string[];
  ip_blacklist_enabled: boolean;
  ip_blacklist: string[];
  
  // Audit & Logging
  audit_login_attempts: boolean;
  audit_password_changes: boolean;
  audit_permission_changes: boolean;
  audit_retention_days: number;
}

/** Maps every SecurityPolicies field → its matching policy_key in system_policies */
const FIELD_TO_POLICY_KEY: Record<keyof SecurityPolicies, string> = {
  password_min_length: 'password_min_length',
  password_require_uppercase: 'password_require_uppercase',
  password_require_lowercase: 'password_require_lowercase',
  password_require_numbers: 'password_require_number',          // DB key differs
  password_require_symbols: 'password_require_special_char',    // DB key differs
  password_expiry_days: 'password_expiry_days',
  password_history_count: 'password_history_count',
  password_max_attempts: 'max_login_attempts',                  // DB key differs
  session_timeout_minutes: 'session_timeout_minutes',
  session_max_concurrent: 'session_max_concurrent',
  session_extend_on_activity: 'session_extend_on_activity',
  session_single_device: 'session_single_device',
  session_remember_me_days: 'refresh_token_expiry_days',        // DB key differs
  account_lockout_duration_minutes: 'lockout_duration_minutes', // DB key differs
  account_lockout_threshold: 'account_lockout_threshold',
  account_require_email_verification: 'account_require_email_verification',
  account_require_phone_verification: 'account_require_phone_verification',
  tfa_enabled: 'enable_2fa',                                    // DB key differs
  tfa_required_for_admins: 'tfa_required_for_admins',
  tfa_methods: 'tfa_methods',
  ip_whitelist_enabled: 'ip_whitelist_enabled',
  ip_whitelist: 'ip_whitelist',
  ip_blacklist_enabled: 'ip_blacklist_enabled',
  ip_blacklist: 'ip_blacklist',
  audit_login_attempts: 'audit_login_attempts',
  audit_password_changes: 'audit_password_changes',
  audit_permission_changes: 'audit_permission_changes',
  audit_retention_days: 'audit_retention_days',
};

/** Reverse lookup: policy_key → SecurityPolicies field name */
const POLICY_KEY_TO_FIELD: Record<string, keyof SecurityPolicies> = {};
for (const [field, pk] of Object.entries(FIELD_TO_POLICY_KEY)) {
  POLICY_KEY_TO_FIELD[pk] = field as keyof SecurityPolicies;
}

const DEFAULTS: SecurityPolicies = {
  password_min_length: 8,
  password_require_uppercase: true,
  password_require_lowercase: true,
  password_require_numbers: true,
  password_require_symbols: false,
  password_expiry_days: 90,
  password_history_count: 5,
  password_max_attempts: 5,
  session_timeout_minutes: 30,
  session_max_concurrent: 3,
  session_extend_on_activity: true,
  session_single_device: false,
  session_remember_me_days: 30,
  account_lockout_duration_minutes: 30,
  account_lockout_threshold: 5,
  account_require_email_verification: true,
  account_require_phone_verification: false,
  tfa_enabled: true,
  tfa_required_for_admins: true,
  tfa_methods: ['app', 'sms'],
  ip_whitelist_enabled: false,
  ip_whitelist: [],
  ip_blacklist_enabled: false,
  ip_blacklist: [],
  audit_login_attempts: true,
  audit_password_changes: true,
  audit_permission_changes: true,
  audit_retention_days: 365,
};

/** Parse a string value coming from the DB into the right JS type */
function parseValue(value: string, dataType: string, field: keyof SecurityPolicies): any {
  if (dataType === 'boolean') return value === 'true';
  if (dataType === 'integer' || dataType === 'number' || dataType === 'float') return Number(value) || 0;
  if (dataType === 'json') {
    try { return JSON.parse(value); } catch { return DEFAULTS[field]; }
  }
  return value;
}

/** Serialize a JS value to the DB string format */
function serializeValue(value: any): string {
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value) || typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

const API_BASE = (typeof window !== 'undefined' && (window as any).__NEXT_DATA__?.runtimeConfig?.apiUrl)
  || process.env.NEXT_PUBLIC_API_URL
  || 'http://localhost:4000';

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function SecurityPoliciesPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState<'password' | 'session' | 'tfa' | 'access' | 'audit'>('password');
  
  const [policies, setPolicies] = useState<SecurityPolicies>({ ...DEFAULTS });

  /** Track DB row ids per policy_key so we can PUT to the right row */
  const policyRowMap = useRef<Record<string, { id: number; data_type: string }>>({});
  /** Snapshot of last-saved state so we only send changed fields */
  const savedSnapshot = useRef<SecurityPolicies>({ ...DEFAULTS });

  const canManage = hasPermission('system_policies:edit');

  /* ---------- Fetch all security-category policies from the real API ---------- */
  const fetchPolicies = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(
        `${API_BASE}/api/system-policies?category=security&limit=100`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();
      const rows: any[] = json.data ?? json.rows ?? json ?? [];

      const newState: SecurityPolicies = { ...DEFAULTS };
      const newMap: Record<string, { id: number; data_type: string }> = {};

      for (const row of rows) {
        const field = POLICY_KEY_TO_FIELD[row.policy_key];
        if (!field) continue; // skip unknown keys
        newMap[row.policy_key] = { id: row.id, data_type: row.data_type || 'string' };
        (newState as any)[field] = parseValue(row.policy_value, row.data_type || 'string', field);
      }

      policyRowMap.current = newMap;
      savedSnapshot.current = { ...newState };
      setPolicies(newState);
    } catch (error) {
      console.error('Failed to fetch security policies:', error);
      // Keep defaults on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPolicies(); }, [fetchPolicies]);

  /* ---------- Generic field change handler ---------- */
  const handleChange = <K extends keyof SecurityPolicies>(key: K, value: SecurityPolicies[K]) => {
    setPolicies(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  /* ---------- Save – PUT only changed policies ---------- */
  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('accessToken');
      const changedFields: (keyof SecurityPolicies)[] = [];

      // Detect which fields actually changed
      for (const field of Object.keys(DEFAULTS) as (keyof SecurityPolicies)[]) {
        const cur = policies[field];
        const prev = savedSnapshot.current[field];
        if (JSON.stringify(cur) !== JSON.stringify(prev)) {
          changedFields.push(field);
        }
      }

      if (changedFields.length === 0) {
        setHasChanges(false);
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      for (const field of changedFields) {
        const policyKey = FIELD_TO_POLICY_KEY[field];
        const rowInfo = policyRowMap.current[policyKey];

        if (rowInfo) {
          // PUT existing row
          const res = await fetch(`${API_BASE}/api/system-policies/${rowInfo.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ policy_value: serializeValue(policies[field]) }),
          });
          if (res.ok) {
            successCount++;
          } else {
            console.error(`Failed to update ${policyKey}:`, await res.text());
            errorCount++;
          }
        } else {
          // POST new row (policy not yet in DB)
          const dataType = typeof policies[field] === 'boolean'
            ? 'boolean'
            : typeof policies[field] === 'number'
              ? 'integer'
              : Array.isArray(policies[field]) || typeof policies[field] === 'object'
                ? 'json'
                : 'string';

          const res = await fetch(`${API_BASE}/api/system-policies`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              policy_key: policyKey,
              policy_value: serializeValue(policies[field]),
              data_type: dataType,
              category: 'security',
              is_system_policy: true,
              is_active: true,
            }),
          });
          if (res.ok) {
            const created = await res.json();
            policyRowMap.current[policyKey] = {
              id: created.data?.id ?? created.id,
              data_type: dataType,
            };
            successCount++;
          } else {
            console.error(`Failed to create ${policyKey}:`, await res.text());
            errorCount++;
          }
        }
      }

      if (errorCount === 0) {
        showToast('success', t('common.saveSuccess'));
        savedSnapshot.current = { ...policies };
        setHasChanges(false);
      } else if (successCount > 0) {
        showToast('warning', `${successCount} saved, ${errorCount} failed`);
        savedSnapshot.current = { ...policies };
      } else {
        showToast('error', t('common.error'));
      }
    } catch (error) {
      console.error('Save error:', error);
      showToast('error', t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'password', label: t('security.password'), icon: KeyIcon },
    { id: 'session', label: t('security.session'), icon: ClockIcon },
    { id: 'tfa', label: t('security.tfa'), icon: FingerPrintIcon },
    { id: 'access', label: t('security.access'), icon: ShieldExclamationIcon },
    { id: 'audit', label: t('security.audit'), icon: DevicePhoneMobileIcon },
  ];

  const getPasswordStrength = () => {
    let strength = 0;
    if (policies.password_min_length >= 8) strength++;
    if (policies.password_min_length >= 12) strength++;
    if (policies.password_require_uppercase) strength++;
    if (policies.password_require_lowercase) strength++;
    if (policies.password_require_numbers) strength++;
    if (policies.password_require_symbols) strength++;
    
    if (strength <= 2) return { label: t('security.weak'), color: 'text-red-500', bg: 'bg-red-500' };
    if (strength <= 4) return { label: t('security.medium'), color: 'text-yellow-500', bg: 'bg-yellow-500' };
    return { label: t('security.strong'), color: 'text-green-500', bg: 'bg-green-500' };
  };

  const passwordStrength = getPasswordStrength();

  return (
    <MainLayout>
      <Head>
        <title>{t('security.title')} | SLMS</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <LockClosedIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                {t('security.title')}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t('security.subtitle')}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Button onClick={handleSave} loading={saving} disabled={!canManage}>
                <CheckIcon className="w-5 h-5 me-2" />
                {t('common.saveChanges')}
              </Button>
            )}
            <Button variant="secondary" onClick={fetchPolicies} disabled={loading}>
              <ArrowPathIcon className={clsx('w-5 h-5', loading && 'animate-spin')} />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
            <nav className="flex -mb-px">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={clsx(
                    'flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
                    activeTab === tab.id
                      ? 'border-red-500 text-red-600 dark:text-red-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                  )}
                >
                  <tab.icon className="w-5 h-5" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <ArrowPathIcon className="w-8 h-8 text-gray-400 animate-spin" />
              </div>
            ) : (
              <>
                {/* Password Tab */}
                {activeTab === 'password' && (
                  <div className="space-y-6 animate-fade-in">
                    {/* Password Strength Indicator */}
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {t('security.passwordStrength')}
                        </span>
                        <span className={clsx('text-sm font-medium', passwordStrength.color)}>
                          {passwordStrength.label}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                        <div
                          className={clsx('h-full transition-all', passwordStrength.bg)}
                          style={{ width: `${(getPasswordStrength().label === 'Strong' ? 100 : getPasswordStrength().label === 'Medium' ? 60 : 30)}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('security.minLength')}
                        </label>
                        <select
                          value={policies.password_min_length}
                          onChange={(e) => handleChange('password_min_length', Number(e.target.value))}
                          disabled={!canManage}
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
                        >
                          <option value={6}>6 {t('common.characters')}</option>
                          <option value={8}>8 {t('common.characters')}</option>
                          <option value={10}>10 {t('common.characters')}</option>
                          <option value={12}>12 {t('common.characters')}</option>
                          <option value={16}>16 {t('common.characters')}</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('security.expiryDays')}
                        </label>
                        <select
                          value={policies.password_expiry_days}
                          onChange={(e) => handleChange('password_expiry_days', Number(e.target.value))}
                          disabled={!canManage}
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
                        >
                          <option value={0}>{t('security.never')}</option>
                          <option value={30}>30 {t('common.days')}</option>
                          <option value={60}>60 {t('common.days')}</option>
                          <option value={90}>90 {t('common.days')}</option>
                          <option value={180}>180 {t('common.days')}</option>
                          <option value={365}>365 {t('common.days')}</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('security.historyCount')}
                        </label>
                        <select
                          value={policies.password_history_count}
                          onChange={(e) => handleChange('password_history_count', Number(e.target.value))}
                          disabled={!canManage}
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
                        >
                          <option value={0}>{t('security.none')}</option>
                          <option value={3}>{t('security.last3')}</option>
                          <option value={5}>{t('security.last5')}</option>
                          <option value={10}>{t('security.last10')}</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('security.maxAttempts')}
                        </label>
                        <select
                          value={policies.password_max_attempts}
                          onChange={(e) => handleChange('password_max_attempts', Number(e.target.value))}
                          disabled={!canManage}
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
                        >
                          <option value={3}>3</option>
                          <option value={5}>5</option>
                          <option value={10}>10</option>
                          <option value={0}>{t('security.unlimited')}</option>
                        </select>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        {t('security.requirements')}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          { key: 'password_require_uppercase', label: t('security.requireUppercase') },
                          { key: 'password_require_lowercase', label: t('security.requireLowercase') },
                          { key: 'password_require_numbers', label: t('security.requireNumbers') },
                          { key: 'password_require_symbols', label: t('security.requireSymbols') },
                        ].map((item) => (
                          <div key={item.key} className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              id={item.key}
                              checked={policies[item.key as keyof SecurityPolicies] as boolean}
                              onChange={(e) => handleChange(item.key as keyof SecurityPolicies, e.target.checked)}
                              disabled={!canManage}
                              className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                            />
                            <label htmlFor={item.key} className="text-sm text-gray-700 dark:text-gray-300">
                              {item.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Session Tab */}
                {activeTab === 'session' && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('security.sessionTimeout')}
                        </label>
                        <select
                          value={policies.session_timeout_minutes}
                          onChange={(e) => handleChange('session_timeout_minutes', Number(e.target.value))}
                          disabled={!canManage}
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
                        >
                          <option value={15}>15 {t('common.minutes')}</option>
                          <option value={30}>30 {t('common.minutes')}</option>
                          <option value={60}>1 {t('common.hour')}</option>
                          <option value={120}>2 {t('common.hours')}</option>
                          <option value={480}>8 {t('common.hours')}</option>
                          <option value={0}>{t('security.never')}</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('security.maxConcurrent')}
                        </label>
                        <select
                          value={policies.session_max_concurrent}
                          onChange={(e) => handleChange('session_max_concurrent', Number(e.target.value))}
                          disabled={!canManage}
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
                        >
                          <option value={1}>1</option>
                          <option value={3}>3</option>
                          <option value={5}>5</option>
                          <option value={10}>10</option>
                          <option value={0}>{t('security.unlimited')}</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('security.rememberMeDays')}
                        </label>
                        <select
                          value={policies.session_remember_me_days}
                          onChange={(e) => handleChange('session_remember_me_days', Number(e.target.value))}
                          disabled={!canManage}
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
                        >
                          <option value={0}>{t('security.disabled')}</option>
                          <option value={7}>7 {t('common.days')}</option>
                          <option value={14}>14 {t('common.days')}</option>
                          <option value={30}>30 {t('common.days')}</option>
                          <option value={90}>90 {t('common.days')}</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('security.lockoutDuration')}
                        </label>
                        <select
                          value={policies.account_lockout_duration_minutes}
                          onChange={(e) => handleChange('account_lockout_duration_minutes', Number(e.target.value))}
                          disabled={!canManage}
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
                        >
                          <option value={5}>5 {t('common.minutes')}</option>
                          <option value={15}>15 {t('common.minutes')}</option>
                          <option value={30}>30 {t('common.minutes')}</option>
                          <option value={60}>1 {t('common.hour')}</option>
                          <option value={-1}>{t('security.manual')}</option>
                        </select>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id="session_extend_on_activity"
                            checked={policies.session_extend_on_activity}
                            onChange={(e) => handleChange('session_extend_on_activity', e.target.checked)}
                            disabled={!canManage}
                            className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                          />
                          <label htmlFor="session_extend_on_activity" className="text-sm text-gray-700 dark:text-gray-300">
                            {t('security.extendOnActivity')}
                          </label>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id="session_single_device"
                            checked={policies.session_single_device}
                            onChange={(e) => handleChange('session_single_device', e.target.checked)}
                            disabled={!canManage}
                            className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                          />
                          <label htmlFor="session_single_device" className="text-sm text-gray-700 dark:text-gray-300">
                            {t('security.singleDevice')}
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2FA Tab */}
                {activeTab === 'tfa' && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {t('security.enableTfa')}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {t('security.tfaDescription')}
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={policies.tfa_enabled}
                          onChange={(e) => handleChange('tfa_enabled', e.target.checked)}
                          disabled={!canManage}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 dark:peer-focus:ring-red-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-red-600"></div>
                      </label>
                    </div>

                    {policies.tfa_enabled && (
                      <>
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id="tfa_required_for_admins"
                            checked={policies.tfa_required_for_admins}
                            onChange={(e) => handleChange('tfa_required_for_admins', e.target.checked)}
                            disabled={!canManage}
                            className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                          />
                          <label htmlFor="tfa_required_for_admins" className="text-sm text-gray-700 dark:text-gray-300">
                            {t('security.tfaRequiredAdmins')}
                          </label>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            {t('security.tfaMethods')}
                          </label>
                          <div className="space-y-3">
                            {[
                              { key: 'app', label: t('security.tfaApp'), icon: '📱' },
                              { key: 'sms', label: t('security.tfaSms'), icon: '💬' },
                              { key: 'email', label: t('security.tfaEmail'), icon: '📧' },
                            ].map((method) => (
                              <div key={method.key} className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  id={`tfa_${method.key}`}
                                  checked={policies.tfa_methods.includes(method.key as any)}
                                  onChange={(e) => {
                                    const methods = e.target.checked
                                      ? [...policies.tfa_methods, method.key as any]
                                      : policies.tfa_methods.filter(m => m !== method.key);
                                    handleChange('tfa_methods', methods);
                                  }}
                                  disabled={!canManage}
                                  className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                                />
                                <span className="text-lg">{method.icon}</span>
                                <label htmlFor={`tfa_${method.key}`} className="text-sm text-gray-700 dark:text-gray-300">
                                  {method.label}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Access Tab */}
                {activeTab === 'access' && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                      <div className="flex items-start gap-3">
                        <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-yellow-900 dark:text-yellow-100">
                            {t('security.accessWarning')}
                          </h4>
                          <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                            {t('security.accessWarningMessage')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="account_require_email_verification"
                          checked={policies.account_require_email_verification}
                          onChange={(e) => handleChange('account_require_email_verification', e.target.checked)}
                          disabled={!canManage}
                          className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                        />
                        <label htmlFor="account_require_email_verification" className="text-sm text-gray-700 dark:text-gray-300">
                          {t('security.requireEmailVerification')}
                        </label>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="account_require_phone_verification"
                          checked={policies.account_require_phone_verification}
                          onChange={(e) => handleChange('account_require_phone_verification', e.target.checked)}
                          disabled={!canManage}
                          className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                        />
                        <label htmlFor="account_require_phone_verification" className="text-sm text-gray-700 dark:text-gray-300">
                          {t('security.requirePhoneVerification')}
                        </label>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {t('security.ipWhitelist')}
                        </h3>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={policies.ip_whitelist_enabled}
                            onChange={(e) => handleChange('ip_whitelist_enabled', e.target.checked)}
                            disabled={!canManage}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 dark:peer-focus:ring-red-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-red-600"></div>
                        </label>
                      </div>
                      {policies.ip_whitelist_enabled && (
                        <textarea
                          placeholder={t('security.ipPlaceholder')}
                          value={policies.ip_whitelist.join('\n')}
                          onChange={(e) => handleChange('ip_whitelist', e.target.value.split('\n').filter(Boolean))}
                          disabled={!canManage}
                          rows={4}
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg font-mono text-sm"
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Audit Tab */}
                {activeTab === 'audit' && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {t('security.auditEvents')}
                        </h3>
                        {[
                          { key: 'audit_login_attempts', label: t('security.auditLogin') },
                          { key: 'audit_password_changes', label: t('security.auditPassword') },
                          { key: 'audit_permission_changes', label: t('security.auditPermissions') },
                        ].map((item) => (
                          <div key={item.key} className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              id={item.key}
                              checked={policies[item.key as keyof SecurityPolicies] as boolean}
                              onChange={(e) => handleChange(item.key as keyof SecurityPolicies, e.target.checked)}
                              disabled={!canManage}
                              className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                            />
                            <label htmlFor={item.key} className="text-sm text-gray-700 dark:text-gray-300">
                              {item.label}
                            </label>
                          </div>
                        ))}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('security.auditRetention')}
                        </label>
                        <select
                          value={policies.audit_retention_days}
                          onChange={(e) => handleChange('audit_retention_days', Number(e.target.value))}
                          disabled={!canManage}
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
                        >
                          <option value={30}>30 {t('common.days')}</option>
                          <option value={90}>90 {t('common.days')}</option>
                          <option value={180}>180 {t('common.days')}</option>
                          <option value={365}>1 {t('common.year')}</option>
                          <option value={730}>2 {t('common.years')}</option>
                          <option value={0}>{t('security.forever')}</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
