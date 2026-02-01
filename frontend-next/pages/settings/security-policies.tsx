/**
 * 🔐 Security Policies - سياسات الأمان
 * =====================================================
 * إدارة سياسات الأمان وكلمات المرور والجلسات
 */

import { useState, useEffect } from 'react';
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

export default function SecurityPoliciesPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState<'password' | 'session' | 'tfa' | 'access' | 'audit'>('password');
  
  const [policies, setPolicies] = useState<SecurityPolicies>({
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
  });

  const canManage = hasPermission('security_policies:manage');

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:4000/api/security-policies', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setPolicies({ ...policies, ...data });
      }
    } catch (error) {
      // Use defaults
    } finally {
      setLoading(false);
    }
  };

  const handleChange = <K extends keyof SecurityPolicies>(key: K, value: SecurityPolicies[K]) => {
    setPolicies(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      showToast(t('common.saveSuccess') || 'Policies saved successfully', 'success');
      setHasChanges(false);
    } catch (error) {
      showToast(t('common.error') || 'Failed to save policies', 'error');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'password', label: t('security.password') || 'Password', icon: KeyIcon },
    { id: 'session', label: t('security.session') || 'Session', icon: ClockIcon },
    { id: 'tfa', label: t('security.tfa') || '2FA', icon: FingerPrintIcon },
    { id: 'access', label: t('security.access') || 'Access', icon: ShieldExclamationIcon },
    { id: 'audit', label: t('security.audit') || 'Audit', icon: DevicePhoneMobileIcon },
  ];

  const getPasswordStrength = () => {
    let strength = 0;
    if (policies.password_min_length >= 8) strength++;
    if (policies.password_min_length >= 12) strength++;
    if (policies.password_require_uppercase) strength++;
    if (policies.password_require_lowercase) strength++;
    if (policies.password_require_numbers) strength++;
    if (policies.password_require_symbols) strength++;
    
    if (strength <= 2) return { label: t('security.weak') || 'Weak', color: 'text-red-500', bg: 'bg-red-500' };
    if (strength <= 4) return { label: t('security.medium') || 'Medium', color: 'text-yellow-500', bg: 'bg-yellow-500' };
    return { label: t('security.strong') || 'Strong', color: 'text-green-500', bg: 'bg-green-500' };
  };

  const passwordStrength = getPasswordStrength();

  return (
    <MainLayout>
      <Head>
        <title>{t('security.title') || 'Security Policies'} | SLMS</title>
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
                {t('security.title') || 'Security Policies'}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t('security.subtitle') || 'Configure security settings and policies'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Button onClick={handleSave} loading={saving} disabled={!canManage}>
                <CheckIcon className="w-5 h-5 me-2" />
                {t('common.saveChanges') || 'Save Changes'}
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
                          {t('security.passwordStrength') || 'Password Policy Strength'}
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
                          {t('security.minLength') || 'Minimum Password Length'}
                        </label>
                        <select
                          value={policies.password_min_length}
                          onChange={(e) => handleChange('password_min_length', Number(e.target.value))}
                          disabled={!canManage}
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
                        >
                          <option value={6}>6 {t('common.characters') || 'characters'}</option>
                          <option value={8}>8 {t('common.characters') || 'characters'}</option>
                          <option value={10}>10 {t('common.characters') || 'characters'}</option>
                          <option value={12}>12 {t('common.characters') || 'characters'}</option>
                          <option value={16}>16 {t('common.characters') || 'characters'}</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('security.expiryDays') || 'Password Expiry (Days)'}
                        </label>
                        <select
                          value={policies.password_expiry_days}
                          onChange={(e) => handleChange('password_expiry_days', Number(e.target.value))}
                          disabled={!canManage}
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
                        >
                          <option value={0}>{t('security.never') || 'Never'}</option>
                          <option value={30}>30 {t('common.days') || 'days'}</option>
                          <option value={60}>60 {t('common.days') || 'days'}</option>
                          <option value={90}>90 {t('common.days') || 'days'}</option>
                          <option value={180}>180 {t('common.days') || 'days'}</option>
                          <option value={365}>365 {t('common.days') || 'days'}</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('security.historyCount') || 'Password History'}
                        </label>
                        <select
                          value={policies.password_history_count}
                          onChange={(e) => handleChange('password_history_count', Number(e.target.value))}
                          disabled={!canManage}
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
                        >
                          <option value={0}>{t('security.none') || 'None'}</option>
                          <option value={3}>{t('security.lastN', { n: 3 }) || 'Last 3 passwords'}</option>
                          <option value={5}>{t('security.lastN', { n: 5 }) || 'Last 5 passwords'}</option>
                          <option value={10}>{t('security.lastN', { n: 10 }) || 'Last 10 passwords'}</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('security.maxAttempts') || 'Max Failed Attempts'}
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
                          <option value={0}>{t('security.unlimited') || 'Unlimited'}</option>
                        </select>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        {t('security.requirements') || 'Password Requirements'}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          { key: 'password_require_uppercase', label: t('security.requireUppercase') || 'Require uppercase letter' },
                          { key: 'password_require_lowercase', label: t('security.requireLowercase') || 'Require lowercase letter' },
                          { key: 'password_require_numbers', label: t('security.requireNumbers') || 'Require number' },
                          { key: 'password_require_symbols', label: t('security.requireSymbols') || 'Require special character' },
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
                          {t('security.sessionTimeout') || 'Session Timeout (Minutes)'}
                        </label>
                        <select
                          value={policies.session_timeout_minutes}
                          onChange={(e) => handleChange('session_timeout_minutes', Number(e.target.value))}
                          disabled={!canManage}
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
                        >
                          <option value={15}>15 {t('common.minutes') || 'minutes'}</option>
                          <option value={30}>30 {t('common.minutes') || 'minutes'}</option>
                          <option value={60}>1 {t('common.hour') || 'hour'}</option>
                          <option value={120}>2 {t('common.hours') || 'hours'}</option>
                          <option value={480}>8 {t('common.hours') || 'hours'}</option>
                          <option value={0}>{t('security.never') || 'Never'}</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('security.maxConcurrent') || 'Max Concurrent Sessions'}
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
                          <option value={0}>{t('security.unlimited') || 'Unlimited'}</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('security.rememberMeDays') || 'Remember Me Duration (Days)'}
                        </label>
                        <select
                          value={policies.session_remember_me_days}
                          onChange={(e) => handleChange('session_remember_me_days', Number(e.target.value))}
                          disabled={!canManage}
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
                        >
                          <option value={0}>{t('security.disabled') || 'Disabled'}</option>
                          <option value={7}>7 {t('common.days') || 'days'}</option>
                          <option value={14}>14 {t('common.days') || 'days'}</option>
                          <option value={30}>30 {t('common.days') || 'days'}</option>
                          <option value={90}>90 {t('common.days') || 'days'}</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('security.lockoutDuration') || 'Account Lockout Duration (Minutes)'}
                        </label>
                        <select
                          value={policies.account_lockout_duration_minutes}
                          onChange={(e) => handleChange('account_lockout_duration_minutes', Number(e.target.value))}
                          disabled={!canManage}
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
                        >
                          <option value={5}>5 {t('common.minutes') || 'minutes'}</option>
                          <option value={15}>15 {t('common.minutes') || 'minutes'}</option>
                          <option value={30}>30 {t('common.minutes') || 'minutes'}</option>
                          <option value={60}>1 {t('common.hour') || 'hour'}</option>
                          <option value={-1}>{t('security.manual') || 'Manual unlock required'}</option>
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
                            {t('security.extendOnActivity') || 'Extend session on user activity'}
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
                            {t('security.singleDevice') || 'Allow login from single device only'}
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
                          {t('security.enableTfa') || 'Enable Two-Factor Authentication'}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {t('security.tfaDescription') || 'Add an extra layer of security to user accounts'}
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
                            {t('security.tfaRequiredAdmins') || 'Require 2FA for administrators'}
                          </label>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            {t('security.tfaMethods') || 'Allowed 2FA Methods'}
                          </label>
                          <div className="space-y-3">
                            {[
                              { key: 'app', label: t('security.tfaApp') || 'Authenticator App (Google, Microsoft)', icon: '📱' },
                              { key: 'sms', label: t('security.tfaSms') || 'SMS Code', icon: '💬' },
                              { key: 'email', label: t('security.tfaEmail') || 'Email Code', icon: '📧' },
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
                            {t('security.accessWarning') || 'Advanced Settings'}
                          </h4>
                          <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                            {t('security.accessWarningMessage') || 'Be careful when configuring IP restrictions. Incorrect settings may lock out legitimate users.'}
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
                          {t('security.requireEmailVerification') || 'Require email verification for new accounts'}
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
                          {t('security.requirePhoneVerification') || 'Require phone verification for new accounts'}
                        </label>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {t('security.ipWhitelist') || 'IP Whitelist'}
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
                          placeholder={t('security.ipPlaceholder') || 'Enter IP addresses (one per line)'}
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
                          {t('security.auditEvents') || 'Events to Audit'}
                        </h3>
                        {[
                          { key: 'audit_login_attempts', label: t('security.auditLogin') || 'Login attempts (success & failure)' },
                          { key: 'audit_password_changes', label: t('security.auditPassword') || 'Password changes' },
                          { key: 'audit_permission_changes', label: t('security.auditPermissions') || 'Permission changes' },
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
                          {t('security.auditRetention') || 'Audit Log Retention'}
                        </label>
                        <select
                          value={policies.audit_retention_days}
                          onChange={(e) => handleChange('audit_retention_days', Number(e.target.value))}
                          disabled={!canManage}
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
                        >
                          <option value={30}>30 {t('common.days') || 'days'}</option>
                          <option value={90}>90 {t('common.days') || 'days'}</option>
                          <option value={180}>180 {t('common.days') || 'days'}</option>
                          <option value={365}>1 {t('common.year') || 'year'}</option>
                          <option value={730}>2 {t('common.years') || 'years'}</option>
                          <option value={0}>{t('security.forever') || 'Forever'}</option>
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
