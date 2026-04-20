/**
 * 🔍 useMenuSearch Hook
 * =====================================================
 * Hook للبحث في عناصر القائمة
 * 
 * Usage:
 *   const { searchTerm, setSearchTerm, searchResults, clearSearch } = useMenuSearch(menu);
 */

import { useState, useCallback, useMemo } from 'react';
import { ProcessedMenuItem } from './useMenu';

interface UseMenuSearchReturn {
  /** نص البحث */
  searchTerm: string;
  /** تعيين نص البحث */
  setSearchTerm: (term: string) => void;
  /** نتائج البحث */
  searchResults: ProcessedMenuItem[];
  /** هل البحث نشط */
  isSearching: boolean;
  /** مسح البحث */
  clearSearch: () => void;
  /** عدد النتائج */
  resultsCount: number;
}

export function useMenuSearch(menu: ProcessedMenuItem[]): UseMenuSearchReturn {
  const [searchTerm, setSearchTerm] = useState('');

  // البحث في القائمة
  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) {
      return [];
    }

    const term = searchTerm.toLowerCase().trim();
    const results: ProcessedMenuItem[] = [];
    
    const searchItems = (items: ProcessedMenuItem[], parentLabel?: string) => {
      for (const item of items) {
        const label = typeof item.label === 'string' ? item.label : String(item.label || '');
        // البحث في الاسم
        const matchesLabel = label.toLowerCase().includes(term);
        // البحث في المسار
        const matchesPath = item.path?.toLowerCase().includes(term);
        // البحث في المفتاح
        const matchesKey = item.key.toLowerCase().includes(term);
        
        if (matchesLabel || matchesPath || matchesKey) {
          // إضافة معلومات المجموعة الأم
          results.push({
            ...item,
            parentLabel,
          } as ProcessedMenuItem & { parentLabel?: string });
        }
        
        // البحث في الأطفال
        if (item.children) {
          searchItems(item.children, label);
        }
      }
    };
    
    searchItems(menu);
    
    // ترتيب النتائج: الأهم أولاً
    return results.sort((a, b) => {
      const aLabel = (typeof a.label === 'string' ? a.label : String(a.label || '')).toLowerCase();
      const bLabel = (typeof b.label === 'string' ? b.label : String(b.label || '')).toLowerCase();
      
      // الأولوية للنتائج التي تبدأ بنص البحث
      const aStartsWith = aLabel.startsWith(term);
      const bStartsWith = bLabel.startsWith(term);
      
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;
      
      // ترتيب أبجدي
      return aLabel.localeCompare(bLabel);
    });
  }, [menu, searchTerm]);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
  }, []);

  return {
    searchTerm,
    setSearchTerm,
    searchResults,
    isSearching: searchTerm.trim().length > 0,
    clearSearch,
    resultsCount: searchResults.length,
  };
}
