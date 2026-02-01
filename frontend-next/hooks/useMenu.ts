/**
 * 🧠 USE MENU - Hook لبناء القائمة الجانبية
 * =====================================================
 * 
 * يبني القائمة من MENU_REGISTRY مع:
 * ✅ فلترة حسب الصلاحيات
 * ✅ ترجمة تلقائية
 * ✅ إعادة البناء عند تغيير اللغة
 * ✅ دعم Badge/Counter للإشعارات
 * 
 * @example
 * const { menu, isLoading, getBadgeCount } = useMenu();
 */

import { useMemo } from 'react';
import {
  HomeIcon,
  ChartBarIcon,
  TruckIcon,
  CurrencyDollarIcon,
  BuildingStorefrontIcon,
  UsersIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  CalculatorIcon,
  BanknotesIcon,
  ClipboardDocumentListIcon,
  CubeIcon,
  BuildingOfficeIcon,
  PlusIcon,
  MapPinIcon,
  ClockIcon,
  // New icons for expanded menu
  HashtagIcon,
  PrinterIcon,
  FingerPrintIcon,
  BookOpenIcon,
  ChartPieIcon,
  CalendarIcon,
  ArrowPathIcon,
  DocumentDuplicateIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ArrowsRightLeftIcon,
  CheckCircleIcon,
  DocumentMinusIcon,
  DocumentPlusIcon,
  CalendarDaysIcon,
  BuildingLibraryIcon,
  ArrowTrendingUpIcon,
  ScaleIcon,
  BuildingOffice2Icon,
  CreditCardIcon,
  TicketIcon,
  BellIcon,
  ShoppingCartIcon,
  TagIcon,
  ArrowUturnLeftIcon,
  ListBulletIcon,
  ReceiptPercentIcon,
  ShoppingBagIcon,
  AdjustmentsVerticalIcon,
  FlagIcon,
  RectangleGroupIcon,
  FolderIcon,
  QrCodeIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentCheckIcon,
  GlobeAltIcon,
  UserIcon,
  CubeTransparentIcon,
  CircleStackIcon,
  CodeBracketIcon,
  ShieldExclamationIcon,
  MapIcon,
  WrenchIcon,
  HeartIcon,
  StarIcon,
  PhoneIcon,
  SparklesIcon,
  DocumentCheckIcon,
  IdentificationIcon,
  BriefcaseIcon,
  LockClosedIcon,
  KeyIcon,
  BellAlertIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  Squares2X2Icon,
  InboxStackIcon,
  RectangleStackIcon,
  CloudArrowUpIcon,
  CloudArrowDownIcon,
  LinkIcon,
  ArrowUpOnSquareIcon,
  SignalIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from './useTranslation';
import { usePermissions } from './usePermissions';
import { useLocale } from '../contexts/LocaleContext';
import { MENU_REGISTRY, MenuItemConfig, BadgeType } from '../config/menu.registry';
import { useBadgeCounts } from './useBadgeCounts';

/**
 * خريطة الأيقونات - تحويل اسم الأيقونة إلى المكون الفعلي
 */
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  HomeIcon,
  ChartBarIcon,
  TruckIcon,
  CurrencyDollarIcon,
  BuildingStorefrontIcon,
  UsersIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  CalculatorIcon,
  BanknotesIcon,
  ClipboardDocumentListIcon,
  CubeIcon,
  BuildingOfficeIcon,
  PlusIcon,
  MapPinIcon,
  ClockIcon,
  // Expanded icons
  HashtagIcon,
  PrinterIcon,
  FingerPrintIcon,
  BookOpenIcon,
  ChartPieIcon,
  CalendarIcon,
  ArrowPathIcon,
  DocumentDuplicateIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ArrowsRightLeftIcon,
  CheckCircleIcon,
  DocumentMinusIcon,
  DocumentPlusIcon,
  CalendarDaysIcon,
  BuildingLibraryIcon,
  ArrowTrendingUpIcon,
  ScaleIcon,
  BuildingOffice2Icon,
  CreditCardIcon,
  TicketIcon,
  BellIcon,
  ShoppingCartIcon,
  TagIcon,
  ArrowUturnLeftIcon,
  ListBulletIcon,
  ReceiptPercentIcon,
  ShoppingBagIcon,
  AdjustmentsVerticalIcon,
  FlagIcon,
  RectangleGroupIcon,
  FolderIcon,
  QrCodeIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentCheckIcon,
  GlobeAltIcon,
  UserIcon,
  CubeTransparentIcon,
  CircleStackIcon,
  CodeBracketIcon,
  ShieldExclamationIcon,
  MapIcon,
  WrenchIcon,
  HeartIcon,
  StarIcon,
  PhoneIcon,
  SparklesIcon,
  DocumentCheckIcon,
  IdentificationIcon,
  BriefcaseIcon,
  LockClosedIcon,
  KeyIcon,
  BellAlertIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  Squares2X2Icon,
  InboxStackIcon,
  RectangleStackIcon,
  CloudArrowUpIcon,
  CloudArrowDownIcon,
  LinkIcon,
  ArrowUpOnSquareIcon,
  SignalIcon,
};

