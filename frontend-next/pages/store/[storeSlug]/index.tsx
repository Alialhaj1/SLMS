/**
 * Store Home Page — /store/[storeSlug]
 * Landing page for the public storefront
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import StoreLayout from '../../../components/store/StoreLayout';
import ProductCard, { ProductCardData } from '../../../components/store/ProductCard';
import { storeApi } from '../../../lib/storeApi';
import { useStore } from '../../../components/store/StoreLayout';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

function StoreHomePage() {
  const router = useRouter();
  const { storeSlug } = router.query as { storeSlug: string };
  const [featuredProducts, setFeaturedProducts] = useState<ProductCardData[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storeSlug) return;
    loadStoreData();
  }, [storeSlug]);

  const loadStoreData = async () => {
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        storeApi.getProducts(storeSlug, { limit: '8', sortBy: 'newest' }),
        storeApi.getCategories(storeSlug),
      ]);
      setFeaturedProducts(productsRes.data || []);
      setCategories(categoriesRes.data || []);
    } catch (error) {
      console.error('Failed to load store data:', error);
    } finally {
      setLoading(false);
    }
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

  if (!storeSlug) return null;

  return (
    <>
      <Head>
        <title>{storeSlug} — Online Store</title>
        <meta name="description" content={`Shop the best products at ${storeSlug}. Free shipping, secure payments.`} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={`${storeSlug} — Online Store`} />
        <link rel="canonical" href={typeof window !== 'undefined' ? window.location.href : ''} />
      </Head>

      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl overflow-hidden mb-12">
        <div className="relative z-10 px-8 py-16 sm:py-24 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Welcome to Our Store
          </h1>
          <p className="text-lg text-indigo-100 mb-8 max-w-2xl mx-auto">
            Discover our collection of products with the best quality and prices
          </p>
          <Link
            href={`/store/${storeSlug}/products`}
            className="inline-flex items-center gap-2 px-8 py-3 bg-white text-indigo-600 font-semibold rounded-lg hover:bg-indigo-50 transition-colors"
          >
            Shop Now
            <ArrowRightIcon className="h-5 w-5" />
          </Link>
        </div>
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Categories</h2>
            <Link href={`/store/${storeSlug}/categories`} className="text-sm text-indigo-600 hover:text-indigo-500 font-medium">
              View All
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {categories.slice(0, 6).map((cat: any) => (
              <Link
                key={cat.id}
                href={`/store/${storeSlug}/products?categoryId=${cat.id}`}
                className="flex flex-col items-center p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-indigo-300 transition-all"
              >
                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-2">
                  <span className="text-xl">{cat.name?.[0] || '📦'}</span>
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center">{cat.name}</span>
                {cat.productCount > 0 && (
                  <span className="text-xs text-gray-400 mt-1">{cat.productCount} products</span>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured Products */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Featured Products</h2>
          <Link href={`/store/${storeSlug}/products`} className="text-sm text-indigo-600 hover:text-indigo-500 font-medium">
            View All
          </Link>
        </div>

        {loading ? (
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
        ) : featuredProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                storeSlug={storeSlug}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-gray-500 dark:text-gray-400">No products available yet</p>
          </div>
        )}
      </section>
    </>
  );
}

// Wrapper with StoreLayout
export default function StoreHomePageWrapper() {
  const router = useRouter();
  const { storeSlug } = router.query as { storeSlug: string };

  if (!storeSlug) return null;

  return (
    <StoreLayout storeSlug={storeSlug}>
      <StoreHomePage />
    </StoreLayout>
  );
}
