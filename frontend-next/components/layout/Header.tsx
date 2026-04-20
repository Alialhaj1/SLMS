import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  MagnifyingGlassIcon,
  UserCircleIcon,
  SunIcon,
  MoonIcon,
  Bars3Icon,
  Cog6ToothIcon,
  ArrowRightEndOnRectangleIcon,
  UserIcon,
  ShieldCheckIcon,
  BuildingOffice2Icon,
} from '@heroicons/react/24/outline';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { useAuthorization } from '../../contexts/AuthorizationContext';
import { useTranslation } from '../../hooks/useTranslation';
import NotificationBell from './NotificationBell';
import ApprovalTrackerBell from './ApprovalTrackerBell';
import LanguageSelector from '../ui/LanguageSelector';
import CompanySelector from '../common/CompanySelector';
import BranchSelector from '../common/BranchSelector';
import clsx from 'clsx';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { userContext, isPlatformUser, isTenantUser } = useAuthorization();
  const { t } = useTranslation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      super_admin: 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white',
      admin: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white',
      manager: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white',
      user: 'bg-gradient-to-r from-slate-400 to-slate-500 text-white',
    };
    return colors[role] || colors.user;
  };

  const getRoleIcon = (role: string) => {
    if (role === 'super_admin' || role === 'admin') return ShieldCheckIcon;
    return UserIcon;
  };

  const RoleIcon = getRoleIcon(user?.roles?.[0] || 'user');

  return (
    <header className="h-16 bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border-b border-slate-200/50 dark:border-slate-700/50 px-4 lg:px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Left section */}
      <div className="flex items-center gap-3 lg:gap-4">
        <button
          onClick={onMenuClick}
          className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all duration-200 active:scale-95 lg:hidden"
          aria-label="Toggle menu"
        >
          <Bars3Icon className="w-6 h-6" />
        </button>

        <Link href={isPlatformUser ? '/admin/platform' : '/dashboard'} className="flex items-center gap-3 group">
          <div className="relative">
            <div className={clsx(
              'w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-all duration-300 group-hover:scale-105',
              isPlatformUser 
                ? 'bg-gradient-to-br from-purple-600 to-indigo-600 shadow-purple-500/25 group-hover:shadow-purple-500/40'
                : 'bg-gradient-to-br from-blue-600 to-indigo-600 shadow-blue-500/25 group-hover:shadow-blue-500/40'
            )}>
              {isPlatformUser ? (
                <ShieldCheckIcon className="w-6 h-6 text-white" />
              ) : (
                <span className="text-white font-bold text-lg">
                  {userContext?.company_name?.charAt(0) || 'S'}
                </span>
              )}
            </div>
            <div className="absolute -bottom-1 -end-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-800 animate-pulse" />
          </div>
          <div className="hidden sm:block">
            <span className="font-bold text-lg bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
              {isPlatformUser ? 'SLMS Platform' : (userContext?.company_name || 'SLMS')}
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400 -mt-0.5">
              {isPlatformUser ? 'إدارة المنصة' : (userContext?.branch_name || 'نظام اللوجستيات')}
            </p>
          </div>
        </Link>
      </div>

      {/* Center - Enhanced Search */}
      <div className="hidden md:flex flex-1 max-w-lg mx-6">
        <div className={clsx(
          'relative w-full transition-all duration-300',
          searchFocused && 'scale-105'
        )}>
          <MagnifyingGlassIcon className={clsx(
            'absolute start-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-200',
            searchFocused ? 'text-blue-500' : 'text-slate-400'
          )} />
          <input
            type="search"
            placeholder={t('common.search') + '... (⌘K)'}
            className="w-full ps-12 pe-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-all duration-200 placeholder:text-slate-400"
            aria-label="Search"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          <kbd className="absolute end-3 top-1/2 -translate-y-1/2 hidden lg:inline-flex items-center gap-1 px-2 py-1 text-xs text-slate-400 bg-slate-100 dark:bg-slate-700 rounded-md">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-1 lg:gap-2">
        {/* Company/Branch selectors — only for tenant users */}
        {isTenantUser && (
          <>
            <CompanySelector />
            <BranchSelector />
          </>
        )}
        
        {/* Platform indicator for platform users */}
        {isPlatformUser && (
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
            <ShieldCheckIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="text-xs font-medium text-purple-700 dark:text-purple-300">Platform Admin</span>
          </div>
        )}
        
        {/* Language selector */}
        <LanguageSelector variant="dropdown" />

        {/* Theme toggle with animation */}
        <button
          onClick={toggleTheme}
          className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all duration-200 active:scale-95 group"
          aria-label="Toggle theme"
        >
          {theme === 'light' ? (
            <MoonIcon className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
          ) : (
            <SunIcon className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300 text-amber-400" />
          )}
        </button>

        {/* Approval Tracker */}
        <ApprovalTrackerBell />

        {/* Enhanced Notifications */}
        <NotificationBell />

        {/* Enhanced User menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className={clsx(
              'flex items-center gap-2 p-2 rounded-xl transition-all duration-200',
              userMenuOpen 
                ? 'bg-blue-50 dark:bg-blue-900/30' 
                : 'hover:bg-slate-100 dark:hover:bg-slate-700'
            )}
            aria-expanded={userMenuOpen}
            aria-haspopup="true"
          >
            <div className="relative">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-blue-500/25">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="absolute -bottom-0.5 -end-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-800" />
            </div>
            <span className="hidden lg:block font-medium text-sm max-w-[120px] truncate">
              {user?.email?.split('@')[0]}
            </span>
            {/* Role badge next to username (QA 13.09) */}
            {user?.roles?.[0] === 'super_admin' && (
              <span className="hidden lg:inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold rounded bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 uppercase">
                SA
              </span>
            )}
          </button>

          {userMenuOpen && (
            <div className="absolute end-0 mt-2 w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-200/50 dark:border-slate-700/50 py-2 animate-scale-in overflow-hidden">
              {/* User info section */}
              <div className="px-4 py-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-800 border-b border-slate-200/50 dark:border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-lg shadow-blue-500/30">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-white truncate">{user?.email?.split('@')[0]}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                    <span className={clsx(
                      'inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 text-xs font-medium rounded-full',
                      getRoleBadgeColor(user?.roles?.[0] || 'user')
                    )}>
                      <RoleIcon className="w-3 h-3" />
                      {user?.roles?.[0]?.replace('_', ' ').toUpperCase() || 'USER'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Menu items */}
              <div className="p-2">
                <Link
                  href="/profile"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <UserIcon className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                  <span>{t('common.profile')}</span>
                </Link>
                <Link
                  href="/settings"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <Cog6ToothIcon className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                  <span>{t('menu.settings')}</span>
                </Link>
              </div>

              <div className="border-t border-slate-200/50 dark:border-slate-700/50 p-2">
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors group"
                >
                  <ArrowRightEndOnRectangleIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  <span>{t('common.logout')}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
