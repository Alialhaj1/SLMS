/**
 * 🗂️ SIDEBAR - القائمة الجانبية
 * =====================================================
 * 
 * مبنية من MENU_REGISTRY مع:
 * ✅ ترجمة تلقائية من i18n
 * ✅ فلترة حسب الصلاحيات
 * ✅ إعادة البناء عند تغيير اللغة
 * ✅ دعم Badge/Counter للإشعارات
 * ✅ البحث في القوائم
 * ✅ المفضلة
 * 
 * @see config/menu.registry.ts - المصدر الواحد للقائمة
 * @see hooks/useMenu.ts - Hook لبناء القائمة
 * @see hooks/useBadgeCounts.ts - Hook للعدادات
 * @see hooks/useFavorites.ts - Hook للمفضلة
 * @see hooks/useMenuSearch.ts - Hook للبحث
 */

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  ChevronDownIcon, 
  ChevronRightIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  StarIcon as StarOutline
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import { useMenu, ProcessedMenuItem } from '../../hooks/useMenu';
import { useTranslation } from '../../hooks/useTranslation';
import { useFavorites } from '../../hooks/useFavorites';
import { useMenuSearch } from '../../hooks/useMenuSearch';
import clsx from 'clsx';

interface SidebarProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
  mobile?: boolean;
}

