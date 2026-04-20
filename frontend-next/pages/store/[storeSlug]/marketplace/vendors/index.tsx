/**
 * Marketplace Vendors Directory — /store/[storeSlug]/marketplace/vendors
 * Browse all marketplace vendors with search, ratings, product counts
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import StoreLayout from '../../../../../components/store/StoreLayout';
import { marketplaceStorefrontApi } from '../../../../../lib/marketplaceApi';
import {
  BuildingStorefrontIcon,
  StarIcon,
  MagnifyingGlassIcon,
  CheckBadgeIcon,
  MapPinIcon,
  ShoppingBagIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';

interface Vendor {
  id: number;
  vendor_name: string;
  vendor_name_ar: string;
  slug: string;
  logo_url?: string;
  banner_url?: string;
  description?: string;
  average_rating: number;
  total_reviews: number;
  total_listings: number;
  total_orders: number;
  city?: string;
  country?: string;
  is_verified?: boolean;
  is_featured?: boolean;
}

function VendorsDirectoryPage() {
  const router = useRouter();
  const { storeSlug } = router.query as { storeSlug: string };

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('rating');

  useEffect(() => {
    loadVendors();
  }, [page, sortBy]);

  const loadVendors = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(page),
        limit: '12',
        sort: sortBy,
      };
      if (searchTerm) params.search = searchTerm;

      const res = await marketplaceStorefrontApi.getVendors(params);
      setVendors(res.data || res.vendors || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (error) {
      console.error('Failed to load vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadVendors();
  };

  if (!storeSlug) return null;

  return (
    <>
      <Head>
        <title>All Vendors — Marketplace</title>
        <meta name="description" content="Browse all marketplace vendors. Find trusted sellers and great deals." />
      </Head>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BuildingStorefrontIcon className="h-7 w-7 text-emerald-600" />
            All Vendors
          </h1>
          <p className="text-sm text-gray-500 mt-1">{total} vendors on marketplace</p>
        </div>

        <Link
          href={`/store/${storeSlug}/marketplace`}
          className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
        >
          ← Back to Marketplace
        </Link>
      </div>

      {/* Search & Sort */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search vendors..."
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800"
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <MagnifyingGlassIcon className="h-5 w-5" />
          </button>
        </div>
        <select
          value={sortBy}
          onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
        >
          <option value="rating">Best Rated</option>
          <option value="newest">Newest</option>
          <option value="name">Name A-Z</option>
          <option value="revenue">Most Popular</option>
        </select>
      </div>

      {/* Vendors Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-pulse">
              <div className="h-32 bg-gray-200 dark:bg-gray-700" />
              <div className="p-4 space-y-3">
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : vendors.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {vendors.map(vendor => (
              <Link
                key={vendor.id}
                href={`/store/${storeSlug}/marketplace/vendors/${vendor.slug}`}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg hover:border-emerald-300 transition-all group"
              >
                {/* Banner */}
                <div className="h-32 bg-gradient-to-r from-emerald-400 to-teal-500 overflow-hidden">
                  {vendor.banner_url && (
                    <img src={vendor.banner_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  )}
                </div>

                {/* Profile */}
                <div className="px-4 pb-4 -mt-8 relative">
                  <div className="w-16 h-16 rounded-xl bg-white dark:bg-gray-700 border-4 border-white dark:border-gray-800 shadow overflow-hidden mb-3">
                    {vendor.logo_url ? (
                      <img src={vendor.logo_url} alt={vendor.vendor_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-emerald-100">
                        <BuildingStorefrontIcon className="h-7 w-7 text-emerald-600" />
                      </div>
                    )}
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-1">
                    {vendor.vendor_name}
                    {vendor.is_verified && <CheckBadgeIcon className="h-5 w-5 text-blue-500" />}
                    {vendor.is_featured && (
                      <span className="ml-1 px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded">Featured</span>
                    )}
                  </h3>

                  {vendor.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{vendor.description}</p>
                  )}

                  {/* Stats bar */}
                  <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <StarSolidIcon className="h-4 w-4 text-yellow-400" />
                      <span>{Number(vendor.average_rating || 0).toFixed(1)}</span>
                      <span className="text-xs">({vendor.total_reviews})</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ShoppingBagIcon className="h-4 w-4" />
                      <span>{vendor.total_listings} products</span>
                    </div>
                    {vendor.city && (
                      <div className="flex items-center gap-1">
                        <MapPinIcon className="h-4 w-4" />
                        <span>{vendor.city}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-8">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16">
          <BuildingStorefrontIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-lg text-gray-500">No vendors found</p>
        </div>
      )}
    </>
  );
}

export default function VendorsDirectoryWrapper() {
  const router = useRouter();
  const { storeSlug } = router.query as { storeSlug: string };
  if (!storeSlug) return null;

  return (
    <StoreLayout storeSlug={storeSlug}>
      <VendorsDirectoryPage />
    </StoreLayout>
  );
}
