/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  MARKETPLACE API HELPERS                                                 ║
 * ║  Client-side helpers for marketplace storefront + vendor API calls       ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import apiClient from './apiClient';

const API_BASE = '/api/marketplace';

interface MarketplaceApiOptions {
  token?: string | null;
  sessionId?: string;
}

async function marketplaceFetch<T = any>(
  endpoint: string,
  options: RequestInit & MarketplaceApiOptions = {}
): Promise<T> {
  const { token, sessionId, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (sessionId) {
    headers['X-Session-Id'] = sessionId;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(errorData.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// ═══════════════════════════════════════════════════════════════════════════
// Storefront API (public + customer auth)
// ═══════════════════════════════════════════════════════════════════════════

export const marketplaceStorefrontApi = {
  // ─── Browsing (public) ───
  getListings(params?: Record<string, string>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return marketplaceFetch(`/storefront/listings${qs}`);
  },

  getListing(slug: string) {
    return marketplaceFetch(`/storefront/listings/${slug}`);
  },

  getVendors(params?: Record<string, string>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return marketplaceFetch(`/storefront/vendors${qs}`);
  },

  getVendor(slug: string) {
    return marketplaceFetch(`/storefront/vendors/${slug}`);
  },

  getVendorListings(vendorSlug: string, params?: Record<string, string>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return marketplaceFetch(`/storefront/vendors/${vendorSlug}/listings${qs}`);
  },

  getCategories() {
    return marketplaceFetch('/storefront/categories');
  },

  // ─── Checkout (customer auth) ───
  checkout(body: { shippingAddressId: number; billingAddressId?: number; paymentMethod: string; notes?: string }, opts: MarketplaceApiOptions) {
    return marketplaceFetch('/storefront/checkout', { method: 'POST', body: JSON.stringify(body), ...opts });
  },

  // ─── Orders (customer auth) ───
  getMyOrders(page?: number, opts?: MarketplaceApiOptions) {
    const qs = page ? `?page=${page}` : '';
    return marketplaceFetch(`/storefront/my/orders${qs}`, opts);
  },

  getMyOrder(id: number, opts: MarketplaceApiOptions) {
    return marketplaceFetch(`/storefront/my/orders/${id}`, opts);
  },

  // ─── Disputes (customer auth) ───
  createDispute(body: { marketplaceOrderId: number; orderVendorId?: number; reason: string; description: string }, opts: MarketplaceApiOptions) {
    return marketplaceFetch('/storefront/my/disputes', { method: 'POST', body: JSON.stringify(body), ...opts });
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// Vendor Dashboard API (ERP auth + vendor context)
// Uses apiClient (handles auth, base URL, company headers automatically)
// ═══════════════════════════════════════════════════════════════════════════

async function vendorFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  return apiClient.request<T>(`/api/marketplace/vendor${endpoint}`, options);
}

export const vendorApi = {
  // ─── Profile ───
  getProfile() {
    return vendorFetch('/profile');
  },

  updateProfile(body: any) {
    return vendorFetch('/profile', { method: 'PUT', body: JSON.stringify(body) });
  },

  getStats() {
    return vendorFetch('/stats');
  },

  // ─── Listings ───
  getListings(params?: Record<string, string>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return vendorFetch(`/listings${qs}`);
  },

  createListing(body: any) {
    return vendorFetch('/listings', { method: 'POST', body: JSON.stringify(body) });
  },

  getListing(id: number) {
    return vendorFetch(`/listings/${id}`);
  },

  updateListing(id: number, body: any) {
    return vendorFetch(`/listings/${id}`, { method: 'PUT', body: JSON.stringify(body) });
  },

  togglePublish(id: number, published: boolean) {
    return vendorFetch(`/listings/${id}/publish`, { method: 'PUT', body: JSON.stringify({ published }) });
  },

  deleteListing(id: number) {
    return vendorFetch(`/listings/${id}`, { method: 'DELETE' });
  },

  // ─── Orders ───
  getOrders(params?: Record<string, string>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return vendorFetch(`/orders${qs}`);
  },

  getOrder(id: number) {
    return vendorFetch(`/orders/${id}`);
  },

  updateOrderStatus(id: number, body: { status: string; trackingNumber?: string; shippingProvider?: string }) {
    return vendorFetch(`/orders/${id}/status`, { method: 'PUT', body: JSON.stringify(body) });
  },

  // ─── Wallet & Payouts ───
  getWallet() {
    return vendorFetch('/wallet');
  },

  getTransactions(params?: Record<string, string>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return vendorFetch(`/transactions${qs}`);
  },

  getPayouts(params?: Record<string, string>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return vendorFetch(`/payouts${qs}`);
  },

  requestPayout(body: { amount: number; notes?: string }) {
    return vendorFetch('/payouts', { method: 'POST', body: JSON.stringify(body) });
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// Vendor Access Error Helpers
// ═══════════════════════════════════════════════════════════════════════════

export function isVendorAccessError(err: any): boolean {
  const msg = err?.message || err?.data?.error || '';
  return err?.status === 403 || msg.includes('Not a marketplace vendor') || msg.includes('No company context');
}

export function getVendorErrorMessage(err: any, isAr: boolean): string {
  const msg = err?.message || err?.data?.error || '';
  if (msg.includes('suspended') || msg.includes('banned')) {
    return isAr ? 'حساب البائع الخاص بك معلق أو محظور' : 'Your vendor account is suspended or banned';
  }
  return isAr ? 'حسابك غير مسجل كبائع في السوق' : 'Your account is not registered as a marketplace vendor';
}
