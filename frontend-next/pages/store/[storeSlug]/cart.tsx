/**
 * Store Cart Page — /store/[storeSlug]/cart
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import StoreLayout from '../../../components/store/StoreLayout';
import { storeApi } from '../../../lib/storeApi';
import {
  TrashIcon,
  MinusIcon,
  PlusIcon,
  ShoppingBagIcon,
  TagIcon,
  ArrowRightIcon,
  BuildingStorefrontIcon,
} from '@heroicons/react/24/outline';

function CartPage() {
  const router = useRouter();
  const { storeSlug } = router.query as { storeSlug: string };

  const [cart, setCart] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [couponCode, setCouponCode] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('store_access_token') : null;
  const sessionId = typeof window !== 'undefined' ? localStorage.getItem('store_session_id') || '' : '';

  useEffect(() => {
    if (!storeSlug) return;
    loadCart();
  }, [storeSlug]);

  const loadCart = async () => {
    setLoading(true);
    try {
      const result = await storeApi.getCart(storeSlug, { token, sessionId });
      setCart(result.data);
    } catch (error) {
      console.error('Failed to load cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (cartItemId: number, newQty: number) => {
    if (newQty < 1) return;
    try {
      const result = await storeApi.updateCartItem(storeSlug, cartItemId, newQty, { token, sessionId });
      setCart(result.data);
    } catch (error: any) {
      alert(error.message || 'Failed to update');
    }
  };

  const removeItem = async (cartItemId: number) => {
    try {
      await storeApi.removeCartItem(storeSlug, cartItemId, { token, sessionId });
      loadCart();
    } catch (error: any) {
      alert(error.message || 'Failed to remove');
    }
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setApplyingCoupon(true);
    try {
      const result = await storeApi.applyCoupon(storeSlug, couponCode, { token, sessionId });
      setCart(result.data);
      setCouponCode('');
    } catch (error: any) {
      alert(error.message || 'Invalid coupon');
    } finally {
      setApplyingCoupon(false);
    }
  };

  const removeCoupon = async () => {
    try {
      const result = await storeApi.removeCoupon(storeSlug, { token, sessionId });
      setCart(result.data);
    } catch (error: any) {
      alert(error.message || 'Failed to remove coupon');
    }
  };

  const goToCheckout = () => {
    if (!token) {
      router.push(`/store/${storeSlug}/login?redirect=${encodeURIComponent(`/store/${storeSlug}/checkout`)}`);
      return;
    }
    router.push(`/store/${storeSlug}/checkout`);
  };

  const items = cart?.items || [];
  const isEmpty = items.length === 0;

  // Group items by vendor for multi-vendor display
  const groupedByVendor = items.reduce((groups: Record<string, { vendorName: string; vendorSlug: string; items: any[] }>, item: any) => {
    const key = item.vendor_id ? `vendor-${item.vendor_id}` : 'store';
    if (!groups[key]) {
      groups[key] = {
        vendorName: item.vendor_name || 'Store',
        vendorSlug: item.vendor_slug || '',
        items: [],
      };
    }
    groups[key].items.push(item);
    return groups;
  }, {} as Record<string, { vendorName: string; vendorSlug: string; items: any[] }>);
  const vendorGroups = Object.entries(groupedByVendor) as [string, { vendorName: string; vendorSlug: string; items: any[] }][];
  const hasMultipleVendors = vendorGroups.length > 1 || (vendorGroups.length === 1 && vendorGroups[0][0] !== 'store');

  const renderCartItem = (item: any) => (
    <>
      {/* Image */}
      <div className="w-20 h-20 flex-shrink-0 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <ShoppingBagIcon className="h-8 w-8" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.name}</h3>
        {item.variantName && (
          <p className="text-xs text-gray-500 mt-0.5">{item.variantName}</p>
        )}
        {/* Vendor tag for non-grouped single-vendor view */}
        {!hasMultipleVendors && item.vendor_name && (
          <p className="text-xs text-emerald-600 mt-0.5 flex items-center gap-1">
            <BuildingStorefrontIcon className="h-3 w-3" />
            {item.vendor_name}
          </p>
        )}
        <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'SAR' }).format(item.unitPrice)}
        </p>

        {/* Quantity Controls */}
        <div className="flex items-center gap-3 mt-2">
          <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg">
            <button
              onClick={() => updateQuantity(item.id, item.quantity - 1)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-l-lg"
            >
              <MinusIcon className="h-4 w-4" />
            </button>
            <span className="px-3 text-sm font-medium">{item.quantity}</span>
            <button
              onClick={() => updateQuantity(item.id, item.quantity + 1)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-r-lg"
            >
              <PlusIcon className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={() => removeItem(item.id)}
            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Item Total */}
      <div className="text-right">
        <span className="font-semibold text-gray-900 dark:text-white">
          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'SAR' }).format(item.totalPrice || item.unitPrice * item.quantity)}
        </span>
      </div>
    </>
  );

  if (!storeSlug) return null;

  return (
    <>
      <Head>
        <title>Shopping Cart — Store</title>
      </Head>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Shopping Cart</h1>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          ))}
        </div>
      ) : isEmpty ? (
        <div className="text-center py-16">
          <ShoppingBagIcon className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-lg text-gray-500 dark:text-gray-400 mb-4">Your cart is empty</p>
          <Link
            href={`/store/${storeSlug}/products`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items — grouped by vendor */}
          <div className="lg:col-span-2 space-y-6">
            {hasMultipleVendors ? (
              vendorGroups.map(([key, group]) => (
                <div key={key} className="space-y-3">
                  {/* Vendor Header */}
                  <div className="flex items-center gap-2 px-1">
                    <BuildingStorefrontIcon className="h-4 w-4 text-emerald-600" />
                    {group.vendorSlug ? (
                      <Link
                        href={`/store/${storeSlug}/marketplace/vendors/${group.vendorSlug}`}
                        className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
                      >
                        {group.vendorName}
                      </Link>
                    ) : (
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{group.vendorName}</span>
                    )}
                    <span className="text-xs text-gray-400">({group.items.length} item{group.items.length > 1 ? 's' : ''})</span>
                  </div>

                  {group.items.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
                    >
                      {renderCartItem(item)}
                    </div>
                  ))}
                </div>
              ))
            ) : (
              items.map((item: any) => (
                <div
                  key={item.id}
                  className="flex gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
                >
                  {renderCartItem(item)}
                </div>
              ))
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 sticky top-24">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Order Summary</h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'SAR' }).format(cart?.subtotal || 0)}
                  </span>
                </div>
                {cart?.discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'SAR' }).format(cart.discountAmount)}</span>
                  </div>
                )}
                {cart?.couponCode && (
                  <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg">
                    <div className="flex items-center gap-1">
                      <TagIcon className="h-4 w-4 text-green-600" />
                      <span className="text-xs font-medium text-green-700 dark:text-green-400">{cart.couponCode}</span>
                    </div>
                    <button onClick={removeCoupon} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                  </div>
                )}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-3 flex justify-between">
                  <span className="font-semibold text-gray-900 dark:text-white">Total</span>
                  <span className="font-bold text-lg text-gray-900 dark:text-white">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'SAR' }).format(cart?.total || 0)}
                  </span>
                </div>
              </div>

              {/* Coupon Input */}
              {!cart?.couponCode && (
                <div className="mt-4 flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="Coupon code"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700"
                  />
                  <button
                    onClick={applyCoupon}
                    disabled={applyingCoupon}
                    className="px-4 py-2 text-sm bg-gray-900 dark:bg-gray-600 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
                  >
                    Apply
                  </button>
                </div>
              )}

              {/* Checkout Button */}
              <button
                onClick={goToCheckout}
                className="mt-6 w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors"
              >
                Proceed to Checkout
                <ArrowRightIcon className="h-5 w-5" />
              </button>

              <Link
                href={`/store/${storeSlug}/products`}
                className="block text-center text-sm text-indigo-600 hover:text-indigo-500 mt-3"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function CartPageWrapper() {
  const router = useRouter();
  const { storeSlug } = router.query as { storeSlug: string };
  if (!storeSlug) return null;

  return (
    <StoreLayout storeSlug={storeSlug}>
      <CartPage />
    </StoreLayout>
  );
}
