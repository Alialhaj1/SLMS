/**
 * Marketplace Home — /store/[storeSlug]/marketplace
 * Browse products from multiple vendors, filter by vendor/category/price
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import StoreLayout from '../../../../components/store/StoreLayout';
import ProductCard, { ProductCardData } from '../../../../components/store/ProductCard';
import { marketplaceStorefrontApi } from '../../../../lib/marketplaceApi';
import { storeApi } from '../../../../lib/storeApi';
import {
  BuildingStorefrontIcon,
  FunnelIcon,
  XMarkIcon,
  ChevronDownIcon,
  StarIcon,
  MagnifyingGlassIcon,
  ArrowRightIcon,
  ShoppingCartIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';

interface Vendor {
  id: number;
  vendor_name: string;
  vendor_name_ar: string;
  slug: string;
  logo_url?: string;
  average_rating: number;
  total_reviews: number;
  total_listings: number;
  description?: string;
  description_ar?: string;
}

interface MarketplaceListing {
  id: number;
  title: string;
  title_ar?: string;
  slug: string;
  price: number;
  compare_at_price?: number;
  vendor_name: string;
  vendor_name_ar?: string;
  vendor_slug: string;
  vendor_id: number;
  category_name?: string;
  category_name_ar?: string;
  image_url?: string;
  average_rating?: number;
  review_count?: number;
  in_stock?: boolean;
  view_count?: number;
}

interface Category {
  id: number;
  name: string;
  name_ar?: string;
  listing_count: number;
  parent_id?: number;
}

function MarketplaceHomePage() {
  const router = useRouter();
  const { storeSlug, search, categoryId, vendorId, sortBy: qSort, minPrice, maxPrice } = router.query as Record<string, string>;

  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState(search || '');
  const [selectedCategory, setSelectedCategory] = useState(categoryId || '');
  const [selectedVendor, setSelectedVendor] = useState(vendorId || '');
  const [sortBy, setSortBy] = useState(qSort || 'newest');
  const [priceMin, setPriceMin] = useState(minPrice || '');
  const [priceMax, setPriceMax] = useState(maxPrice || '');

  // Load categories & featured vendors on mount
  useEffect(() => {
    marketplaceStorefrontApi.getCategories().then(r => setCategories(r.data || r.categories || [])).catch(() => {});
    marketplaceStorefrontApi.getVendors({ limit: '6', sort: 'rating' }).then(r => setVendors(r.data || r.vendors || [])).catch(() => {});
  }, []);

  // Load listings
  useEffect(() => {
    loadListings();
  }, [page, sortBy, selectedCategory, selectedVendor, priceMin, priceMax]);

  const loadListings = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(page),
        limit: '12',
        sort: sortBy,
      };
      if (searchTerm) params.search = searchTerm;
      if (selectedCategory) params.categoryId = selectedCategory;
      if (selectedVendor) params.vendorId = selectedVendor;
      if (priceMin) params.minPrice = priceMin;
      if (priceMax) params.maxPrice = priceMax;

      const res = await marketplaceStorefrontApi.getListings(params);
      setListings(res.data || res.listings || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (error) {
      console.error('Failed to load marketplace listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadListings();
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedVendor('');
    setPriceMin('');
    setPriceMax('');
    setSortBy('newest');
    setPage(1);
  };

  const handleAddToCart = async (listing: MarketplaceListing) => {
    try {
      const token = localStorage.getItem('store_access_token');
      const sessionId = localStorage.getItem('store_session_id') || '';
      await storeApi.addToCart(storeSlug, {
        itemId: listing.id,
        quantity: 1,
        listingId: listing.id,
        vendorId: listing.vendor_id,
      }, { token, sessionId });
    } catch (error: any) {
      alert(error.message || 'Failed to add to cart');
    }
  };

  // Convert listing to ProductCardData for ProductCard
  const toProductCard = (l: MarketplaceListing): ProductCardData => ({
    id: l.id,
    name: l.title,
    nameAr: l.title_ar,
    slug: l.slug,
    price: l.price,
    compareAtPrice: l.compare_at_price,
    imageUrl: l.image_url,
    averageRating: l.average_rating,
    reviewCount: l.review_count,
    inStock: l.in_stock !== false,
    categoryName: l.category_name,
    brandName: l.vendor_name,
  });

  const sortOptions = [
    { value: 'newest', label: 'Newest', labelAr: 'الأحدث' },
    { value: 'price_asc', label: 'Price: Low to High', labelAr: 'السعر: من الأقل' },
    { value: 'price_desc', label: 'Price: High to Low', labelAr: 'السعر: من الأعلى' },
    { value: 'rating', label: 'Best Rated', labelAr: 'الأعلى تقييماً' },
    { value: 'popular', label: 'Most Popular', labelAr: 'الأكثر شعبية' },
  ];

  if (!storeSlug) return null;

  return (
    <>
      <Head>
        <title>Marketplace — Browse Products from Multiple Vendors</title>
        <meta name="description" content="Browse products from multiple vendors. Compare prices and find the best deals." />
      </Head>

      {/* Hero */}
      <div className="relative bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl overflow-hidden mb-8">
        <div className="relative z-10 px-8 py-12 sm:py-16 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            🏪 Marketplace
          </h1>
          <p className="text-emerald-100 mb-6 max-w-2xl mx-auto">
            Shop from multiple trusted vendors — compare prices, read reviews, and find the best deals
          </p>
          <div className="max-w-xl mx-auto flex gap-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search marketplace products..."
              className="flex-1 px-4 py-3 rounded-lg border-0 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-emerald-300"
            />
            <button
              onClick={handleSearch}
              className="px-6 py-3 bg-white text-emerald-700 font-semibold rounded-lg hover:bg-emerald-50 transition-colors"
            >
              <MagnifyingGlassIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Featured Vendors Row */}
      {vendors.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <BuildingStorefrontIcon className="h-6 w-6 text-emerald-600" />
              Featured Vendors
            </h2>
            <Link
              href={`/store/${storeSlug}/marketplace/vendors`}
              className="text-sm text-emerald-600 hover:text-emerald-500 font-medium flex items-center gap-1"
            >
              View All <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {vendors.slice(0, 6).map((vendor) => (
              <Link
                key={vendor.id}
                href={`/store/${storeSlug}/marketplace/vendors/${vendor.slug}`}
                className="flex flex-col items-center p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-emerald-300 transition-all"
              >
                <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-2 overflow-hidden">
                  {vendor.logo_url ? (
                    <img src={vendor.logo_url} alt={vendor.vendor_name} className="w-full h-full object-cover" />
                  ) : (
                    <BuildingStorefrontIcon className="h-7 w-7 text-emerald-600" />
                  )}
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center line-clamp-1">
                  {vendor.vendor_name}
                </span>
                <div className="flex items-center gap-1 mt-1">
                  <StarSolidIcon className="h-3 w-3 text-yellow-400" />
                  <span className="text-xs text-gray-500">{Number(vendor.average_rating || 0).toFixed(1)}</span>
                </div>
                <span className="text-xs text-gray-400">{vendor.total_listings} products</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <FunnelIcon className="h-4 w-4" />
          Filters
        </button>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
        >
          {sortOptions.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Result count */}
        <span className="text-sm text-gray-500 ml-auto">{total} products found</span>
      </div>

      {/* Expandable Filters */}
      {filtersOpen && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Category Filter */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700"
            >
              <option value="">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={String(c.id)}>{c.name} ({c.listing_count})</option>
              ))}
            </select>
          </div>

          {/* Vendor Filter */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Vendor</label>
            <select
              value={selectedVendor}
              onChange={(e) => { setSelectedVendor(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700"
            >
              <option value="">All Vendors</option>
              {vendors.map(v => (
                <option key={v.id} value={String(v.id)}>{v.vendor_name}</option>
              ))}
            </select>
          </div>

          {/* Price Range */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Price Range</label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                onBlur={() => setPage(1)}
                className="w-1/2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700"
              />
              <input
                type="number"
                placeholder="Max"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                onBlur={() => setPage(1)}
                className="w-1/2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700"
              />
            </div>
          </div>

          {/* Clear Filters */}
          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <XMarkIcon className="h-4 w-4" />
              Clear All
            </button>
          </div>
        </div>
      )}

      {/* Product Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-pulse">
              <div className="aspect-square bg-gray-200 dark:bg-gray-700" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : listings.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {listings.map((listing) => (
              <div key={listing.id} className="relative group">
                {/* Vendor badge on top of product card */}
                <Link
                  href={`/store/${storeSlug}/marketplace/vendors/${listing.vendor_slug}`}
                  className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-1 bg-white/90 dark:bg-gray-800/90 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-emerald-600 transition-colors shadow-sm"
                >
                  <BuildingStorefrontIcon className="h-3 w-3" />
                  {listing.vendor_name}
                </Link>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-all">
                  {/* Image */}
                  <Link href={`/store/${storeSlug}/marketplace/products/${listing.slug}`}>
                    <div className="aspect-square bg-gray-100 dark:bg-gray-700 overflow-hidden">
                      {listing.image_url ? (
                        <img src={listing.image_url} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingCartIcon className="h-16 w-16 text-gray-300" />
                        </div>
                      )}
                    </div>
                  </Link>

                  {/* Info */}
                  <div className="p-4">
                    {listing.category_name && (
                      <p className="text-xs text-gray-500 mb-1">{listing.category_name}</p>
                    )}
                    <Link href={`/store/${storeSlug}/marketplace/products/${listing.slug}`}>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 hover:text-emerald-600 transition-colors">
                        {listing.title}
                      </h3>
                    </Link>

                    {/* Rating */}
                    {listing.average_rating && listing.average_rating > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        {[1,2,3,4,5].map(s => (
                          s <= Math.round(listing.average_rating!) ? (
                            <StarSolidIcon key={s} className="h-3.5 w-3.5 text-yellow-400" />
                          ) : (
                            <StarIcon key={s} className="h-3.5 w-3.5 text-gray-300" />
                          )
                        ))}
                        <span className="text-xs text-gray-500 ml-1">({listing.review_count || 0})</span>
                      </div>
                    )}

                    {/* Price */}
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-lg font-bold text-gray-900 dark:text-white">
                        {Number(listing.price).toLocaleString()} SAR
                      </span>
                      {listing.compare_at_price && listing.compare_at_price > listing.price && (
                        <span className="text-sm text-gray-400 line-through">
                          {Number(listing.compare_at_price).toLocaleString()}
                        </span>
                      )}
                    </div>

                    {/* Add to Cart */}
                    {listing.in_stock !== false && (
                      <button
                        onClick={() => handleAddToCart(listing)}
                        className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        <ShoppingCartIcon className="h-4 w-4" />
                        Add to Cart
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-8">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16">
          <BuildingStorefrontIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-lg text-gray-500 mb-2">No products found</p>
          <p className="text-sm text-gray-400 mb-4">Try adjusting your filters or search terms</p>
          <button
            onClick={clearFilters}
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      )}
    </>
  );
}

export default function MarketplaceHomeWrapper() {
  const router = useRouter();
  const { storeSlug } = router.query as { storeSlug: string };
  if (!storeSlug) return null;

  return (
    <StoreLayout storeSlug={storeSlug}>
      <MarketplaceHomePage />
    </StoreLayout>
  );
}
