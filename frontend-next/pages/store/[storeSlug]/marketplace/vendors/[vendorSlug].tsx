/**
 * Vendor Store Page — /store/[storeSlug]/marketplace/vendors/[vendorSlug]
 * Public vendor storefront: profile, products, reviews
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import StoreLayout from '../../../../../components/store/StoreLayout';
import { marketplaceStorefrontApi } from '../../../../../lib/marketplaceApi';
import { storeApi } from '../../../../../lib/storeApi';
import {
  BuildingStorefrontIcon,
  StarIcon,
  ShoppingCartIcon,
  MapPinIcon,
  PhoneIcon,
  GlobeAltIcon,
  ChevronLeftIcon,
  CheckBadgeIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';

interface VendorDetail {
  id: number;
  vendor_name: string;
  vendor_name_ar: string;
  slug: string;
  logo_url?: string;
  banner_url?: string;
  description?: string;
  description_ar?: string;
  average_rating: number;
  total_reviews: number;
  total_listings: number;
  total_orders: number;
  contact_email?: string;
  contact_phone?: string;
  city?: string;
  country?: string;
  return_policy?: string;
  is_verified?: boolean;
  created_at: string;
}

interface VendorListing {
  id: number;
  title: string;
  title_ar?: string;
  slug: string;
  price: number;
  compare_at_price?: number;
  image_url?: string;
  average_rating?: number;
  review_count?: number;
  in_stock?: boolean;
  category_name?: string;
  vendor_id: number;
  vendor_name: string;
  vendor_slug: string;
}

function VendorStorePage() {
  const router = useRouter();
  const { storeSlug, vendorSlug } = router.query as { storeSlug: string; vendorSlug: string };

  const [vendor, setVendor] = useState<VendorDetail | null>(null);
  const [listings, setListings] = useState<VendorListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState('newest');
  const [activeTab, setActiveTab] = useState<'products' | 'about'>('products');

  useEffect(() => {
    if (!vendorSlug) return;
    loadVendor();
  }, [vendorSlug]);

  useEffect(() => {
    if (!vendorSlug) return;
    loadListings();
  }, [vendorSlug, page, sortBy]);

  const loadVendor = async () => {
    setLoading(true);
    try {
      const res = await marketplaceStorefrontApi.getVendor(vendorSlug);
      setVendor(res.data || res.vendor || res);
    } catch (error) {
      console.error('Failed to load vendor:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadListings = async () => {
    setListingsLoading(true);
    try {
      const res = await marketplaceStorefrontApi.getVendorListings(vendorSlug, {
        page: String(page),
        limit: '12',
        sort: sortBy,
      });
      setListings(res.data || res.listings || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (error) {
      console.error('Failed to load vendor listings:', error);
    } finally {
      setListingsLoading(false);
    }
  };

  const handleAddToCart = async (listing: VendorListing) => {
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

  if (!storeSlug || !vendorSlug) return null;

  if (loading) {
    return (
      <>
        <div className="animate-pulse">
          <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-2xl mb-6" />
          <div className="flex gap-4 mb-8">
            <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-full" />
            <div className="flex-1 space-y-3">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32" />
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!vendor) {
    return (
      <div className="text-center py-16">
        <BuildingStorefrontIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <p className="text-lg text-gray-500">Vendor not found</p>
        <Link
          href={`/store/${storeSlug}/marketplace`}
          className="inline-flex items-center gap-2 mt-4 text-emerald-600 hover:text-emerald-700"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          Back to Marketplace
        </Link>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{vendor.vendor_name} — Marketplace Vendor</title>
        <meta name="description" content={vendor.description || `Shop products from ${vendor.vendor_name}`} />
      </Head>

      {/* Back Link */}
      <Link
        href={`/store/${storeSlug}/marketplace`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-emerald-600 mb-4 transition-colors"
      >
        <ChevronLeftIcon className="h-4 w-4" />
        Back to Marketplace
      </Link>

      {/* Vendor Banner */}
      <div className="relative rounded-2xl overflow-hidden mb-6">
        {vendor.banner_url ? (
          <img src={vendor.banner_url} alt="" className="w-full h-48 sm:h-56 object-cover" />
        ) : (
          <div className="w-full h-48 sm:h-56 bg-gradient-to-r from-emerald-500 to-teal-600" />
        )}
      </div>

      {/* Vendor Profile */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8 -mt-16 relative z-10 px-4">
        <div className="w-24 h-24 rounded-2xl bg-white dark:bg-gray-800 border-4 border-white dark:border-gray-900 shadow-lg overflow-hidden flex-shrink-0">
          {vendor.logo_url ? (
            <img src={vendor.logo_url} alt={vendor.vendor_name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-emerald-100 dark:bg-emerald-900/30">
              <BuildingStorefrontIcon className="h-10 w-10 text-emerald-600" />
            </div>
          )}
        </div>

        <div className="flex-1 mt-8 sm:mt-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{vendor.vendor_name}</h1>
            {vendor.is_verified && (
              <CheckBadgeIcon className="h-6 w-6 text-blue-500" title="Verified Vendor" />
            )}
          </div>

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-4 mt-2">
            <div className="flex items-center gap-1">
              {[1,2,3,4,5].map(s => (
                s <= Math.round(vendor.average_rating || 0) ? (
                  <StarSolidIcon key={s} className="h-4 w-4 text-yellow-400" />
                ) : (
                  <StarIcon key={s} className="h-4 w-4 text-gray-300" />
                )
              ))}
              <span className="text-sm text-gray-600 ml-1">
                {Number(vendor.average_rating || 0).toFixed(1)} ({vendor.total_reviews} reviews)
              </span>
            </div>
            <span className="text-sm text-gray-400">|</span>
            <span className="text-sm text-gray-600">{vendor.total_listings} products</span>
            <span className="text-sm text-gray-400">|</span>
            <span className="text-sm text-gray-600">{vendor.total_orders} orders</span>
            {vendor.city && (
              <>
                <span className="text-sm text-gray-400">|</span>
                <span className="text-sm text-gray-600 flex items-center gap-1">
                  <MapPinIcon className="h-4 w-4" />
                  {vendor.city}{vendor.country ? `, ${vendor.country}` : ''}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <div className="flex gap-8">
          {(['products', 'about'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'products' ? `Products (${total})` : 'About'}
            </button>
          ))}
        </div>
      </div>

      {/* Products Tab */}
      {activeTab === 'products' && (
        <>
          {/* Sort bar */}
          <div className="flex items-center justify-between mb-6">
            <span className="text-sm text-gray-500">{total} products</span>
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
            >
              <option value="newest">Newest</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating">Best Rated</option>
              <option value="popular">Most Popular</option>
            </select>
          </div>

          {listingsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
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
                  <div key={listing.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-all group">
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
                    <div className="p-4">
                      {listing.category_name && (
                        <p className="text-xs text-gray-500 mb-1">{listing.category_name}</p>
                      )}
                      <Link href={`/store/${storeSlug}/marketplace/products/${listing.slug}`}>
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 hover:text-emerald-600 transition-colors">
                          {listing.title}
                        </h3>
                      </Link>
                      {listing.average_rating && listing.average_rating > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          <StarSolidIcon className="h-3.5 w-3.5 text-yellow-400" />
                          <span className="text-xs text-gray-500">{Number(listing.average_rating).toFixed(1)}</span>
                        </div>
                      )}
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
            <div className="text-center py-12">
              <ShoppingCartIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No products listed yet</p>
            </div>
          )}
        </>
      )}

      {/* About Tab */}
      {activeTab === 'about' && (
        <div className="max-w-2xl space-y-6">
          {vendor.description && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">About</h3>
              <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{vendor.description}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <h4 className="text-sm font-medium text-gray-500 mb-3">Statistics</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Products</span>
                  <span className="text-sm font-semibold">{vendor.total_listings}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Orders Completed</span>
                  <span className="text-sm font-semibold">{vendor.total_orders}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Rating</span>
                  <span className="text-sm font-semibold">{Number(vendor.average_rating || 0).toFixed(1)} / 5</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Member Since</span>
                  <span className="text-sm font-semibold">{new Date(vendor.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {(vendor.contact_email || vendor.contact_phone) && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <h4 className="text-sm font-medium text-gray-500 mb-3">Contact</h4>
                <div className="space-y-2">
                  {vendor.contact_email && (
                    <a href={`mailto:${vendor.contact_email}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-emerald-600">
                      <GlobeAltIcon className="h-4 w-4" />
                      {vendor.contact_email}
                    </a>
                  )}
                  {vendor.contact_phone && (
                    <span className="flex items-center gap-2 text-sm text-gray-600">
                      <PhoneIcon className="h-4 w-4" />
                      {vendor.contact_phone}
                    </span>
                  )}
                  {vendor.city && (
                    <span className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPinIcon className="h-4 w-4" />
                      {vendor.city}{vendor.country ? `, ${vendor.country}` : ''}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {vendor.return_policy && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Return Policy</h3>
              <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{vendor.return_policy}</p>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default function VendorStoreWrapper() {
  const router = useRouter();
  const { storeSlug } = router.query as { storeSlug: string };
  if (!storeSlug) return null;

  return (
    <StoreLayout storeSlug={storeSlug}>
      <VendorStorePage />
    </StoreLayout>
  );
}
