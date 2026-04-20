/**
 * Product Detail Page — /store/[storeSlug]/products/[slug]
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import StoreLayout from '../../../../components/store/StoreLayout';
import { storeApi } from '../../../../lib/storeApi';
import {
  ShoppingCartIcon,
  HeartIcon,
  MinusIcon,
  PlusIcon,
  StarIcon,
  TruckIcon,
  ShieldCheckIcon,
  ArrowUturnLeftIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon, HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';

function ProductDetailPage() {
  const router = useRouter();
  const { storeSlug, slug } = router.query as { storeSlug: string; slug: string };

  const [product, setProduct] = useState<any>(null);
  const [reviews, setReviews] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    if (!storeSlug || !slug) return;
    loadProduct();
  }, [storeSlug, slug]);

  const loadProduct = async () => {
    setLoading(true);
    try {
      const result = await storeApi.getProduct(storeSlug, slug);
      setProduct(result.data);

      // Load reviews
      if (result.data?.id) {
        const reviewsResult = await storeApi.getReviews(storeSlug, result.data.id);
        setReviews(reviewsResult.data);
      }
    } catch (error) {
      console.error('Failed to load product:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;
    setAddingToCart(true);
    try {
      const token = localStorage.getItem('store_access_token');
      const sessionId = localStorage.getItem('store_session_id') || '';
      await storeApi.addToCart(storeSlug, {
        itemId: product.id,
        variantId: selectedVariant?.id,
        quantity,
      }, { token, sessionId });
      alert('Added to cart!');
    } catch (error: any) {
      alert(error.message || 'Failed to add to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleAddToWishlist = async () => {
    if (!product) return;
    const token = localStorage.getItem('store_access_token');
    if (!token) {
      router.push(`/store/${storeSlug}/login?redirect=${encodeURIComponent(router.asPath)}`);
      return;
    }
    try {
      await storeApi.addToWishlist(storeSlug, product.id, { token });
      alert('Added to wishlist!');
    } catch (error: any) {
      alert(error.message || 'Failed to add to wishlist');
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-xl" />
          <div className="space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 text-lg">Product not found</p>
      </div>
    );
  }

  const images = product.images || [];
  const currentImage = images[selectedImage]?.imageUrl || null;

  return (
    <>
      <Head>
        <title>{product.seo?.metaTitle || product.name} — Store</title>
        {product.seo?.metaDescription && <meta name="description" content={product.seo.metaDescription} />}
        {product.seo?.metaKeywords && <meta name="keywords" content={product.seo.metaKeywords} />}

        {/* Open Graph */}
        <meta property="og:title" content={product.seo?.metaTitle || product.name} />
        <meta property="og:type" content="product" />
        {product.seo?.metaDescription && <meta property="og:description" content={product.seo.metaDescription} />}
        {(product.seo?.ogImageUrl || images[0]?.imageUrl) && (
          <meta property="og:image" content={product.seo?.ogImageUrl || images[0]?.imageUrl} />
        )}
        <meta property="og:url" content={typeof window !== 'undefined' ? window.location.href : ''} />
        <meta property="product:price:amount" content={String(product.price)} />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={product.seo?.metaTitle || product.name} />
        {product.seo?.metaDescription && <meta name="twitter:description" content={product.seo.metaDescription} />}

        {/* Structured Data — JSON-LD Product Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Product',
              name: product.name,
              description: product.seo?.metaDescription || '',
              image: images.map((img: any) => img.imageUrl).filter(Boolean),
              sku: product.code,
              brand: product.brand?.name ? { '@type': 'Brand', name: product.brand.name } : undefined,
              category: product.category?.name || undefined,
              offers: {
                '@type': 'Offer',
                price: product.price,
                priceCurrency: 'SAR',
                availability: product.inStock
                  ? 'https://schema.org/InStock'
                  : 'https://schema.org/OutOfStock',
              },
              ...(product.rating && {
                aggregateRating: {
                  '@type': 'AggregateRating',
                  ratingValue: product.rating,
                  reviewCount: product.reviewCount || 0,
                },
              }),
            }),
          }}
        />
      </Head>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        {/* Image Gallery */}
        <div>
          <div className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden mb-4">
            {currentImage ? (
              <img src={currentImage} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ShoppingCartIcon className="h-24 w-24 text-gray-300 dark:text-gray-600" />
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {images.map((img: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                    selectedImage === idx ? 'border-indigo-500' : 'border-gray-200 dark:border-gray-600'
                  }`}
                >
                  <img src={img.imageUrl} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div>
          {product.brandName && (
            <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium mb-1">{product.brandName}</p>
          )}
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {product.name}
          </h1>

          {/* Rating */}
          {reviews?.stats && reviews.stats.total_reviews > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map(star => (
                  star <= Math.round(parseFloat(reviews.stats.average_rating)) ? (
                    <StarSolidIcon key={star} className="h-5 w-5 text-yellow-400" />
                  ) : (
                    <StarIcon key={star} className="h-5 w-5 text-gray-300" />
                  )
                ))}
              </div>
              <span className="text-sm text-gray-500">
                {parseFloat(reviews.stats.average_rating).toFixed(1)} ({reviews.stats.total_reviews} reviews)
              </span>
            </div>
          )}

          {/* Price */}
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'SAR' }).format(product.price)}
            </span>
            {product.compareAtPrice > product.price && (
              <span className="text-lg text-gray-400 line-through">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'SAR' }).format(product.compareAtPrice)}
              </span>
            )}
          </div>

          {/* Description */}
          {product.description && (
            <div className="prose prose-sm dark:prose-invert mb-6">
              <p className="text-gray-600 dark:text-gray-400">{product.description}</p>
            </div>
          )}

          {/* Variants */}
          {product.variants && product.variants.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Options
              </label>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((variant: any) => (
                  <button
                    key={variant.id}
                    onClick={() => setSelectedVariant(variant)}
                    className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                      selectedVariant?.id === variant.id
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                        : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {variant.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity + Add to Cart */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg">
              <button
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-l-lg"
              >
                <MinusIcon className="h-5 w-5" />
              </button>
              <span className="px-4 py-2 text-center min-w-[3rem] font-medium">{quantity}</span>
              <button
                onClick={() => setQuantity(q => q + 1)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-r-lg"
              >
                <PlusIcon className="h-5 w-5" />
              </button>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={addingToCart || product.inStock === false}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
            >
              <ShoppingCartIcon className="h-5 w-5" />
              {addingToCart ? 'Adding...' : product.inStock === false ? 'Out of Stock' : 'Add to Cart'}
            </button>

            <button
              onClick={handleAddToWishlist}
              className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <HeartIcon className="h-5 w-5 text-gray-400 hover:text-red-500" />
            </button>
          </div>

          {/* Trust Badges */}
          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col items-center gap-1 text-center">
              <TruckIcon className="h-6 w-6 text-gray-400" />
              <span className="text-xs text-gray-500">Free Shipping</span>
            </div>
            <div className="flex flex-col items-center gap-1 text-center">
              <ShieldCheckIcon className="h-6 w-6 text-gray-400" />
              <span className="text-xs text-gray-500">Secure Payment</span>
            </div>
            <div className="flex flex-col items-center gap-1 text-center">
              <ArrowUturnLeftIcon className="h-6 w-6 text-gray-400" />
              <span className="text-xs text-gray-500">Easy Returns</span>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      {reviews && reviews.reviews && reviews.reviews.length > 0 && (
        <section className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Customer Reviews</h2>

          {/* Review Stats */}
          <div className="flex items-center gap-8 mb-8 p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900 dark:text-white">
                {parseFloat(reviews.stats.average_rating).toFixed(1)}
              </div>
              <div className="flex items-center justify-center mt-1">
                {[1, 2, 3, 4, 5].map(star => (
                  star <= Math.round(parseFloat(reviews.stats.average_rating)) ? (
                    <StarSolidIcon key={star} className="h-4 w-4 text-yellow-400" />
                  ) : (
                    <StarIcon key={star} className="h-4 w-4 text-gray-300" />
                  )
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-1">{reviews.stats.total_reviews} reviews</p>
            </div>
            <div className="flex-1 space-y-1">
              {[5, 4, 3, 2, 1].map(n => {
                const key = n === 5 ? 'five_star' : n === 4 ? 'four_star' : n === 3 ? 'three_star' : n === 2 ? 'two_star' : 'one_star';
                const count = parseInt(reviews.stats[key]) || 0;
                const pct = reviews.stats.total_reviews > 0 ? (count / parseInt(reviews.stats.total_reviews)) * 100 : 0;
                return (
                  <div key={n} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-4">{n}</span>
                    <StarSolidIcon className="h-3 w-3 text-yellow-400" />
                    <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 w-8">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Review List */}
          <div className="space-y-4">
            {reviews.reviews.map((review: any) => (
              <div key={review.id} className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map(star => (
                      star <= review.rating ? (
                        <StarSolidIcon key={star} className="h-4 w-4 text-yellow-400" />
                      ) : (
                        <StarIcon key={star} className="h-4 w-4 text-gray-300" />
                      )
                    ))}
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{review.first_name}</span>
                  {review.is_verified_purchase && (
                    <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full">
                      Verified Purchase
                    </span>
                  )}
                </div>
                {review.title && <p className="font-medium text-gray-900 dark:text-white mb-1">{review.title}</p>}
                {review.comment && <p className="text-sm text-gray-600 dark:text-gray-400">{review.comment}</p>}
                <p className="text-xs text-gray-400 mt-2">{new Date(review.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

export default function ProductDetailWrapper() {
  const router = useRouter();
  const { storeSlug } = router.query as { storeSlug: string };
  if (!storeSlug) return null;

  return (
    <StoreLayout storeSlug={storeSlug}>
      <ProductDetailPage />
    </StoreLayout>
  );
}
