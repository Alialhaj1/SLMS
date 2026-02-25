/**
 * Branch Context Store
 * Manages active branch selection within a company
 * Mirrors the pattern of companyStore.ts
 */

const STORAGE_KEY = 'activeBranchId';

export interface Branch {
  id: number;
  name: string;
  code: string;
  company_id: number;
}

class BranchStore {
  private activeBranchId: number | null = null;
  private listeners: Set<(branchId: number | null) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.activeBranchId = parseInt(stored);
      }
    }
  }

  /**
   * Get current active branch ID
   */
  getActiveBranchId(): number | null {
    return this.activeBranchId;
  }

  /**
   * Set active branch
   */
  setActiveBranch(branchId: number | null) {
    this.activeBranchId = branchId;

    if (typeof window !== 'undefined') {
      if (branchId) {
        localStorage.setItem(STORAGE_KEY, branchId.toString());
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    // Notify listeners
    this.listeners.forEach(listener => listener(branchId));
  }

  /**
   * Subscribe to branch changes
   */
  subscribe(listener: (branchId: number | null) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Clear active branch
   */
  clear() {
    this.setActiveBranch(null);
  }
}

export const branchStore = new BranchStore();
