/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  STORE LAYOUT — Public storefront wrapper                               ║
 * ║  Light, clean layout for e-commerce pages (no ERP sidebar)              ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  ShoppingBagIcon,
  HeartIcon,
  UserIcon,
  MagnifyingGlassIcon,
  ShoppingCartIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

// ════════════════════════════════════════════════════════════════════════════
// Store Context — global store state for storefront pages
// ════════════════════════════════════════════════════════════════════════════

interface StoreCustomer {
  id: number;
  email: string;
  firstName: string;
  lastName?: string;
}

interface StoreState {
  storeSlug: string;
  storeName: string;
  customer: StoreCustomer | null;
  cartCount: number;
  sessionId: string;
  accessToken: string | null;
  login: (token: string, refreshToken: string, customer: StoreCustomer) => void;
  logout: () => void;
  setCartCount: (count: number) => void;
}

const StoreContext = createContext<StoreState | null>(null);

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreLayout');
  return ctx;
}

// Generate or retrieve a session ID for guest carts
function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let sid = localStorage.getItem('store_session_id');
  if (!sid) {
    sid = 'sess_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem('store_session_id', sid);
  }
  return sid;
}

// ════════════════════════════════════════════════════════════════════════════
// Store Layout Component
// ════════════════════════════════════════════════════════════════════════════

interface StoreLayoutProps {
  children: ReactNode;
  storeSlug: string;
  storeName?: string;
}

export default function StoreLayout({ children, storeSlug, storeName = 'Store' }: StoreLayoutProps) {
  const router = useRouter();
  const [customer, setCustomer] = useState<StoreCustomer | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const sessionId = getSessionId();

  // Restore auth on mount
  useEffect(() => {
    const token = localStorage.getItem('store_access_token');
    const customerStr = localStorage.getItem('store_customer');
    if (token && customerStr) {
      try {
        setAccessToken(token);
        setCustomer(JSON.parse(customerStr));
      } catch {
        localStorage.removeItem('store_access_token');
        localStorage.removeItem('store_customer');
      }
    }
  }, []);

  const login = (token: string, refreshToken: string, cust: StoreCustomer) => {
    localStorage.setItem('store_access_token', token);
    localStorage.setItem('store_refresh_token', refreshToken);
    localStorage.setItem('store_customer', JSON.stringify(cust));
    setAccessToken(token);
    setCustomer(cust);
  };

  const logout = () => {
    localStorage.removeItem('store_access_token');
    localStorage.removeItem('store_refresh_token');
    localStorage.removeItem('store_customer');
    setAccessToken(null);
    setCustomer(null);
    router.push(`/store/${storeSlug}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/store/${storeSlug}/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
    }
  };

  const storeState: StoreState = {
    storeSlug,
    storeName,
    customer,
    cartCount,
    sessionId,
    accessToken,
    login,
    logout,
    setCartCount,
  };

  return (
    <StoreContext.Provider value={storeState}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900" dir={router.locale === 'ar' ? 'rtl' : 'ltr'}>
        {/* ═══════════ HEADER ═══════════ */}
        <header className="sticky top-0 z-50 bg-white dark:bg-gray-800 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo / Store Name */}
              <div className="flex items-center gap-4">
                <button
                  className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                  {mobileMenuOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
                </button>
                <Link href={`/store/${storeSlug}`} className="flex items-center gap-2">
                  <ShoppingBagIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xl font-bold text-gray-900 dark:text-white">{storeName}</span>
                </Link>
              </div>

              {/* Navigation - Desktop */}
              <nav className="hidden lg:flex items-center gap-6">
                <Link href={`/store/${storeSlug}/products`} className="text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors">
                  Products
                </Link>
                <Link href={`/store/${storeSlug}/marketplace`} className="text-gray-700 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium transition-colors">
                  🏪 Marketplace
                </Link>
                <Link href={`/store/${storeSlug}/categories`} className="text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors">
                  Categories
                </Link>
              </nav>

              {/* Actions */}
              <div className="flex items-center gap-3">
                {/* Search */}
                <button
                  onClick={() => setSearchOpen(!searchOpen)}
                  className="p-2 rounded-full text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <MagnifyingGlassIcon className="h-5 w-5" />
                </button>

                {/* Wishlist */}
                {customer && (
                  <Link href={`/store/${storeSlug}/wishlist`} className="p-2 rounded-full text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <HeartIcon className="h-5 w-5" />
                  </Link>
                )}

                {/* Cart */}
                <Link href={`/store/${storeSlug}/cart`} className="relative p-2 rounded-full text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <ShoppingCartIcon className="h-5 w-5" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                      {cartCount > 9 ? '9+' : cartCount}
                    </span>
                  )}
                </Link>

                {/* Account */}
                {customer ? (
                  <div className="relative group">
                    <button className="flex items-center gap-2 p-2 rounded-full text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      <UserIcon className="h-5 w-5" />
                      <span className="hidden sm:block text-sm text-gray-700 dark:text-gray-300">{customer.firstName}</span>
                    </button>
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                      <Link href={`/store/${storeSlug}/account`} className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                        My Account
                      </Link>
                      <Link href={`/store/${storeSlug}/orders`} className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                        My Orders
                      </Link>
                      <button onClick={logout} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700">
                        Logout
                      </button>
                    </div>
                  </div>
                ) : (
                  <Link href={`/store/${storeSlug}/login`} className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500">
                    Sign In
                  </Link>
                )}
              </div>
            </div>

            {/* Search Bar - Expandable */}
            {searchOpen && (
              <div className="pb-4">
                <form onSubmit={handleSearch} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search products..."
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    autoFocus
                  />
                  <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                    Search
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="lg:hidden border-t border-gray-200 dark:border-gray-700">
              <div className="px-4 py-3 space-y-2">
                <Link href={`/store/${storeSlug}/products`} className="block px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                  Products
                </Link>
                <Link href={`/store/${storeSlug}/marketplace`} className="block px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                  🏪 Marketplace
                </Link>
                <Link href={`/store/${storeSlug}/categories`} className="block px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                  Categories
                </Link>
              </div>
            </div>
          )}
        </header>

        {/* ═══════════ MAIN CONTENT ═══════════ */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        {/* ═══════════ FOOTER ═══════════ */}
        <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Shop</h3>
                <ul className="mt-4 space-y-2">
                  <li><Link href={`/store/${storeSlug}/products`} className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">All Products</Link></li>
                  <li><Link href={`/store/${storeSlug}/marketplace`} className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">Marketplace</Link></li>
                  <li><Link href={`/store/${storeSlug}/categories`} className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">Categories</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Account</h3>
                <ul className="mt-4 space-y-2">
                  <li><Link href={`/store/${storeSlug}/account`} className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">My Account</Link></li>
                  <li><Link href={`/store/${storeSlug}/orders`} className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">Order History</Link></li>
                  <li><Link href={`/store/${storeSlug}/wishlist`} className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">Wishlist</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Support</h3>
                <ul className="mt-4 space-y-2">
                  <li><span className="text-sm text-gray-600 dark:text-gray-400">Contact Us</span></li>
                  <li><span className="text-sm text-gray-600 dark:text-gray-400">Shipping Info</span></li>
                  <li><span className="text-sm text-gray-600 dark:text-gray-400">Returns Policy</span></li>
                </ul>
              </div>
            </div>
            <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-400 text-center">
                &copy; {new Date().getFullYear()} {storeName}. Powered by SLMS
              </p>
            </div>
          </div>
        </footer>
      </div>
    </StoreContext.Provider>
  );
}
