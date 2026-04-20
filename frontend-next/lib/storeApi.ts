/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  STORE API HELPERS — Client-side helpers for store API calls             ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

const API_BASE = '/api/store';

interface StoreApiOptions {
  token?: string | null;
  sessionId?: string;
}

async function storeApiFetch<T = any>(
  storeSlug: string,
  endpoint: string,
  options: RequestInit & StoreApiOptions = {}
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

  const res = await fetch(`${API_BASE}/${storeSlug}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(errorData.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export const storeApi = {
  // ═══════════════════ Products ═══════════════════
  getProducts(slug: string, params?: Record<string, string>, opts?: StoreApiOptions) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return storeApiFetch(slug, `/products${qs}`, opts);
  },

  getProduct(slug: string, productSlug: string, opts?: StoreApiOptions) {
    return storeApiFetch(slug, `/products/${productSlug}`, opts);
  },

  getCategories(slug: string, opts?: StoreApiOptions) {
    return storeApiFetch(slug, '/products/categories', opts);
  },

  // ═══════════════════ Auth ═══════════════════
  register(slug: string, body: { email: string; password: string; firstName: string; lastName?: string; phone?: string }) {
    return storeApiFetch(slug, '/auth/register', { method: 'POST', body: JSON.stringify(body) });
  },

  login(slug: string, body: { email: string; password: string }) {
    return storeApiFetch(slug, '/auth/login', { method: 'POST', body: JSON.stringify(body) });
  },

  refreshToken(slug: string, refreshToken: string) {
    return storeApiFetch(slug, '/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) });
  },

  getProfile(slug: string, opts: StoreApiOptions) {
    return storeApiFetch(slug, '/auth/profile', opts);
  },

  updateProfile(slug: string, body: any, opts: StoreApiOptions) {
    return storeApiFetch(slug, '/auth/profile', { method: 'PUT', body: JSON.stringify(body), ...opts });
  },

  getAddresses(slug: string, opts: StoreApiOptions) {
    return storeApiFetch(slug, '/auth/addresses', opts);
  },

  addAddress(slug: string, body: any, opts: StoreApiOptions) {
    return storeApiFetch(slug, '/auth/addresses', { method: 'POST', body: JSON.stringify(body), ...opts });
  },

  deleteAddress(slug: string, id: number, opts: StoreApiOptions) {
    return storeApiFetch(slug, `/auth/addresses/${id}`, { method: 'DELETE', ...opts });
  },

  // ═══════════════════ Cart ═══════════════════
  getCart(slug: string, opts: StoreApiOptions) {
    return storeApiFetch(slug, '/cart', opts);
  },

  addToCart(slug: string, body: { itemId: number; variantId?: number; quantity: number; listingId?: number; vendorId?: number }, opts: StoreApiOptions) {
    return storeApiFetch(slug, '/cart/items', { method: 'POST', body: JSON.stringify(body), ...opts });
  },

  updateCartItem(slug: string, cartItemId: number, quantity: number, opts: StoreApiOptions) {
    return storeApiFetch(slug, `/cart/items/${cartItemId}`, { method: 'PUT', body: JSON.stringify({ quantity }), ...opts });
  },

  removeCartItem(slug: string, cartItemId: number, opts: StoreApiOptions) {
    return storeApiFetch(slug, `/cart/items/${cartItemId}`, { method: 'DELETE', ...opts });
  },

  applyCoupon(slug: string, code: string, opts: StoreApiOptions) {
    return storeApiFetch(slug, '/cart/coupon', { method: 'POST', body: JSON.stringify({ code }), ...opts });
  },

  removeCoupon(slug: string, opts: StoreApiOptions) {
    return storeApiFetch(slug, '/cart/coupon', { method: 'DELETE', ...opts });
  },

  mergeCarts(slug: string, sessionId: string, opts: StoreApiOptions) {
    return storeApiFetch(slug, '/cart/merge', { method: 'POST', body: JSON.stringify({ sessionId }), ...opts });
  },

  // ═══════════════════ Checkout ═══════════════════
  checkout(slug: string, body: any, opts: StoreApiOptions) {
    return storeApiFetch(slug, '/checkout', { method: 'POST', body: JSON.stringify(body), ...opts });
  },

  confirmOrder(slug: string, orderId: number, opts: StoreApiOptions) {
    return storeApiFetch(slug, `/checkout/confirm/${orderId}`, { method: 'POST', ...opts });
  },

  // ═══════════════════ Orders ═══════════════════
  getOrders(slug: string, page?: number, opts?: StoreApiOptions) {
    const qs = page ? `?page=${page}` : '';
    return storeApiFetch(slug, `/orders${qs}`, opts);
  },

  getOrder(slug: string, id: number, opts: StoreApiOptions) {
    return storeApiFetch(slug, `/orders/${id}`, opts);
  },

  cancelOrder(slug: string, id: number, opts: StoreApiOptions) {
    return storeApiFetch(slug, `/orders/${id}/cancel`, { method: 'POST', ...opts });
  },

  // ═══════════════════ Wishlist ═══════════════════
  getWishlist(slug: string, opts: StoreApiOptions) {
    return storeApiFetch(slug, '/wishlist', opts);
  },

  addToWishlist(slug: string, itemId: number, opts: StoreApiOptions) {
    return storeApiFetch(slug, '/wishlist', { method: 'POST', body: JSON.stringify({ itemId }), ...opts });
  },

  removeFromWishlist(slug: string, itemId: number, opts: StoreApiOptions) {
    return storeApiFetch(slug, `/wishlist/${itemId}`, { method: 'DELETE', ...opts });
  },

  // ═══════════════════ Reviews ═══════════════════
  getReviews(slug: string, itemId: number, page?: number) {
    const qs = page ? `?page=${page}` : '';
    return storeApiFetch(slug, `/reviews/${itemId}${qs}`);
  },

  submitReview(slug: string, itemId: number, body: { rating: number; title?: string; comment?: string }, opts: StoreApiOptions) {
    return storeApiFetch(slug, `/reviews/${itemId}`, { method: 'POST', body: JSON.stringify(body), ...opts });
  },

  // ═══════════════════ Shipping ═══════════════════
  getShippingZones(slug: string, opts?: StoreApiOptions) {
    return storeApiFetch(slug, '/shipping/zones', opts);
  },

  estimateShipping(slug: string, body: { countryCode: string; region?: string; orderAmount?: number; totalWeight?: number }, opts?: StoreApiOptions) {
    return storeApiFetch(slug, '/shipping/estimate', { method: 'POST', body: JSON.stringify(body), ...opts });
  },
};
