/**
 * Branch Selector Component
 * Dropdown for selecting active branch within company
 */

import { useState, useEffect, useRef } from 'react';
import { BuildingStorefrontIcon } from '@heroicons/react/24/outline';
import { branchStore, Branch } from '../../lib/branchStore';
import { companyStore } from '../../lib/companyStore';
import apiClient from '../../lib/apiClient';
import { useTranslation } from '../../hooks/useTranslation';

export default function BranchSelector() {
  const { t } = useTranslation();
  const [activeBranchId, setActiveBranchId] = useState<number | null>(branchStore.getActiveBranchId());
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Subscribe to branch store changes
  useEffect(() => {
    const unsubscribe = branchStore.subscribe(setActiveBranchId);
    return unsubscribe;
  }, []);

  // Load branches when company changes
  useEffect(() => {
    const companyId = companyStore.getActiveCompanyId();
    if (companyId) {
      loadBranches(companyId);
    } else {
      setBranches([]);
      setLoading(false);
    }

    const unsubscribe = companyStore.subscribe((newCompanyId) => {
      if (newCompanyId) {
        loadBranches(newCompanyId);
      } else {
        setBranches([]);
      }
    });
    return unsubscribe;
  }, []);

  const loadBranches = async (companyId: number) => {
    try {
      setLoading(true);
      const response = await apiClient.get<{ success: boolean; data: Branch[] }>(
        `/api/branches?company_id=${companyId}`
      );
      const branchList = response.data || [];
      setBranches(branchList);

      // Auto-select if only one branch or if no branch selected
      if (branchList.length > 0 && !activeBranchId) {
        branchStore.setActiveBranch(branchList[0].id);
      }
    } catch (error) {
      console.error('Failed to load branches:', error);
      setBranches([]);
    } finally {
      setLoading(false);
    }
  };

  const selectBranch = (branchId: number) => {
    branchStore.setActiveBranch(branchId);
    setIsOpen(false);
  };

  const hasBranches = branches.length > 0;
  const activeBranch = branches.find(b => b.id === activeBranchId);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-primary-600" />
        <span>{t('common.loading')}</span>
      </div>
    );
  }

  if (!hasBranches) {
    return null;
  }

  if (branches.length === 1) {
    // Single branch - just display
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
        <BuildingStorefrontIcon className="h-5 w-5" />
        <span className="font-medium">{branches[0].name}</span>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
      >
        <BuildingStorefrontIcon className="h-5 w-5 text-slate-500" />
        <span className="font-medium max-w-[120px] truncate">
          {activeBranch?.name || t('common.selectBranch')}
        </span>
        <svg className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full end-0 mt-1 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-50">
          {branches.map((branch) => (
            <button
              key={branch.id}
              onClick={() => selectBranch(branch.id)}
              className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${
                branch.id === activeBranchId
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium'
                  : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              <BuildingStorefrontIcon className="h-4 w-4" />
              <span className="truncate">{branch.name}</span>
              {branch.id === activeBranchId && (
                <svg className="h-4 w-4 ms-auto text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
