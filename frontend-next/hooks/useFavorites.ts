/**
 * 🌟 useFavorites Hook
 * =====================================================
 * Hook لإدارة العناصر المفضلة في القائمة
 * يحفظ المفضلات في localStorage
 * 
 * Usage:
 *   const { favorites, isFavorite, toggleFavorite, getFavoriteItems } = useFavorites();
 */

import { useState, useCallback, useEffect } from 'react';
import { ProcessedMenuItem } from './useMenu';

const FAVORITES_KEY = 'slms_menu_favorites';

interface UseFavoritesReturn {
  /** قائمة مفاتيح العناصر المفضلة */
  favorites: string[];
  /** التحقق من أن عنصراً مفضل */
  isFavorite: (key: string) => boolean;
  /** إضافة/إزالة من المفضلة */
  toggleFavorite: (key: string) => void;
  /** الحصول على العناصر المفضلة من القائمة */
  getFavoriteItems: (menu: ProcessedMenuItem[]) => ProcessedMenuItem[];
  /** عدد المفضلات */
  favoritesCount: number;
}

export function useFavorites(): UseFavoritesReturn {
  const [favorites, setFavorites] = useState<string[]>([]);

  // تحميل المفضلات من localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(FAVORITES_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setFavorites(parsed);
          }
        }
      } catch (error) {
        console.error('Error loading favorites:', error);
      }
    }
  }, []);

  // حفظ المفضلات في localStorage
  const saveFavorites = useCallback((newFavorites: string[]) => {
    setFavorites(newFavorites);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
      } catch (error) {
        console.error('Error saving favorites:', error);
      }
    }
  }, []);

  // التحقق من أن عنصراً مفضل
  const isFavorite = useCallback((key: string): boolean => {
    return favorites.includes(key);
  }, [favorites]);

  // إضافة/إزالة من المفضلة
  const toggleFavorite = useCallback((key: string) => {
    const newFavorites = favorites.includes(key)
      ? favorites.filter(f => f !== key)
      : [...favorites, key];
    saveFavorites(newFavorites);
  }, [favorites, saveFavorites]);

  // الحصول على العناصر المفضلة من القائمة
  const getFavoriteItems = useCallback((menu: ProcessedMenuItem[]): ProcessedMenuItem[] => {
    const favoriteItems: ProcessedMenuItem[] = [];
    
    const findItems = (items: ProcessedMenuItem[]) => {
      for (const item of items) {
        if (favorites.includes(item.key)) {
          favoriteItems.push(item);
        }
        if (item.children) {
          findItems(item.children);
        }
      }
    };
    
    findItems(menu);
    return favoriteItems;
  }, [favorites]);

  return {
    favorites,
    isFavorite,
    toggleFavorite,
    getFavoriteItems,
    favoritesCount: favorites.length,
  };
}
