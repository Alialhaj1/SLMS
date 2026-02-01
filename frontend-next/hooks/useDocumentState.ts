/**
 * 📦 USE DOCUMENT STATE HOOK
 * ===========================
 * Frontend hook for document state management
 * 
 * Features:
 * ✅ Fetch side effects before posting
 * ✅ Get matching results
 * ✅ Get document history
 * ✅ Handle post/reverse/delete operations
 */

import { useState, useCallback } from 'react';
import { useToast } from '../contexts/ToastContext';
import { useLocale } from '../contexts/LocaleContext';

export type DocumentType = 'purchase-orders' | 'purchase-invoices' | 'purchase-returns' | 'goods-receipts' | 'vendor-contracts' | 'vendor-quotations';
export type ActionType = 'post' | 'reverse' | 'delete' | 'approve';

export interface SideEffects {
  updates_inventory: boolean;
  updates_vendor_balance: boolean;
  creates_journal_entry: boolean;
  locks_document: boolean;
  description: string;
  description_ar: string;
  details?: {
    invoice_number?: string;
    total_amount?: number;
    vendor_name?: string;
    vendor_balance_change?: number;
  };
}

export interface MatchingResult {
  is_matched: boolean;
  match_status: string;
  total_variances: number;
  variances: any[];
  summary: {
    po_total: number;
    gr_total: number;
    invoice_total: number;
    total_variance: number;
    variance_percent: number;
  };
  warnings: string[];
  warnings_ar: string[];
  requires_approval: boolean;
}

export interface HistoryEvent {
  id: number;
  action: string;
  action_label: string;
  action_label_ar: string;
  performer_name: string;
  performed_at: string;
  reason?: string;
}

interface UseDocumentStateReturn {
  // Loading states
  loading: boolean;
  postLoading: boolean;
  reverseLoading: boolean;
  deleteLoading: boolean;
  
  // Data
  sideEffects: SideEffects | null;
  matchingResult: MatchingResult | null;
  history: HistoryEvent[];
  
  // Actions
  fetchSideEffects: (documentId: number, action: ActionType) => Promise<SideEffects | null>;
  fetchMatching: (documentId: number) => Promise<MatchingResult | null>;
  fetchHistory: (documentId: number) => Promise<HistoryEvent[]>;
  postDocument: (documentId: number, forcePost?: boolean, matchingOverrideReason?: string) => Promise<boolean>;
  reverseDocument: (documentId: number, reason: string, reasonAr?: string) => Promise<boolean>;
  deleteDocument: (documentId: number) => Promise<boolean>;
  
  // Helpers
  canPost: (document: any) => boolean;
  canReverse: (document: any) => boolean;
  canEdit: (document: any) => boolean;
  canDelete: (document: any) => boolean;
}

const API_BASE = 'http://localhost:4000/api/procurement';

