/**
 * Store Orders Page — /store/[storeSlug]/orders
 * Customer order history
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import StoreLayout from '../../../../components/store/StoreLayout';
import { useStore } from '../../../../components/store/StoreLayout';
import { storeApi } from '../../../../lib/storeApi';
import {
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  ClockIcon,
  TruckIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  pending: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300', icon: ClockIcon, label: 'Pending' },
  confirmed: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', icon: CheckCircleIcon, label: 'Confirmed' },
  processing: { color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300', icon: ClipboardDocumentListIcon, label: 'Processing' },
  shipped: { color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300', icon: TruckIcon, label: 'Shipped' },
  delivered: { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', icon: CheckCircleIcon, label: 'Delivered' },
  cancelled: { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', icon: XCircleIcon, label: 'Cancelled' },
};

function OrdersPage() {
  const router = useRouter();
  const { storeSlug } = router.query as { storeSlug: string };
  const store = useStore();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!storeSlug || !store.accessToken) return;
    loadOrders();
  }, [storeSlug, store.accessToken, page]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const result = await storeApi.getOrders(storeSlug, page, { token: store.accessToken });
      setOrders(result.data || []);
      setTotalPages(result.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!store.accessToken) {
    router.push(`/store/${storeSlug}/login?redirect=${encodeURIComponent(router.asPath)}`);
    return null;
  }

  return (
    <>
      <Head>
        <title>My Orders — Store</title>
      </Head>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">My Orders</h1>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16">
          <ClipboardDocumentListIcon className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-lg text-gray-500 dark:text-gray-400 mb-4">No orders yet</p>
          <Link
            href={`/store/${storeSlug}/products`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order: any) => {
            const status = statusConfig[order.status] || statusConfig.pending;
            const StatusIcon = status.icon;

            return (
              <Link
                key={order.id}
                href={`/store/${storeSlug}/orders/${order.id}`}
                className="block p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Order #{order.order_number || order.id}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {new Date(order.created_at).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'long', day: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
                      <StatusIcon className="h-3.5 w-3.5" />
                      {status.label}
                    </span>
                    <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: order.currency_code || 'SAR' }).format(order.total_amount)}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default function OrdersPageWrapper() {
  const router = useRouter();
  const { storeSlug } = router.query as { storeSlug: string };
  if (!storeSlug) return null;

  return (
    <StoreLayout storeSlug={storeSlug}>
      <OrdersPage />
    </StoreLayout>
  );
}
