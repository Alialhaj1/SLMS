/**
 * Marketplace Product Detail — /store/[storeSlug]/marketplace/products/[slug]
 * Listing detail page showing vendor info, pricing, reviews, add to cart
 * Supports multi-vendor: "Sold by Vendor X" with link to vendor store
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import StoreLayout from '../../../../../components/store/StoreLayout';
import { marketplaceStorefrontApi } from '../../../../../lib/marketplaceApi';
import { storeApi } from '../../../../../lib/storeApi';
import {
  ShoppingCartIcon,
  StarIcon,
  HeartIcon,
  MinusIcon,
  PlusIcon,
  TruckIcon,
  ShieldCheckIcon,
  ArrowPathIcon,
  BuildingStorefrontIcon,
  ChevronLeftIcon,
  CheckBadgeIcon,
  TagIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon, HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';

interface ListingDetail {
  id: number;
  item_id: number;
  title: string;
  title_ar?: string;
  slug: string;
  description?: string;
  description_ar?: string;
  price: number;
  compare_at_price?: number;
  currency_code?: string;
  image_url?: string;
  images?: string[];
  category_name?: string;
  category_name_ar?: string;
  vendor_id: number;
  vendor_name: string;
  vendor_name_ar?: string;
  vendor_slug: string;
  vendor_logo?: string;
  vendor_rating?: number;
  vendor_reviews?: number;
  vendor_verified?: boolean;
  sku?: string;
  barcode?: string;
  average_rating?: number;
  review_count?: number;
  view_count?: number;
  in_stock?: boolean;
  stock_quantity?: number;
  variants?: Array<{
    id: number;
    name: string;
    sku?: string;
    price?: number;
    stock?: number;
    attributes?: Record<string, string>;
  }>;
  specifications?: Record<string, string>;
}

function renderStars(rating: number, size = 'h-5 w-5') {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(s => (
        s <= Math.round(rating) ? (
          <StarSolidIcon key={s} className={`${size} text-yellow-400`} />
        ) : (
          <StarIcon key={s} className={`${size} text-gray-300 dark:text-gray-600`} />
        )
      ))}
    </div>
  );
}

function formatPrice(price: number, currency?: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'SAR',
    minimumFractionDigits: 2,
  }).format(price);
}

function MarketplaceProductPage() {
  const router = useRouter();
  const { storeSlug, slug } = router.query as { storeSlug: string; slug: string };

  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<number | null>(null);

  useEffect(() => {
    if (!slug) return;
    loadListing();
  }, [slug]);

  const loadListing = async () => {
    setLoading(true);
    try {
      const res = await marketplaceStorefrontApi.getListing(slug);
      setListing(res.data || res.listing || res);
    } catch (error) {
      console.error('Failed to load listing:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async () => {
    if (!listing) return;
    setAddingToCart(true);
    try {
      const token = localStorage.getItem('store_access_token');
      const sessionId = localStorage.getItem('store_session_id') || '';
      await storeApi.addToCart(storeSlug, {
        itemId: listing.item_id || listing.id,
        quantity,
        listingId: listing.id,
        vendorId: listing.vendor_id,
        ...(selectedVariant ? { variantId: selectedVariant } : {}),
      }, { token, sessionId });
      alert('Added to cart!');
    } catch (error: any) {
      alert(error.message || 'Failed to add to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  const discount = listing?.compare_at_price && listing.compare_at_price > listing.price
    ? Math.round(((listing.compare_at_price - listing.price) / listing.compare_at_price) * 100)
    : null;

  const allImages = listing
    ? [listing.image_url, ...(listing.images || [])].filter(Boolean) as string[]
    : [];

  if (!storeSlug || !slug) return null;

  return (
    <>
      <Head>
        <title>{listing?.title || 'Product'} — Marketplace</title>
        {listing && (
          <>
            <meta name="description" content={listing.description?.substring(0, 160) || `Buy ${listing.title} from ${listing.vendor_name}`} />
            <meta property="og:type" content="product" />
            <meta property="og:title" content={listing.title} />
            <meta property="og:description" content={listing.description?.substring(0, 200) || ''} />
            {listing.image_url && <meta property="og:image" content={listing.image_url} />}
            <meta name="twitter:card" content="summary_large_image" />
          </>
        )}
      </Head>

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href={`/store/${storeSlug}/marketplace`} className="hover:text-emerald-600 transition-colors">
          Marketplace
        </Link>
        <span>/</span>
        {listing?.category_name && (
          <>
            <span>{listing.category_name}</span>
            <span>/</span>
          </>
        )}
        <span className="text-gray-900 dark:text-white truncate">{listing?.title || '...'}</span>
      </nav>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-pulse">
          <div className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-2xl" />
          <div className="space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
      ) : !listing ? (
        <div className="text-center py-16">
          <ShoppingCartIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-lg text-gray-500">Product not found</p>
          <Link href={`/store/${storeSlug}/marketplace`} className="inline-flex items-center gap-2 mt-4 text-emerald-600">
            <ChevronLeftIcon className="h-4 w-4" /> Back to Marketplace
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {/* LEFT: Images */}
          <div>
            {/* Main Image */}
            <div className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-2xl overflow-hidden mb-4">
              {allImages.length > 0 ? (
                <img
                  src={allImages[selectedImage] || allImages[0]}
                  alt={listing.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ShoppingCartIcon className="h-24 w-24 text-gray-300" />
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {allImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                      selectedImage === i ? 'border-emerald-500' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: Details */}
          <div>
            {/* Category */}
            {listing.category_name && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-500 mb-2">
                <TagIcon className="h-3 w-3" />
                {listing.category_name}
              </span>
            )}

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {listing.title}
            </h1>

            {/* SKU */}
            {listing.sku && (
              <p className="text-xs text-gray-400 font-mono mb-3">SKU: {listing.sku}</p>
            )}

            {/* Rating */}
            {listing.average_rating !== undefined && listing.average_rating > 0 && (
              <div className="flex items-center gap-2 mb-4">
                {renderStars(listing.average_rating)}
                <span className="text-sm text-gray-600">
                  {Number(listing.average_rating).toFixed(1)} ({listing.review_count || 0} reviews)
                </span>
              </div>
            )}

            {/* Price */}
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                {formatPrice(listing.price, listing.currency_code)}
              </span>
              {listing.compare_at_price && listing.compare_at_price > listing.price && (
                <>
                  <span className="text-xl text-gray-400 line-through">
                    {formatPrice(listing.compare_at_price, listing.currency_code)}
                  </span>
                  <span className="px-2 py-1 bg-red-100 text-red-700 text-sm font-semibold rounded">
                    -{discount}%
                  </span>
                </>
              )}
            </div>

            {/* ═══ SOLD BY VENDOR ═══ (Key marketplace feature) */}
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  {listing.vendor_logo ? (
                    <img src={listing.vendor_logo} alt={listing.vendor_name} className="w-full h-full object-cover" />
                  ) : (
                    <BuildingStorefrontIcon className="h-5 w-5 text-emerald-600" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500">Sold by</p>
                  <Link
                    href={`/store/${storeSlug}/marketplace/vendors/${listing.vendor_slug}`}
                    className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    {listing.vendor_name}
                    {listing.vendor_verified && <CheckBadgeIcon className="h-4 w-4 text-blue-500" />}
                  </Link>
                  {listing.vendor_rating !== undefined && listing.vendor_rating > 0 && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <StarSolidIcon className="h-3 w-3 text-yellow-400" />
                      <span className="text-xs text-gray-500">
                        {Number(listing.vendor_rating).toFixed(1)} vendor rating
                      </span>
                    </div>
                  )}
                </div>
                <Link
                  href={`/store/${storeSlug}/marketplace/vendors/${listing.vendor_slug}`}
                  className="px-3 py-1.5 text-xs font-medium text-emerald-700 border border-emerald-300 rounded-lg hover:bg-emerald-100 transition-colors"
                >
                  Visit Store
                </Link>
              </div>
            </div>

            {/* Variants */}
            {listing.variants && listing.variants.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Options</h3>
                <div className="flex flex-wrap gap-2">
                  {listing.variants.map(v => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariant(selectedVariant === v.id ? null : v.id)}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        selectedVariant === v.id
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-emerald-300'
                      }`}
                    >
                      {v.name}
                      {v.price && v.price !== listing.price && (
                        <span className="ml-1 text-xs text-gray-400">{formatPrice(v.price)}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity + Add to Cart */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-l-lg"
                >
                  <MinusIcon className="h-5 w-5" />
                </button>
                <span className="px-4 py-2 text-sm font-semibold min-w-[3rem] text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-r-lg"
                >
                  <PlusIcon className="h-5 w-5" />
                </button>
              </div>

              <button
                onClick={addToCart}
                disabled={addingToCart || listing.in_stock === false}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
              >
                <ShoppingCartIcon className="h-5 w-5" />
                {addingToCart ? 'Adding...' : listing.in_stock === false ? 'Out of Stock' : 'Add to Cart'}
              </button>
            </div>

            {/* Stock indicator */}
            {listing.in_stock !== false && listing.stock_quantity !== undefined && listing.stock_quantity <= 10 && (
              <p className="text-sm text-orange-600 mb-4">
                ⚡ Only {listing.stock_quantity} left in stock — order soon!
              </p>
            )}

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { icon: TruckIcon, label: 'Free Shipping', desc: 'On qualifying orders' },
                { icon: ShieldCheckIcon, label: 'Secure Payment', desc: '100% protected' },
                { icon: ArrowPathIcon, label: 'Easy Returns', desc: 'Hassle-free' },
              ].map(({ icon: Icon, label, desc }) => (
                <div key={label} className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <Icon className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</p>
                  <p className="text-xs text-gray-400">{desc}</p>
                </div>
              ))}
            </div>

            {/* Description */}
            {listing.description && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Description</h3>
                <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">
                  {listing.description}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default function MarketplaceProductWrapper() {
  const router = useRouter();
  const { storeSlug } = router.query as { storeSlug: string };
  if (!storeSlug) return null;

  return (
    <StoreLayout storeSlug={storeSlug}>
      <MarketplaceProductPage />
    </StoreLayout>
  );
}