export function useDocumentState(documentType: DocumentType): UseDocumentStateReturn {
  const { showToast } = useToast();
  const { locale } = useLocale();
  const isArabic = locale === 'ar';

  const [loading, setLoading] = useState(false);
  const [postLoading, setPostLoading] = useState(false);
  const [reverseLoading, setReverseLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [sideEffects, setSideEffects] = useState<SideEffects | null>(null);
  const [matchingResult, setMatchingResult] = useState<MatchingResult | null>(null);
  const [history, setHistory] = useState<HistoryEvent[]>([]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('accessToken');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    };
  };

  // Fetch side effects preview
  const fetchSideEffects = useCallback(async (documentId: number, action: ActionType): Promise<SideEffects | null> => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/${documentType}/${documentId}/side-effects?action=${action}`,
        { headers: getAuthHeaders() }
      );
      
      if (!response.ok) throw new Error('Failed to fetch side effects');
      
      const result = await response.json();
      setSideEffects(result.data);
      return result.data;
    } catch (error) {
      console.error('Error fetching side effects:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [documentType]);

  // Fetch 3-way matching result
  const fetchMatching = useCallback(async (documentId: number): Promise<MatchingResult | null> => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/${documentType}/${documentId}/matching`,
        { headers: getAuthHeaders() }
      );
      
      if (!response.ok) throw new Error('Failed to fetch matching');
      
      const result = await response.json();
      setMatchingResult(result.data);
      return result.data;
    } catch (error) {
      console.error('Error fetching matching:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [documentType]);

  // Fetch document history
  const fetchHistory = useCallback(async (documentId: number): Promise<HistoryEvent[]> => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/${documentType}/${documentId}/history`,
        { headers: getAuthHeaders() }
      );
      
      if (!response.ok) throw new Error('Failed to fetch history');
      
      const result = await response.json();
      setHistory(result.data || []);
      return result.data || [];
    } catch (error) {
      console.error('Error fetching history:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [documentType]);

  // Post document
  const postDocument = useCallback(async (
    documentId: number, 
    forcePost: boolean = false,
    matchingOverrideReason?: string
  ): Promise<boolean> => {
    setPostLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/${documentType}/${documentId}/post`,
        {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ 
            force_post: forcePost,
            matching_override_reason: matchingOverrideReason
          })
        }
      );
      
      const result = await response.json();
      
      if (!response.ok) {
        // Handle matching variance that requires approval
        if (result.error?.code === 'MATCHING_VARIANCE') {
          setMatchingResult(result.matching);
          return false;
        }
        
        showToast(
          isArabic ? result.error?.message_ar || result.error?.message : result.error?.message,
          'error'
        );
        return false;
      }
      
      showToast(isArabic ? result.message_ar : result.message, 'success');
      return true;
    } catch (error) {
      console.error('Error posting document:', error);
      showToast(isArabic ? 'فشل الترحيل' : 'Failed to post', 'error');
      return false;
    } finally {
      setPostLoading(false);
    }
  }, [documentType, showToast, isArabic]);

  // Reverse document
  const reverseDocument = useCallback(async (
    documentId: number, 
    reason: string,
    reasonAr?: string
  ): Promise<boolean> => {
    setReverseLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/${documentType}/${documentId}/reverse`,
        {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ reason, reason_ar: reasonAr || reason })
        }
      );
      
      const result = await response.json();
      
      if (!response.ok) {
        showToast(
          isArabic ? result.error?.message_ar || result.error?.message : result.error?.message,
          'error'
        );
        return false;
      }
      
      showToast(isArabic ? result.message_ar : result.message, 'success');
      return true;
    } catch (error) {
      console.error('Error reversing document:', error);
      showToast(isArabic ? 'فشل العكس' : 'Failed to reverse', 'error');
      return false;
    } finally {
      setReverseLoading(false);
    }
  }, [documentType, showToast, isArabic]);

  // Delete document
  const deleteDocument = useCallback(async (documentId: number): Promise<boolean> => {
    setDeleteLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/${documentType}/${documentId}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders()
        }
      );
      
      const result = await response.json();
      
      if (!response.ok) {
        // Handle requires_reversal flag
        if (result.error?.requires_reversal) {
          showToast(
            isArabic 
              ? 'لا يمكن حذف المستند المرحل. يجب عكسه أولاً.'
              : 'Cannot delete posted document. Reverse it first.',
            'warning'
          );
        } else {
          showToast(
            isArabic ? result.error?.message_ar || result.error?.message : result.error?.message,
            'error'
          );
        }
        return false;
      }
      
      showToast(isArabic ? 'تم الحذف بنجاح' : 'Deleted successfully', 'success');
      return true;
    } catch (error) {
      console.error('Error deleting document:', error);
      showToast(isArabic ? 'فشل الحذف' : 'Failed to delete', 'error');
      return false;
    } finally {
      setDeleteLoading(false);
    }
  }, [documentType, showToast, isArabic]);

  // Helper functions to check permissions locally
  const canPost = (document: any): boolean => {
    if (!document) return false;
    const status = document.status;
    const isPosted = document.is_posted;
    const isReversed = document.is_reversed;
    
    return status === 'approved' && !isPosted && !isReversed;
  };

  const canReverse = (document: any): boolean => {
    if (!document) return false;
    return document.is_posted === true && document.is_reversed !== true;
  };

  const canEdit = (document: any): boolean => {
    if (!document) return false;
    return document.status === 'draft' && !document.is_posted && !document.is_locked;
  };

  const canDelete = (document: any): boolean => {
    if (!document) return false;
    return document.status === 'draft' && !document.is_posted && !document.is_approved;
  };

  return {
    loading,
    postLoading,
    reverseLoading,
    deleteLoading,
    sideEffects,
    matchingResult,
    history,
    fetchSideEffects,
    fetchMatching,
    fetchHistory,
    postDocument,
    reverseDocument,
    deleteDocument,
    canPost,
    canReverse,
    canEdit,
    canDelete
  };
}

export default useDocumentState;
