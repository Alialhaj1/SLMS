/**
 * Store Wishlist Page — /store/[storeSlug]/wishlist
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import StoreLayout from '../../../components/store/StoreLayout';
import { useStore } from '../../../components/store/StoreLayout';
import ProductCard, { ProductCardData } from '../../../components/store/ProductCard';
import { storeApi } from '../../../lib/storeApi';
import { HeartIcon } from '@heroicons/react/24/outline';

function WishlistPage() {
  const router = useRouter();
  const { storeSlug } = router.query as { storeSlug: string };
  const store = useStore();

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storeSlug || !store.accessToken) return;
    loadWishlist();
  }, [storeSlug, store.accessToken]);

  const loadWishlist = async () => {
    setLoading(true);
    try {
      const result = await storeApi.getWishlist(storeSlug, { token: store.accessToken });
      setItems(result.data || []);
    } catch (error) {
      console.error('Failed to load wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (product: ProductCardData) => {
    try {
      await storeApi.removeFromWishlist(storeSlug, product.id, { token: store.accessToken });
      setItems(prev => prev.filter(i => i.item_id !== product.id));
    } catch (error: any) {
      alert(error.message || 'Failed to remove');
    }
  };

  const handleAddToCart = async (product: ProductCardData) => {
    try {
      const sessionId = localStorage.getItem('store_session_id') || '';
      await storeApi.addToCart(storeSlug, { itemId: product.id, quantity: 1 }, { token: store.accessToken, sessionId });
      alert('Added to cart!');
    } catch (error: any) {
      alert(error.message || 'Failed to add to cart');
    }
  };

  if (!store.accessToken) {
    router.push(`/store/${storeSlug}/login?redirect=${encodeURIComponent(router.asPath)}`);
    return null;
  }

  return (
    <>
      <Head>
        <title>Wishlist — Store</title>
      </Head>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">My Wishlist</h1>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border overflow-hidden animate-pulse">
              <div className="aspect-square bg-gray-200 dark:bg-gray-700" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <HeartIcon className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-lg text-gray-500 dark:text-gray-400 mb-4">Your wishlist is empty</p>
          <Link
            href={`/store/${storeSlug}/products`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {items.map((item: any) => (
            <ProductCard
              key={item.id}
              product={{
                id: item.item_id,
                name: item.item_name,
                nameAr: item.item_name_ar,
                slug: item.slug,
                price: parseFloat(item.price) || 0,
                imageUrl: item.image_url,
                inStock: item.in_stock,
              }}
              storeSlug={storeSlug}
              isWishlisted={true}
              onToggleWishlist={handleRemove}
              onAddToCart={handleAddToCart}
            />
          ))}
        </div>
      )}
    </>
  );
}

export default function WishlistPageWrapper() {
  const router = useRouter();
  const { storeSlug } = router.query as { storeSlug: string };
  if (!storeSlug) return null;

  return (
    <StoreLayout storeSlug={storeSlug}>
      <WishlistPage />
    </StoreLayout>
  );
}
