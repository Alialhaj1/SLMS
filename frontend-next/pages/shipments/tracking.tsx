import { useEffect, useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '../../config/menu.permissions';
import Input from '../../components/ui/Input';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import { companyStore } from '../../lib/companyStore';
import {
  MapPinIcon,
  TruckIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface Shipment {
  id: number;
  tracking_number?: string;
  origin: string;
  destination: string;
  status: string;
  created_at: string;
  updated_at: string;
  description?: string;
}

interface TrackingInfo {
  shipment: Shipment;
  events: TrackingEvent[];
}

interface TrackingEvent {
  id: number;
  timestamp: string;
  location: string;
  status: string;
  description: string;
}

function TrackingPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<TrackingInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const getAuthHeaders = () => {
    const token = localStorage.getItem('accessToken');
    const companyId = companyStore.getActiveCompanyId();
    return {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
      ...(companyId ? { 'X-Company-Id': String(companyId) } : {}),
    } as Record<string, string>;
  };

  const buildQuery = (params: Record<string, any>) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null || String(v).trim() === '') return;
      query.append(k, String(v));
    });
    const s = query.toString();
    return s ? `?${s}` : '';
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      showToast('Please enter a shipment number / container no / BL / ID', 'warning');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const q = searchQuery.trim();
      const headers = getAuthHeaders();

      const isIdSearch = /^\d+$/.test(q);

      let shipments: Shipment[] = [];
      if (isIdSearch) {
        const response = await fetch(`${apiBaseUrl}/api/shipments/${q}`, { headers });
        if (!response.ok) throw new Error('Shipment not found');
        const shipment = await response.json();
        shipments = shipment ? [shipment] : [];
      } else {
        // Search by shipment_number/container_no/bl_no (currently supported as aliases)
        const queryString = buildQuery({
          shipment_number: q,
          container_no: q,
          bl_no: q,
        });
        const response = await fetch(`${apiBaseUrl}/api/shipments${queryString}`, { headers });
        if (!response.ok) throw new Error('Shipment not found');

        const payload = await response.json();
        shipments = Array.isArray(payload) ? payload : payload.data || [];
      }

      const trackingData: TrackingInfo[] = await Promise.all(
        shipments.map(async (shipment) => {
          const eventsRes = await fetch(
            `${apiBaseUrl}/api/shipment-events${buildQuery({ shipment_id: shipment.id })}`,
            { headers }
          );

          const eventsPayload = await eventsRes.json().catch(() => ({}));
          const eventsRaw = Array.isArray(eventsPayload) ? eventsPayload : eventsPayload.data || [];

          const events: TrackingEvent[] = (eventsRaw || []).map((ev: any) => ({
            id: ev.id,
            timestamp: ev.occurred_at || ev.created_at,
            location: ev.location || shipment.origin || '',
            status: ev.status_code || ev.event_type || shipment.status || 'pending',
            description: ev.description_en || ev.description_ar || ev.event_type || 'Event',
          }));

          return { shipment, events };
        })
      );

      setResults(trackingData);
      setSearched(true);

      if (trackingData.length === 0) {
        setError('No shipments found matching your search');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to search shipments');
      showToast(err.message || 'Failed to search shipments', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending:
        'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
      in_transit:
        'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
      delivered:
        'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
      on_hold:
        'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
    };
    return colors[status] || colors.pending;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircleIcon className="w-5 h-5" />;
      case 'in_transit':
        return <TruckIcon className="w-5 h-5" />;
      case 'on_hold':
        return <ExclamationTriangleIcon className="w-5 h-5" />;
      default:
        return <ClockIcon className="w-5 h-5" />;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pending',
      in_transit: 'In Transit',
      delivered: 'Delivered',
      on_hold: 'On Hold',
    };
    return labels[status] || status;
  };

  return (
    <MainLayout>
      <Head>
        <title>Shipment Tracking - SLMS</title>
      </Head>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <MapPinIcon className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Track Shipments
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              تتبع الشحنات - Enter shipment number / container / BL / ID
            </p>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 mb-8">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Enter shipment number / container no / BL / ID"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-medium"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <p className="text-red-800 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Results Section */}
      {searched ? (
        results.length > 0 ? (
          <div className="space-y-6">
            {results.map((tracking, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden"
              >
                {/* Shipment Header */}
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        {tracking.shipment.tracking_number || `#${tracking.shipment.id}`}
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {tracking.shipment.description || 'Standard Shipment'}
                      </p>
                    </div>
                    <div
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${getStatusColor(
                        tracking.shipment.status
                      )}`}
                    >
                      {getStatusIcon(tracking.shipment.status)}
                      <span className="font-semibold">
                        {getStatusLabel(tracking.shipment.status)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wide">
                        Origin
                      </p>
                      <p className="font-semibold text-gray-900 dark:text-white mt-1">
                        {tracking.shipment.origin}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wide">
                        Destination
                      </p>
                      <p className="font-semibold text-gray-900 dark:text-white mt-1">
                        {tracking.shipment.destination}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wide">
                        Created
                      </p>
                      <p className="font-semibold text-gray-900 dark:text-white mt-1">
                        {new Date(tracking.shipment.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wide">
                        Updated
                      </p>
                      <p className="font-semibold text-gray-900 dark:text-white mt-1">
                        {new Date(tracking.shipment.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="p-6">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-6">
                    Tracking Timeline
                  </h3>

                  <div className="space-y-4">
                    {tracking.events.map((event, eventIndex) => (
                      <div key={event.id} className="flex gap-4">
                        {/* Timeline Dot */}
                        <div className="flex flex-col items-center">
                          <div className="w-4 h-4 bg-blue-600 rounded-full border-4 border-white dark:border-gray-800"></div>
                          {eventIndex < tracking.events.length - 1 && (
                            <div className="w-1 h-8 bg-gray-300 dark:bg-gray-600 mt-2"></div>
                          )}
                        </div>

                        {/* Event Details */}
                        <div className="flex-1 pb-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-gray-900 dark:text-white">
                              {event.description}
                            </h4>
                            <span
                              className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                                event.status === 'delivered'
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                                  : event.status === 'in_transit'
                                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400'
                                  : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'
                              }`}
                            >
                              {getStatusLabel(event.status)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {event.location}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {new Date(event.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
            <MapPinIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg">No shipments found</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
              Try searching with a different identifier
            </p>
          </div>
        )
      ) : (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
          <MapPinIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            Start tracking a shipment
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
            Enter shipment number / container / BL / ID above to view tracking information
          </p>
        </div>
      )}

      {/* Info Section */}
      <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
          📦 How Shipment Tracking Works
        </h3>
        <ul className="text-blue-800 dark:text-blue-400 text-sm space-y-1 list-disc list-inside">
          <li>Enter shipment number / container / BL / ID above</li>
          <li>View real-time updates on your shipment status</li>
          <li>Track the location and timeline of events</li>
          <li>Monitor your shipment from origin to destination</li>
        </ul>
      </div>
    </MainLayout>
  );
}

export default withPermission(MenuPermissions.Shipments.View, TrackingPage);