export default function Sidebar({ collapsed, onCollapse, mobile }: SidebarProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { menu, isLoading } = useMenu();
  const { isFavorite, toggleFavorite, getFavoriteItems } = useFavorites();
  const { searchTerm, setSearchTerm, searchResults, isSearching, clearSearch, resultsCount } = useMenuSearch(menu);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  
  // عرض المفضلة
  const [showFavorites, setShowFavorites] = useState(false);
  const favoriteItems = getFavoriteItems(menu);
  
  // العناصر المفتوحة (expanded) - نفتح الأقسام الرئيسية افتراضياً
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['home', 'financials', 'adminSecurity', 'myRequests']);

  // في وضع الـ collapsed: نثبت (pin) الـ flyout عند النقر بدلاً من hover فقط
  const [pinnedFlyoutKey, setPinnedFlyoutKey] = useState<string | null>(null);

  const closePinnedFlyout = () => setPinnedFlyoutKey(null);

  const togglePinnedFlyout = (key: string) => {
    setPinnedFlyoutKey((prev) => (prev === key ? null : key));
  };

  // أغلق أي flyout مثبت عند تغيير المسار أو عند فتح الـ sidebar
  useEffect(() => {
    closePinnedFlyout();
  }, [router.pathname]);

  useEffect(() => {
    if (!collapsed) {
      closePinnedFlyout();
    }
  }, [collapsed]);

  // أغلق flyout عند النقر خارج الـ sidebar (مهم عند الـ collapsed)
  useEffect(() => {
    if (!collapsed) return;

    const onMouseDown = (e: MouseEvent) => {
      const root = sidebarRef.current;
      if (!root) return;
      if (e.target instanceof Node && !root.contains(e.target)) {
        closePinnedFlyout();
      }
    };

    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [collapsed]);

  // إذا كان المسار الحالي داخل قسم معين، افتحه تلقائياً (يدعم العمق)
  useEffect(() => {
    if (!menu || menu.length === 0) return;
    const currentPath = router.pathname;

    const nextExpanded = new Set<string>();

    const walk = (items: ProcessedMenuItem[], parents: string[]): boolean => {
      let foundActive = false;
      for (const item of items) {
        const selfActive = !!item.path && (currentPath === item.path || currentPath.startsWith(item.path + '/'));

        let childActive = false;
        if (item.children && item.children.length > 0) {
          childActive = walk(item.children, [...parents, item.key]);
          if (childActive) {
            nextExpanded.add(item.key);
          }
        }

        if (selfActive) {
          parents.forEach((p) => nextExpanded.add(p));
          foundActive = true;
        }

        if (childActive) {
          parents.forEach((p) => nextExpanded.add(p));
          foundActive = true;
        }
      }
      return foundActive;
    };

    walk(menu, []);

    if (nextExpanded.size > 0) {
      const next = Array.from(nextExpanded);
      setExpandedMenus((prev) => {
        const prevSet = new Set(prev);
        if (prevSet.size === nextExpanded.size) {
          let same = true;
          for (const k of nextExpanded) {
            if (!prevSet.has(k)) {
              same = false;
              break;
            }
          }
          if (same) return prev;
        }
        return next;
      });
    }
  }, [router.pathname, menu.length]);

  const toggleMenu = (key: string) => {
    setExpandedMenus((prev) =>
      prev.includes(key) ? prev.filter((m) => m !== key) : [...prev, key]
    );
  };

  const isActive = (path?: string) => {
    if (!path) return false;
    return router.pathname === path || router.pathname.startsWith(path + '/');
  };

  // Loading state
  if (isLoading) {
    return (
      <aside
        className={clsx(
          'bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 flex flex-col h-full',
          mobile ? 'fixed inset-y-0 left-0 z-50 w-64' : 'relative',
          collapsed && !mobile ? 'w-20' : 'w-64'
        )}
      >
        <div className="h-16 flex items-center px-4 border-b border-gray-200 dark:border-gray-700">
          <div className="animate-pulse w-24 h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            </div>
          ))}
        </nav>
      </aside>
    );
  }

  return (
    <aside
      ref={sidebarRef as any}
      className={clsx(
        'bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 flex flex-col h-full',
        mobile ? 'fixed inset-y-0 left-0 z-50 w-64' : 'relative',
        collapsed && !mobile ? 'w-20' : 'w-64'
      )}
    >
      {/* Sidebar header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
        {!collapsed && (
          <h2 className="font-semibold text-lg">{t('common.name')}</h2>
        )}
      </div>

      {/* 🔍 Search Bar */}
      {!collapsed && (
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('common.searchMenu') || 'Search menu...'}
              className="w-full ps-9 pe-8 py-2 text-sm bg-gray-100 dark:bg-gray-700 border-0 rounded-lg focus:ring-2 focus:ring-primary-500 focus:bg-white dark:focus:bg-gray-600 transition-colors"
            />
            {isSearching && (
              <button
                onClick={clearSearch}
                className="absolute end-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
              >
                <XMarkIcon className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
          
          {/* Favorites Toggle */}
          {favoriteItems.length > 0 && !isSearching && (
            <button
              onClick={() => setShowFavorites(!showFavorites)}
              className={clsx(
                'mt-2 w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors',
                showFavorites
                  ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
            >
              <StarSolid className="w-4 h-4 text-amber-500" />
              <span>{t('common.favorites') || 'Favorites'}</span>
              <span className="ms-auto text-xs bg-amber-100 dark:bg-amber-800 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-full">
                {favoriteItems.length}
              </span>
            </button>
          )}
        </div>
      )}

      {/* 🔍 Search Results */}
      {!collapsed && isSearching && (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 px-3">
            {resultsCount === 0 
              ? t('common.noResults') || 'No results found'
              : `${resultsCount} ${t('common.results') || 'results'}`
            }
          </div>
          {searchResults.map((item) => (
            <SearchResultItem
              key={item.key}
              item={item}
              isActive={isActive}
              isFavorite={isFavorite(item.key)}
              onToggleFavorite={() => toggleFavorite(item.key)}
              onClick={clearSearch}
            />
          ))}
        </div>
      )}

      {/* ⭐ Favorites Section */}
      {!collapsed && showFavorites && !isSearching && (
        <div className="border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 px-3 uppercase tracking-wider">
            {t('common.favorites') || 'Favorites'}
          </div>
          {favoriteItems.map((item) => (
            <Link
              key={item.key}
              href={item.path || '#'}
              className={clsx(
                'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm',
                isActive(item.path)
                  ? 'bg-blue-600 dark:bg-blue-700 text-white font-medium'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-white/10'
              )}
            >
              {item.icon && <item.icon className="w-4 h-4 flex-shrink-0" />}
              <span>{item.label}</span>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleFavorite(item.key);
                }}
                className="ms-auto p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
              >
                <StarSolid className="w-4 h-4 text-amber-500" />
              </button>
            </Link>
          ))}
        </div>
      )}

      {/* Menu items */}
      {!isSearching && (
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {menu.map((item) => (
            <SidebarNode
              key={item.key}
              item={item}
              depth={0}
              collapsed={collapsed}
              expandedKeys={expandedMenus}
              onToggle={toggleMenu}
              isActive={isActive}
              isFavorite={isFavorite}
              onToggleFavorite={toggleFavorite}
              pinnedFlyoutKey={pinnedFlyoutKey}
              onTogglePinnedFlyout={togglePinnedFlyout}
              onClosePinnedFlyout={closePinnedFlyout}
            />
          ))}
        </nav>
      )}

      {/* Collapse toggle button at bottom (QA 13.01-02) */}
      {!mobile && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-3">
          <button
            onClick={() => onCollapse(!collapsed)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors text-sm"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronRightIcon className={clsx('w-5 h-5 transition-transform duration-300', !collapsed && 'rotate-180')} />
            {!collapsed && <span>{t('common.collapse') || 'Collapse'}</span>}
          </button>
        </div>
      )}
    </aside>
  );
}

