import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  MagnifyingGlassIcon,
  UserCircleIcon,
  SunIcon,
  MoonIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../hooks/useTranslation';
import NotificationBell from './NotificationBell';
import LanguageSelector from '../ui/LanguageSelector';
import CompanySelector from '../common/CompanySelector';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
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
      super_admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      admin: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      manager: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      user: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    return colors[role] || colors.user;
  };

  return (
    <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 flex items-center justify-between sticky top-0 z-40">
      {/* Left section */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors lg:hidden"
          aria-label="Toggle menu"
        >
          <Bars3Icon className="w-6 h-6" />
        </button>

        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">S</span>
          </div>
          <span className="font-bold text-xl hidden sm:block">SLMS</span>
        </Link>
      </div>

      {/* Center - Search (optional, future-ready) */}
      <div className="hidden md:flex flex-1 max-w-md mx-4">
        <div className="relative w-full">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="search"
            placeholder={t('common.search')}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label="Search"
          />
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2">
        <CompanySelector />
        {/* Language selector */}
        <LanguageSelector variant="dropdown" />

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          aria-label="Toggle theme"
        >
          {theme === 'light' ? (
            <MoonIcon className="w-5 h-5" />
          ) : (
            <SunIcon className="w-5 h-5" />
          )}
        </button>

        {/* Notifications */}
        <NotificationBell />

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-expanded={userMenuOpen}
            aria-haspopup="true"
          >
            <UserCircleIcon className="w-6 h-6" />
            <span className="hidden sm:block font-medium">{user?.email.split('@')[0]}</span>
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <p className="font-medium text-sm">{user?.email}</p>
                <span
                  className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded ${getRoleBadgeColor(
                    user?.roles?.[0] || 'user'
                  )}`}
                >
                  {user?.roles?.[0]?.replace('_', ' ').toUpperCase() || 'USER'}
                </span>
              </div>

              <Link
                href="/profile"
                className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                onClick={() => setUserMenuOpen(false)}
              >
                {t('common.profile')}
              </Link>
              <Link
                href="/auth/change-password"
                className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                onClick={() => setUserMenuOpen(false)}
              >
                {t('profile.security.changePassword')}
              </Link>

              <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>

              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  logout();
                }}
                className="w-full text-left px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors"
              >
                {t('common.logout')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
