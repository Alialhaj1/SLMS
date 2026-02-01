/**
 * User Profile Page
 * Complete profile management with tabs
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';
import { useToast } from '../contexts/ToastContext';
import { useTranslation } from '../hooks/useTranslation.enhanced';
import { profileService, LoginHistoryEntry } from '../lib/profileService';
import AuthGuard from '../components/AuthGuard';
import MainLayout from '../components/layout/MainLayout';
import LanguageSelector from '../components/ui/LanguageSelector';
import ImageUpload from '../components/ui/ImageUpload';
import {
  UserCircleIcon,
  LanguageIcon,
  ShieldCheckIcon,
  ClockIcon,
  KeyIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  GlobeAltIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  CameraIcon,
} from '@heroicons/react/24/outline';

type TabType = 'overview' | 'security' | 'history';

// API base URL for images
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { locale, setLocale } = useLocale();
  const { showToast } = useToast();
  const { t } = useTranslation();
  
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(false);
  const [languageLoading, setLanguageLoading] = useState(false);
  const [loginHistory, setLoginHistory] = useState<LoginHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loginStats, setLoginStats] = useState<any>(null);
  const [imageLoading, setImageLoading] = useState(false);

  // Load login history
  useEffect(() => {
    if (activeTab === 'history') {
      loadLoginHistory();
      loadLoginStats();
    }
  }, [activeTab]);

  const loadLoginHistory = async () => {
    try {
      setHistoryLoading(true);
      const response = await profileService.getLoginHistory({ limit: 10 });
      setLoginHistory(response.data);
    } catch (error) {
      console.error('Failed to load login history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadLoginStats = async () => {
    try {
      const stats = await profileService.getLoginStats();
      setLoginStats(stats);
    } catch (error) {
      console.error('Failed to load login stats:', error);
    }
  };

  const handleLanguageChange = async (newLanguage: 'ar' | 'en') => {
    try {
      setLanguageLoading(true);
      await profileService.updateLanguage(newLanguage);
      setLocale(newLanguage);
      await refreshUser();
      showToast(t('toast.languageUpdateSuccess'), 'success');
    } catch (error) {
      console.error('Failed to update language:', error);
      showToast(t('toast.languageUpdateFailed'), 'error');
    } finally {
      setLanguageLoading(false);
    }
  };

  // Image upload handlers
  const handleProfileImageUpload = async (base64: string) => {
    setImageLoading(true);
    try {
      await profileService.uploadProfileImage(base64);
      await refreshUser();
      showToast(t('imageUpload.uploadSuccess'), 'success');
    } catch (error: any) {
      console.error('Failed to upload profile image:', error);
      showToast(error.message || t('imageUpload.errors.uploadFailed'), 'error');
      throw error;
    } finally {
      setImageLoading(false);
    }
  };

  const handleProfileImageRemove = async () => {
    setImageLoading(true);
    try {
      await profileService.removeProfileImage();
      await refreshUser();
      showToast(t('imageUpload.removeSuccess'), 'success');
    } catch (error: any) {
      console.error('Failed to remove profile image:', error);
      showToast(error.message || t('imageUpload.errors.removeFailed'), 'error');
      throw error;
    } finally {
      setImageLoading(false);
    }
  };

  const handleCoverImageUpload = async (base64: string) => {
    setImageLoading(true);
    try {
      await profileService.uploadCoverImage(base64);
      await refreshUser();
      showToast(t('imageUpload.uploadSuccess'), 'success');
    } catch (error: any) {
      console.error('Failed to upload cover image:', error);
      showToast(error.message || t('imageUpload.errors.uploadFailed'), 'error');
      throw error;
    } finally {
      setImageLoading(false);
    }
  };

  const handleCoverImageRemove = async () => {
    setImageLoading(true);
    try {
      await profileService.removeCoverImage();
      await refreshUser();
      showToast(t('imageUpload.removeSuccess'), 'success');
    } catch (error: any) {
      console.error('Failed to remove cover image:', error);
      showToast(error.message || t('imageUpload.errors.removeFailed'), 'error');
      throw error;
    } finally {
      setImageLoading(false);
    }
  };

  // Get full image URL
  const getImageUrl = (path: string | null | undefined) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${API_BASE_URL}${path}`;
  };

  if (!user) {
    return null;
  }

  return (
    <AuthGuard>
      <Head>
        <title>{t('profile.title')} - SLMS</title>
      </Head>
      <MainLayout>
          {/* Cover Image */}
          <div className="mb-6 -mx-6 -mt-6 lg:-mx-8 lg:-mt-8">
            <ImageUpload
              type="cover"
              currentImage={getImageUrl(user.cover_image)}
              onImageSelect={handleCoverImageUpload}
              onImageRemove={handleCoverImageRemove}
              loading={imageLoading}
              canEdit={true}
            />
          </div>

          {/* Header with Profile Image */}
          <div className="mb-8 -mt-20 relative z-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 mb-4">
              {/* Profile Image Upload */}
              <ImageUpload
                type="profile"
                currentImage={getImageUrl(user.profile_image)}
                onImageSelect={handleProfileImageUpload}
                onImageRemove={handleProfileImageRemove}
                loading={imageLoading}
                canEdit={true}
              />
              
              <div className="flex-1 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-4 shadow-lg">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {user.full_name || t('profile.userProfile')}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">{user.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <StatusBadge status={user.status} />
                  {user.roles?.map((role, index) => (
                    <RoleBadge key={index} role={role} />
                  ))}
                </div>
              </div>
            </div>

            {/* Security Alert */}
            {user.must_change_password && (
              <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-200 dark:border-orange-800 rounded-xl flex items-start gap-3">
                <ExclamationTriangleIcon className="w-6 h-6 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-orange-900 dark:text-orange-100">
                    {t('profile.security.alerts.passwordChangeRequired')}
                  </h3>
                  <p className="text-sm text-orange-800 dark:text-orange-200 mt-1">
                    {t('profile.security.alerts.passwordChangeRequiredDescription')}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
            <nav className="flex gap-6">
              <TabButton
                active={activeTab === 'overview'}
                onClick={() => setActiveTab('overview')}
                icon={<UserCircleIcon className="w-5 h-5" />}
              >
                {t('profile.tabs.overview')}
              </TabButton>
              <TabButton
                active={activeTab === 'security'}
                onClick={() => setActiveTab('security')}
                icon={<ShieldCheckIcon className="w-5 h-5" />}
              >
                {t('profile.tabs.security')}
              </TabButton>
              <TabButton
                active={activeTab === 'history'}
                onClick={() => setActiveTab('history')}
                icon={<ClockIcon className="w-5 h-5" />}
              >
                {t('profile.tabs.activity')}
              </TabButton>
            </nav>
          </div>

          {/* Tab Content */}
          <div>
            {activeTab === 'overview' && (
              <OverviewTab
                user={user}
                currentLanguage={locale}
                onLanguageChange={handleLanguageChange}
                languageLoading={languageLoading}
                t={t}
              />
            )}
            {activeTab === 'security' && <SecurityTab user={user} t={t} />}
            {activeTab === 'history' && (
              <HistoryTab
                loginHistory={loginHistory}
                loginStats={loginStats}
                loading={historyLoading}
                t={t}
              />
            )}
          </div>
      </MainLayout>
    </AuthGuard>
  );
}