/**
 * عنصر القائمة المُعالَج (مع الترجمة والأيقونة والـ Badge)
 */
export interface ProcessedMenuItem {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path?: string;
  permission?: string;
  children?: ProcessedMenuItem[];
  /** نوع الـ Badge (للحصول على العدد) */
  badge?: BadgeType;
  /** عدد الـ Badge (محسوب) */
  badgeCount?: number;
}

/**
 * بناء القائمة من الـ Registry
 */
function buildMenu(
  items: MenuItemConfig[],
  t: (key: string) => string,
  hasPermission: (permission: string) => boolean,
  getBadgeCount: (badge: BadgeType | undefined) => number | undefined
): ProcessedMenuItem[] {
  return items
    .map((item) => {
      const Icon = ICON_MAP[item.icon] || HomeIcon;

      // IMPORTANT:
      // Build children first so we can keep parent sections visible
      // if at least one child is permitted (even when parent permission is missing).
      const processedChildren =
        item.children && item.children.length > 0
          ? buildMenu(item.children, t, hasPermission, getBadgeCount)
          : undefined;

      let allowedSelf = true;
      if (item.permission) {
        try {
          allowedSelf = hasPermission(item.permission as any);
        } catch {
          allowedSelf = false;
        }
      }

      const allowedByChildren = !!processedChildren && processedChildren.length > 0;
      if (!allowedSelf && !allowedByChildren) return null;

      const processedItem: ProcessedMenuItem = {
        key: item.key,
        label: t(item.labelKey),
        icon: Icon,
        path: item.path,
        permission: item.permission,
        badge: item.badge,
        badgeCount: getBadgeCount(item.badge),
      };

      if (allowedByChildren) {
        processedItem.children = processedChildren;
      }

      return processedItem;
    })
    .filter((item): item is ProcessedMenuItem => !!item)
    // إزالة العناصر التي لديها أطفال لكن كلهم مفلترين
    .filter((item) => !item.children || item.children.length > 0);
}

/**
 * 🎯 Hook للقائمة الجانبية
 * 
 * @returns القائمة المبنية مع الترجمة والصلاحيات والـ Badges
 */
export function useMenu() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const { 
    getBadgeCount, 
    counts: badgeCounts,
    refetch: refetchBadges,
    isLoading: badgesLoading,
  } = useBadgeCounts();

  // بناء القائمة مع إعادة البناء عند تغيير اللغة أو الصلاحيات أو الـ Badges
  const menu = useMemo(() => {
    if (permissionsLoading) return [];
    
    return buildMenu(MENU_REGISTRY, t, hasPermission, getBadgeCount);
  }, [locale, t, hasPermission, permissionsLoading, badgeCounts, getBadgeCount]);

  return {
    menu,
    isLoading: permissionsLoading,
    badgesLoading,
    refetchBadges,
    getBadgeCount,
  };
}

export default useMenu;