interface SidebarNodeProps {
  item: ProcessedMenuItem;
  depth: number;
  collapsed: boolean;
  expandedKeys: string[];
  onToggle: (key: string) => void;
  isActive: (path?: string) => boolean;
  isFavorite: (key: string) => boolean;
  onToggleFavorite: (key: string) => void;
  pinnedFlyoutKey?: string | null;
  onTogglePinnedFlyout?: (key: string) => void;
  onClosePinnedFlyout?: () => void;
}

function SidebarNode({
  item,
  depth,
  collapsed,
  expandedKeys,
  onToggle,
  isActive,
  isFavorite,
  onToggleFavorite,
  pinnedFlyoutKey,
  onTogglePinnedFlyout,
  onClosePinnedFlyout,
}: SidebarNodeProps) {
  const Icon = item.icon;
  const expanded = expandedKeys.includes(item.key);
  const hasChildren = !!item.children && item.children.length > 0;
  const [showFavButton, setShowFavButton] = useState(false);

  const indentClass = depth === 0 ? '' : depth === 1 ? 'ms-4' : depth === 2 ? 'ms-8' : 'ms-12';

  const renderFlyout = () => {
    if (!collapsed) return null;
    if (depth !== 0) return null;
    if (!hasChildren) return null;

    const isPinned = pinnedFlyoutKey === item.key;

    const groups = item.children!.filter((c) => c.children && c.children.length > 0);
    const directLinks = item.children!.filter((c) => !c.children || c.children.length === 0);

    return (
      <div
        className={clsx(
          'absolute top-0 z-50',
          isPinned ? 'block' : 'hidden group-hover:block group-focus-within:block',
          'ltr:left-full rtl:right-full',
          'ms-2'
        )}
      >
        <div className="w-[30rem] lg:w-[40rem] max-w-[80vw] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-3">
          <div className="px-2 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {item.label}
          </div>
          <div className="mt-2 max-h-[70vh] overflow-auto">
            <div className="columns-1 sm:columns-2 lg:columns-3 [column-gap:1rem]">
              {/* Grouped sections (preferred) */}
              {groups.map((group) => (
                <div key={group.key} className="min-w-0 break-inside-avoid mb-4">
                  <div className="px-2 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 truncate">
                    {group.label}
                  </div>
                  <div className="mt-1 space-y-1">
                    {group.children!.map((child) => (
                      <FlyoutItem key={child.key} item={child} isActive={isActive} onNavigate={onClosePinnedFlyout} />
                    ))}
                  </div>
                </div>
              ))}

              {/* Direct links (no subgroup) */}
              {directLinks.length > 0 && (
                <div className="min-w-0 break-inside-avoid mb-4">
                  <div className="px-2 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 truncate">
                    {item.label}
                  </div>
                  <div className="mt-1 space-y-1">
                    {directLinks.map((child) => (
                      <FlyoutItem key={child.key} item={child} isActive={isActive} onNavigate={onClosePinnedFlyout} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Leaf
  if (!hasChildren) {
    return (
      <div
        className={clsx('relative group', indentClass)}
        onMouseEnter={() => setShowFavButton(true)}
        onMouseLeave={() => setShowFavButton(false)}
      >
        <Link
          href={item.path || '#'}
          className={clsx(
            'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200',
            isActive(item.path)
              ? 'bg-blue-600 dark:bg-blue-700 text-white font-medium shadow-sm'
              : 'text-gray-700 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-white/10 hover:translate-x-1 rtl:hover:-translate-x-1'
          )}
          aria-label={item.label}
        >
          {depth === 0 && <Icon className="w-5 h-5 flex-shrink-0" />}
          {depth > 0 && (
            <span
              className={clsx(
                'w-2 h-2 rounded-full flex-shrink-0 transition-all duration-200',
                isActive(item.path) ? 'bg-white scale-125' : 'bg-gray-400 dark:bg-gray-500'
              )}
            />
          )}
          {!collapsed && <span className={clsx(depth === 0 ? '' : (isActive(item.path) ? 'text-sm' : 'text-sm text-gray-600 dark:text-gray-400'))}>{item.label}</span>}
          {item.badgeCount && item.badgeCount > 0 && <Badge count={item.badgeCount} collapsed={collapsed} />}
        </Link>

        {/* Tooltip for collapsed leaf */}
        {collapsed && depth === 0 && (
          <div
            className={clsx(
              'absolute top-1/2 -translate-y-1/2 hidden group-hover:block z-50',
              'ltr:left-full rtl:right-full',
              'ms-2'
            )}
          >
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm px-2 py-1 text-sm text-gray-700 dark:text-gray-200 whitespace-nowrap">
              {item.label}
            </div>
          </div>
        )}

        {/* Favorite button */}
        {!collapsed && (showFavButton || isFavorite(item.key)) && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleFavorite(item.key);
            }}
            className="absolute end-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors z-10"
            title={isFavorite(item.key) ? 'Remove from favorites' : 'Add to favorites'}
            aria-label={isFavorite(item.key) ? 'Remove from favorites' : 'Add to favorites'}
          >
            {isFavorite(item.key) ? (
              <StarSolid className="w-4 h-4 text-amber-500" />
            ) : (
              <StarOutline className="w-4 h-4 text-gray-400 hover:text-amber-500" />
            )}
          </button>
        )}
      </div>
    );
  }

  // Node with children
  return (
    <div className={clsx('relative group', indentClass)}>
      <button
        onClick={() => {
          if (collapsed && depth === 0) {
            onTogglePinnedFlyout?.(item.key);
            return;
          }
          onToggle(item.key);
        }}
        className={clsx(
          'w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors',
          'hover:bg-gray-100 dark:hover:bg-gray-700',
          'text-gray-700 dark:text-gray-300'
        )}
        aria-label={item.label}
        aria-expanded={!collapsed ? expanded : undefined}
        aria-haspopup={collapsed && depth === 0 ? 'menu' : undefined}
      >
        <div className="flex items-center gap-3">
          {depth === 0 && <Icon className="w-5 h-5 flex-shrink-0" />}
          {depth > 0 && (
            <span className="w-2 h-2 rounded-full flex-shrink-0 bg-current opacity-60" />
          )}
          {!collapsed && <span className={clsx(depth === 0 ? 'font-medium' : 'text-sm')}>{item.label}</span>}
        </div>
        <div className="flex items-center gap-2">
          {item.badgeCount && item.badgeCount > 0 && <Badge count={item.badgeCount} collapsed={collapsed} />}
          {!collapsed && (
            <ChevronDownIcon className={clsx('w-4 h-4 transition-transform', expanded && 'rotate-180')} />
          )}
        </div>
      </button>

      {renderFlyout()}

      {!collapsed && expanded && (
        <div className="mt-1 space-y-1 animate-slide-down">
          {item.children!.map((child) => (
            <SidebarNode
              key={child.key}
              item={child}
              depth={depth + 1}
              collapsed={collapsed}
              expandedKeys={expandedKeys}
              onToggle={onToggle}
              isActive={isActive}
              isFavorite={isFavorite}
              onToggleFavorite={onToggleFavorite}
              pinnedFlyoutKey={pinnedFlyoutKey}
              onTogglePinnedFlyout={onTogglePinnedFlyout}
              onClosePinnedFlyout={onClosePinnedFlyout}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FlyoutItem({
  item,
  isActive,
  onNavigate,
}: {
  item: ProcessedMenuItem;
  isActive: (path?: string) => boolean;
  onNavigate?: () => void;
}) {
  const hasChildren = !!item.children && item.children.length > 0;

  if (!hasChildren) {
    return (
      <Link
        href={item.path || '#'}
        onClick={() => onNavigate?.()}
        className={clsx(
          'block px-2 py-2 rounded-md text-sm transition-colors',
          isActive(item.path)
            ? 'bg-blue-600 dark:bg-blue-700 text-white font-medium'
            : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
        )}
      >
        {item.label}
      </Link>
    );
  }

  return (
    <div className="py-1">
      <div className="px-2 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
        {item.label}
      </div>
      <div className="mt-1 space-y-1">
        {item.children!.map((child) => (
          <FlyoutItem key={child.key} item={child} isActive={isActive} onNavigate={onNavigate} />
        ))}
      </div>
    </div>
  );
}

/**
 * 🔍 نتيجة البحث
 */
interface SearchResultItemProps {
  item: ProcessedMenuItem & { parentLabel?: string };
  isActive: (path?: string) => boolean;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onClick: () => void;
}

function SearchResultItem({ item, isActive, isFavorite, onToggleFavorite, onClick }: SearchResultItemProps) {
  const Icon = item.icon;

  return (
    <Link
      href={item.path || '#'}
      onClick={onClick}
      className={clsx(
        'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors mb-1',
        isActive(item.path)
          ? 'bg-blue-600 dark:bg-blue-700 text-white font-medium'
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
      )}
    >
      {Icon && <Icon className="w-5 h-5 flex-shrink-0" />}
      <div className="flex-1 min-w-0">
        <div className="truncate">{item.label}</div>
        {item.parentLabel && (
          <div className="text-xs text-gray-400 dark:text-gray-500 truncate">
            {item.parentLabel}
          </div>
        )}
      </div>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleFavorite();
        }}
        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
      >
        {isFavorite 
          ? <StarSolid className="w-4 h-4 text-amber-500" />
          : <StarOutline className="w-4 h-4 text-gray-400 hover:text-amber-500" />
        }
      </button>
    </Link>
  );
}

/**
 * 🔔 Badge Component - عداد الإشعارات
 */
interface BadgeProps {
  count: number;
  collapsed?: boolean;
  small?: boolean;
}

function Badge({ count, collapsed, small }: BadgeProps) {
  // تنسيق العدد (9+ للأرقام الكبيرة)
  const displayCount = count > 9 ? '9+' : count.toString();

  return (
    <span
      className={clsx(
        'inline-flex items-center justify-center font-medium rounded-full',
        'bg-red-500 text-white',
        small
          ? 'text-xs min-w-[18px] h-[18px] px-1'
          : 'text-xs min-w-[20px] h-[20px] px-1.5',
        collapsed && 'absolute top-0 right-0 scale-75 origin-top-right'
      )}
    >
      {displayCount}
    </span>
  );
}
