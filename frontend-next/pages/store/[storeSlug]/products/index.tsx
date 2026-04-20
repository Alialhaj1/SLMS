/**
 * Store Products Page — /store/[storeSlug]/products
 * Full product listing with filters and search
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import StoreLayout from '../../../../components/store/StoreLayout';
import ProductCard, { ProductCardData } from '../../../../components/store/ProductCard';
import { storeApi } from '../../../../lib/storeApi';
import {
  FunnelIcon,
  XMarkIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';

function StoreProductsPage() {
  const router = useRouter();
  const { storeSlug, search, categoryId, brandId, sortBy: qSort } = router.query as Record<string, string>;

  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Filter state
  const [searchTerm, setSearchTerm] = useState(search || '');
  const [selectedCategory, setSelectedCategory] = useState(categoryId || '');
  const [sortBy, setSortBy] = useState(qSort || 'newest');
  const [inStock, setInStock] = useState(false);
  const [wishlistedIds, setWishlistedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!storeSlug) return;
    storeApi.getCategories(storeSlug).then(r => setCategories(r.data || [])).catch(() => {});
    // Load wishlist if logged in
    const token = localStorage.getItem('store_access_token');
    if (token) {
      storeApi.getWishlist(storeSlug, { token }).then((res: any) => {
        const ids = new Set<number>((res.items || []).map((i: any) => i.productId || i.itemId || i.id));
        setWishlistedIds(ids);
      }).catch(() => {});
    }
  }, [storeSlug]);

  useEffect(() => {
    if (!storeSlug) return;
    loadProducts();
  }, [storeSlug, page, sortBy, selectedCategory, inStock]);

  // Sync URL params on mount
  useEffect(() => {
    if (search) setSearchTerm(search);
    if (categoryId) setSelectedCategory(categoryId);
    if (qSort) setSortBy(qSort);
  }, [search, categoryId, qSort]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(page),
        limit: '12',
        sortBy,
      };
      if (searchTerm) params.search = searchTerm;
      if (selectedCategory) params.categoryId = selectedCategory;
      if (inStock) params.inStock = 'true';

      const result = await storeApi.getProducts(storeSlug, params);
      setProducts(result.data || []);
      setTotalPages(result.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadProducts();
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSortBy('newest');
    setInStock(false);
    setPage(1);
  };

  const handleAddToCart = async (product: ProductCardData) => {
    try {
      const token = localStorage.getItem('store_access_token');
      const sessionId = localStorage.getItem('store_session_id') || '';
      await storeApi.addToCart(storeSlug, { itemId: product.id, quantity: 1 }, { token, sessionId });
    } catch (error: any) {
      alert(error.message || 'Failed to add to cart');
    }
  };

  const handleToggleWishlist = async (product: ProductCardData) => {
    try {
      const token = localStorage.getItem('store_access_token');
      if (!token) { alert('Please log in to use wishlist'); return; }
      const opts = { token };
      if (wishlistedIds.has(product.id)) {
        await storeApi.removeFromWishlist(storeSlug, product.id, opts);
        setWishlistedIds(prev => { const next = new Set(prev); next.delete(product.id); return next; });
      } else {
        await storeApi.addToWishlist(storeSlug, product.id, opts);
        setWishlistedIds(prev => new Set(prev).add(product.id));
      }
    } catch (error: any) {
      alert(error.message || 'Wishlist update failed');
    }
  };

  if (!storeSlug) return null;

  return (
    <>
      <Head>
        <title>Products — {storeSlug} Store</title>
        <meta name="description" content={`Browse all products at ${storeSlug}. Filter by category, price, and more.`} />
        <meta name="robots" content="index, follow" />
      </Head>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Filters Sidebar */}
        <aside className={`
          lg:w-64 lg:flex-shrink-0
          ${filtersOpen ? 'block' : 'hidden lg:block'}
          fixed lg:static inset-0 z-40 lg:z-auto bg-white dark:bg-gray-800 lg:bg-transparent p-6 lg:p-0
        `}>
          <div className="flex items-center justify-between lg:hidden mb-4">
            <h3 className="text-lg font-semibold">Filters</h3>
            <button onClick={() => setFiltersOpen(false)}>
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Search</label>
              <form onSubmit={handleSearch}>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search products..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </form>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="">All Categories</option>
                {categories.map((cat: any) => (
                  <option key={cat.id} value={cat.id}>{cat.name} ({cat.productCount})</option>
                ))}
              </select>
            </div>

            {/* In Stock */}
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={inStock}
                  onChange={(e) => { setInStock(e.target.checked); setPage(1); }}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">In Stock Only</span>
              </label>
            </div>

            {/* Clear Filters */}
            <button
              onClick={clearFilters}
              className="w-full px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        </aside>

        {/* Products Grid */}
        <div className="flex-1">
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setFiltersOpen(true)}
                className="lg:hidden flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg"
              >
                <FunnelIcon className="h-4 w-4" />
                Filters
              </button>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {products.length} products
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500 dark:text-gray-400">Sort:</label>
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="newest">Newest</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
                <option value="name_asc">Name: A to Z</option>
                <option value="popular">Most Popular</option>
              </select>
            </div>
          </div>

          {/* Product Grid */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border overflow-hidden animate-pulse">
                  <div className="aspect-square bg-gray-200 dark:bg-gray-700" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    storeSlug={storeSlug}
                    onAddToCart={handleAddToCart}
                    isWishlisted={wishlistedIds.has(product.id)}
                    onToggleWishlist={handleToggleWishlist}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                    className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Previous
                  </button>
                  <span className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => p + 1)}
                    className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16">
              <p className="text-gray-500 dark:text-gray-400 text-lg">No products found</p>
              <button
                onClick={clearFilters}
                className="mt-4 text-indigo-600 hover:text-indigo-500 font-medium"
              >
                Clear filters and try again
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function StoreProductsWrapper() {
  const router = useRouter();
  const { storeSlug } = router.query as { storeSlug: string };
  if (!storeSlug) return null;

  return (
    <StoreLayout storeSlug={storeSlug}>
      <StoreProductsPage />
    </StoreLayout>
  );
}
