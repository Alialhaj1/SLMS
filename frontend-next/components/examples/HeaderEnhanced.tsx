/**
 * Updated Header Component - Enhanced i18n Example
 * Shows how to migrate from old translation system to new i18n system
 */

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
import { useLocale } from '../../contexts/LocaleContext'; // NEW: Enhanced locale context
import { useCommonTranslations } from '../../hooks/useTranslations'; // NEW: Specific translation hook
import NotificationBell from '../layout/NotificationBell';
import LanguageSelector from '../ui/LanguageSelector';
import CompanySelector from '../common/CompanySelector';
import BranchSelector from '../common/BranchSelector';
import clsx from 'clsx';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function HeaderEnhanced({ onMenuClick }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  
  // NEW: Enhanced i18n hooks
  const { dir, isRTL, loading } = useLocale();
  const { actions, labels, ct } = useCommonTranslations();
  
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
      admin: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white',
      manager: 'bg-gradient-to-r from-green-500 to-green-600 text-white',
      user: 'bg-gradient-to-r from-gray-400 to-gray-500 text-white',
    };
    return colors[role] || colors.user;
  };

  const getRoleDisplayName = (role: string) => {
    // NEW: Enhanced role translations with proper i18n
    const roleNames: Record<string, string> = {
      super_admin: ct('labels.type') ? `${ct('labels.type')} - Super Admin` : 'Super Administrator',
      admin: 'Administrator',
      manager: 'Manager',
      user: 'User',
    };
    return roleNames[role] || role;
  };

  // NEW: Loading state handling
  if (loading) {
    return (
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="animate-pulse bg-gray-300 dark:bg-gray-600 h-8 w-32 rounded"></div>
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header 
      className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700" 
      dir={dir} // NEW: Automatic RTL/LTR direction
    >
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left section */}
          <div className="flex items-center">
            {/* Mobile menu button */}
            <button
              type="button"
              className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              onClick={onMenuClick}
              aria-label={isRTL ? 'القائمة' : 'Menu'} // NEW: Accessible label with translation
            >
              <Bars3Icon className="h-6 w-6" />
            </button>

            {/* Logo */}
            <div className="flex-shrink-0 flex items-center ml-4 md:ml-0 rtl:mr-4 rtl:md:mr-0">
              <Link href="/dashboard" className="flex items-center">
                <BuildingOffice2Icon className="h-8 w-8 text-blue-600" />
                <span className="ml-2 rtl:mr-2 text-xl font-bold text-gray-900 dark:text-white">
                  SLMS
                </span>
              </Link>
            </div>

            {/* Company and Branch Selectors */}
            <div className="hidden md:flex md:items-center md:ml-6 rtl:md:mr-6 md:space-x-4 rtl:md:space-x-reverse">
              <CompanySelector />
              <BranchSelector />
            </div>
          </div>

          {/* Center section - Search */}
          <div className="hidden md:flex md:items-center md:flex-1 md:max-w-xs md:mx-6">
            <div className="w-full">
              <label htmlFor="search" className="sr-only">
                {actions.search()} {/* NEW: Screen reader accessible */}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 rtl:right-0 rtl:left-auto pl-3 rtl:pr-3 rtl:pl-0 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon 
                    className={clsx(
                      'h-5 w-5 transition-colors',
                      searchFocused 
                        ? 'text-blue-500' 
                        : 'text-gray-400'
                    )} 
                  />
                </div>
                <input
                  id="search"
                  type="text"
                  className="block w-full pl-10 rtl:pr-10 rtl:pl-3 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all duration-200"
                  placeholder={actions.search()} // NEW: Translated placeholder
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                />
              </div>
            </div>
          </div>

          {/* Right section */}
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            {/* Language Selector */}
            <LanguageSelector />

            {/* Theme Toggle */}
            <button
              type="button"
              className="p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} // TODO: Translate
            >
              {theme === 'dark' ? (
                <SunIcon className="h-5 w-5" />
              ) : (
                <MoonIcon className="h-5 w-5" />
              )}
            </button>

            {/* Notifications */}
            <NotificationBell />

            {/* User Menu */}
            <div className="relative ml-3 rtl:mr-3 rtl:ml-0" ref={menuRef}>
              <button
                type="button"
                className="flex items-center max-w-xs bg-white dark:bg-gray-800 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700 p-1 transition-colors duration-200"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
                aria-label={isRTL ? 'الملف الشخصي' : 'My Profile'} // NEW: Accessible label
              >
                <div className="flex items-center space-x-3 rtl:space-x-reverse px-2 py-1">
                  <UserCircleIcon className="h-8 w-8 text-gray-400" />
                  <div className="hidden md:block text-left rtl:text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {user?.full_name || (isRTL ? 'مستخدم' : 'User')}
                    </p>
                    <div className="flex items-center mt-1">
                      <span
                        className={clsx(
                          'inline-block px-2 py-0.5 rounded-full text-xs font-medium',
                          getRoleBadgeColor(user?.roles?.[0] || 'user')
                        )}
                      >
                        {getRoleDisplayName(user?.roles?.[0] || 'user')}
                      </span>
                    </div>
                  </div>
                </div>
              </button>

              {/* User Dropdown Menu */}
              {userMenuOpen && (
                <div className="absolute right-0 rtl:left-0 rtl:right-auto mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 z-50 border border-gray-200 dark:border-gray-700">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-3 rtl:space-x-reverse">
                      <UserCircleIcon className="h-12 w-12 text-gray-400" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {user?.full_name || (isRTL ? 'مستخدم' : 'User')}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {user?.email}
                        </p>
                        <span
                          className={clsx(
                            'inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium',
                            getRoleBadgeColor(user?.roles?.[0] || 'user')
                          )}
                        >
                          {getRoleDisplayName(user?.roles?.[0] || 'user')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="py-1">
                    <Link
                      href="/profile"
                      className="flex items-center px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <UserIcon className="h-5 w-5 mr-3 rtl:ml-3 rtl:mr-0 text-gray-400" />
                      {isRTL ? 'الملف الشخصي' : 'My Profile'} {/* NEW: Translated menu item */}
                    </Link>
                    <Link
                      href="/settings"
                      className="flex items-center px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Cog6ToothIcon className="h-5 w-5 mr-3 rtl:ml-3 rtl:mr-0 text-gray-400" />
                      {isRTL ? 'الإعدادات' : 'Settings'} {/* NEW: Translated menu item */}
                    </Link>
                    <button
                      onClick={() => {
                        logout();
                        setUserMenuOpen(false);
                      }}
                      className="flex items-center w-full text-left rtl:text-right px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                    >
                      <ArrowRightEndOnRectangleIcon className="h-5 w-5 mr-3 rtl:ml-3 rtl:mr-0 text-gray-400" />
                      {isRTL ? 'تسجيل الخروج' : 'Logout'} {/* NEW: Translated menu item */}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}