// ===========================
// Overview Tab
// ===========================

function OverviewTab({
  user,
  currentLanguage,
  onLanguageChange,
  languageLoading,
  t
}: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Profile Information */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <UserCircleIcon className="w-6 h-6" />
          {t('profile.overview.profileInfo')}
        </h2>
        <div className="space-y-4">
          <InfoRow label={t('profile.overview.fullName')} value={user.full_name || t('profile.overview.notSet')} />
          <InfoRow label={t('profile.overview.email')} value={user.email} />
          <InfoRow label={t('profile.overview.userId')} value={`#${user.id}`} />
          <InfoRow
            label={t('profile.overview.memberSince')}
            value={new Date(user.created_at).toLocaleDateString()}
          />
          <InfoRow
            label={t('profile.overview.lastLogin')}
            value={user.last_login_at ? new Date(user.last_login_at).toLocaleString() : t('profile.overview.never')}
          />
        </div>
      </div>

      {/* Language Preference */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <GlobeAltIcon className="w-6 h-6" />
          {t('profile.overview.languagePreference')}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {t('profile.overview.languageDescription')}
        </p>
        <div className="space-y-3">
          <LanguageOption
            language="en"
            label={t('profile.overview.english')}
            selected={currentLanguage === 'en'}
            onClick={() => onLanguageChange('en')}
            disabled={languageLoading}
          />
          <LanguageOption
            language="ar"
            label={t('profile.overview.arabic')}
            selected={currentLanguage === 'ar'}
            onClick={() => onLanguageChange('ar')}
            disabled={languageLoading}
          />
        </div>
      </div>

      {/* Roles & Permissions */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 lg:col-span-2">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <ShieldCheckIcon className="w-6 h-6" />
          {t('profile.overview.rolesPermissions')}
        </h2>
        
        {/* Roles */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('profile.overview.yourRoles')}</h3>
          <div className="flex flex-wrap gap-2">
            {user.roles?.map((role: any, index: number) => {
              // Handle both string and object role formats
              const roleName = typeof role === 'string' ? role : role?.name;
              const roleDescription = typeof role === 'object' ? role?.description : null;
              const roleKey = typeof role === 'object' ? role?.id : index;
              
              if (!roleName) return null;
              
              return (
                <div
                  key={roleKey}
                  className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-lg border border-blue-200 dark:border-blue-800"
                >
                  <div className="font-semibold">{roleName.replace(/_/g, ' ')}</div>
                  {roleDescription && (
                    <div className="text-xs mt-0.5">{roleDescription}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Permissions */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            {t('profile.overview.yourPermissions')} ({t('profile.overview.permissionsCount', { count: user.permissions?.length || 0 })})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
            {user.permissions?.map((permission: string) => (
              <div
                key={permission}
                className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm"
              >
                {permission}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ===========================
// Security Tab
// ===========================

function SecurityTab({ user, t }: any) {
  return (
    <div className="space-y-6">
      {/* Password Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <KeyIcon className="w-6 h-6" />
          {t('profile.security.passwordAuth')}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {t('profile.security.passwordAuthDescription')}
        </p>
        <a
          href="/auth/change-password"
          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          {t('profile.security.changePassword')}
        </a>
      </div>

      {/* Security Status */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          {t('profile.security.securityStatus')}
        </h2>
        <div className="space-y-3">
          <SecurityCheck
            label={t('profile.security.accountStatus')}
            status={user.status === 'active' ? 'success' : 'warning'}
            message={user.status === 'active' ? t('profile.security.accountActive') : t('profile.security.accountStatusValue', { status: t(`profile.status.${user.status}`) })}
          />
          <SecurityCheck
            label={t('profile.security.passwordStatus')}
            status={user.must_change_password ? 'warning' : 'success'}
            message={user.must_change_password ? t('profile.security.passwordChangeRequired') : t('profile.security.passwordCurrent')}
          />
          <SecurityCheck
            label={t('profile.security.failedAttempts')}
            status={user.failed_login_count > 0 ? 'warning' : 'success'}
            message={user.failed_login_count > 0 ? t('profile.security.failedAttemptsCount', { count: user.failed_login_count }) : t('profile.security.noFailedAttempts')}
          />
        </div>
      </div>

      {/* Security Recommendations */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
          {t('profile.security.securityRecommendations')}
        </h3>
        <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
          <li className="flex items-start gap-2">
            <CheckCircleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{t('profile.security.recommendations.strongPassword')}</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{t('profile.security.recommendations.changeRegularly')}</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{t('profile.security.recommendations.reviewHistory')}</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{t('profile.security.recommendations.logoutShared')}</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

// ===========================
// History Tab
// ===========================

function HistoryTab({ loginHistory, loginStats, loading, t }: any) {
  return (
    <div className="space-y-6">
      {/* Stats */}
      {loginStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label={t('profile.activity.totalLogins')} value={loginStats.total_logins} />
          <StatCard label={t('profile.activity.failedAttempts')} value={loginStats.failed_attempts} variant="warning" />
          <StatCard label={t('profile.activity.suspiciousLogins')} value={loginStats.suspicious_logins} variant="danger" />
          <StatCard
            label={t('profile.activity.lastLogin')}
            value={loginStats.last_login ? new Date(loginStats.last_login).toLocaleDateString() : t('profile.overview.never')}
          />
        </div>
      )}

      {/* Login History */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          {t('profile.activity.recentActivity')}
        </h2>
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : loginHistory.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400 text-center py-8">
            {t('profile.activity.noActivity')}
          </p>
        ) : (
          <div className="space-y-3">
            {loginHistory.map((entry: LoginHistoryEntry) => (
              <LoginHistoryItem key={entry.id} entry={entry} t={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ===========================
// Helper Components
// ===========================

function TabButton({ active, onClick, icon, children }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors ${
        active
          ? 'border-blue-600 text-blue-600 dark:text-blue-400'
          : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function StatusBadge({ status }: any) {
  const { t } = useTranslation();
  const colors = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    disabled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    locked: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
  };
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded ${colors[status as keyof typeof colors]}`}>
      {t(`profile.status.${status}`)}
    </span>
  );
}

function RoleBadge({ role }: any) {
  const { t } = useTranslation();
  const colors = {
    super_admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    admin: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    manager: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    user: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
  };
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded ${colors[role as keyof typeof colors] || colors.user}`}>
      {t(`profile.roles.${role}`)}
    </span>
  );
}

function InfoRow({ label, value }: any) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      <span className="text-sm font-medium text-gray-900 dark:text-white">{value}</span>
    </div>
  );
}

function LanguageOption({ language, label, selected, onClick, disabled }: any) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full p-4 rounded-xl border-2 transition-all ${
        selected
          ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <div className="flex items-center justify-between">
        <span className="font-medium text-gray-900 dark:text-white">{label}</span>
        {selected && <CheckCircleIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
      </div>
    </button>
  );
}

function SecurityCheck({ label, status, message }: any) {
  const icons = {
    success: <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400" />,
    warning: <ExclamationTriangleIcon className="w-5 h-5 text-orange-600 dark:text-orange-400" />,
    danger: <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
  };

  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
      {icons[status as keyof typeof icons]}
      <div>
        <div className="font-medium text-sm text-gray-900 dark:text-white">{label}</div>
        <div className="text-sm text-gray-600 dark:text-gray-400">{message}</div>
      </div>
    </div>
  );
}

function StatCard({ label, value, variant = 'default' }: any) {
  const variants = {
    default: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    warning: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
    danger: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
  };

  return (
    <div className={`p-4 rounded-xl border ${variants[variant as keyof typeof variants]}`}>
      <div className="text-sm text-gray-600 dark:text-gray-400">{label}</div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</div>
    </div>
  );
}

function LoginHistoryItem({ entry, t }: { entry: LoginHistoryEntry; t: any }) {
  const activityIcons = {
    login_success: <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400" />,
    login_failed: <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400" />,
    logout: <CheckCircleIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />,
    password_changed: <KeyIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
    account_locked: <ExclamationTriangleIcon className="w-5 h-5 text-orange-600 dark:text-orange-400" />
  };

  const getDeviceIcon = (userAgent: string) => {
    if (userAgent.includes('Mobile')) {
      return <DevicePhoneMobileIcon className="w-4 h-4" />;
    }
    return <ComputerDesktopIcon className="w-4 h-4" />;
  };

  return (
    <div className={`p-4 rounded-lg border ${
      entry.is_suspicious
        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-700'
    }`}>
      <div className="flex items-start gap-3">
        {activityIcons[entry.activity_type as keyof typeof activityIcons]}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-medium text-sm text-gray-900 dark:text-white">
                {t(`profile.activity.activityTypes.${entry.activity_type}`)}
                {entry.is_suspicious && (
                  <span className="ml-2 text-xs bg-red-600 text-white px-2 py-0.5 rounded">
                    {t('profile.activity.suspicious')}
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {entry.ip_address} • {getDeviceIcon(entry.user_agent)} {extractBrowser(entry.user_agent)}
              </div>
              {entry.failed_reason && (
                <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {t('profile.activity.reason')}: {entry.failed_reason}
                </div>
              )}
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-500 whitespace-nowrap">
              {formatTimeAgo(entry.created_at, t)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===========================
// Helper Functions
// ===========================

function extractBrowser(userAgent: string): string {
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Edge')) return 'Edge';
  return 'Browser';
}

function formatTimeAgo(dateString: string, t: any): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return t('profile.activity.timeAgo.justNow');
  if (diffInSeconds < 3600) return t('profile.activity.timeAgo.minutesAgo', { count: Math.floor(diffInSeconds / 60) });
  if (diffInSeconds < 86400) return t('profile.activity.timeAgo.hoursAgo', { count: Math.floor(diffInSeconds / 3600) });
  if (diffInSeconds < 604800) return t('profile.activity.timeAgo.daysAgo', { count: Math.floor(diffInSeconds / 86400) });
  
  return date.toLocaleDateString();
}
