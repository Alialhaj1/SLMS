/**
 * Company Context Store
 * Manages active company selection for multi-tenant ERP
 */

const STORAGE_KEY = 'activeCompanyId';

export interface Company {
  id: number;
  name: string;
  code: string;
  currency_id: number;
}

class CompanyStore {
  private activeCompanyId: number | null = null;
  private listeners: Set<(companyId: number | null) => void> = new Set();

  constructor() {
    // Load from localStorage on init
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.activeCompanyId = parseInt(stored);
      }
    }
  }

  /**
   * Get current active company ID
   */
  getActiveCompanyId(): number | null {
    return this.activeCompanyId;
  }

  /**
   * Set active company
   */
  setActiveCompany(companyId: number | null) {
    this.activeCompanyId = companyId;
    
    if (typeof window !== 'undefined') {
      if (companyId) {
        localStorage.setItem(STORAGE_KEY, companyId.toString());
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    
    // Notify listeners
    this.listeners.forEach(listener => listener(companyId));
  }

  /**
   * Subscribe to company changes
   */
  subscribe(listener: (companyId: number | null) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Clear active company
   */
  clear() {
    this.setActiveCompany(null);
  }
}

export const companyStore = new CompanyStore();
