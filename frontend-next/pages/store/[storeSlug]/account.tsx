/**
 * Store Account Page — /store/[storeSlug]/account
 * Customer profile and addresses management
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import StoreLayout from '../../../components/store/StoreLayout';
import { useStore } from '../../../components/store/StoreLayout';
import { storeApi } from '../../../lib/storeApi';
import {
  UserCircleIcon,
  MapPinIcon,
  LockClosedIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

function AccountPage() {
  const router = useRouter();
  const { storeSlug } = router.query as { storeSlug: string };
  const store = useStore();

  const [tab, setTab] = useState<'profile' | 'addresses' | 'password'>('profile');
  const [profile, setProfile] = useState<any>(null);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Profile form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!storeSlug || !store.accessToken) return;
    loadData();
  }, [storeSlug, store.accessToken]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [profileRes, addrRes] = await Promise.all([
        storeApi.getProfile(storeSlug, { token: store.accessToken }),
        storeApi.getAddresses(storeSlug, { token: store.accessToken }),
      ]);
      const p = profileRes.data;
      setProfile(p);
      setFirstName(p.firstName || '');
      setLastName(p.lastName || '');
      setPhone(p.phone || '');
      setAddresses(addrRes.data || []);
    } catch (error) {
      console.error('Failed to load account data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    setMessage('');
    try {
      await storeApi.updateProfile(storeSlug, { firstName, lastName, phone }, { token: store.accessToken });
      setMessage('Profile updated successfully');
    } catch (error: any) {
      setMessage(error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (newPassword.length < 8) {
      setMessage('New password must be at least 8 characters');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch(`/api/store/${storeSlug}/auth/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${store.accessToken}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
    } catch (error: any) {
      setMessage(error.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const deleteAddress = async (id: number) => {
    if (!confirm('Delete this address?')) return;
    try {
      await storeApi.deleteAddress(storeSlug, id, { token: store.accessToken });
      setAddresses(prev => prev.filter(a => a.id !== id));
    } catch (error: any) {
      alert(error.message || 'Failed to delete');
    }
  };

  if (!store.accessToken) {
    router.push(`/store/${storeSlug}/login?redirect=${encodeURIComponent(router.asPath)}`);
    return null;
  }

  const tabs = [
    { key: 'profile' as const, label: 'Profile', icon: UserCircleIcon },
    { key: 'addresses' as const, label: 'Addresses', icon: MapPinIcon },
    { key: 'password' as const, label: 'Password', icon: LockClosedIcon },
  ];

  return (
    <>
      <Head>
        <title>My Account — Store</title>
      </Head>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">My Account</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Tabs */}
        <div className="lg:col-span-1">
          <nav className="space-y-1">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setMessage(''); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  tab === t.key
                    ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <t.icon className="h-5 w-5" />
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              {message && (
                <div className={`mb-4 p-3 rounded-lg text-sm ${
                  message.includes('success') ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                }`}>
                  {message}
                </div>
              )}

              {/* Profile Tab */}
              {tab === 'profile' && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Profile Information</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name</label>
                      <input value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
                      <input value={lastName} onChange={e => setLastName(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                    <input value={profile?.email || ''} disabled className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                    <input value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                  </div>
                  <button onClick={saveProfile} disabled={saving} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium rounded-lg transition-colors">
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}

              {/* Addresses Tab */}
              {tab === 'addresses' && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Saved Addresses</h2>
                  {addresses.length === 0 ? (
                    <p className="text-gray-500">No saved addresses</p>
                  ) : (
                    addresses.map((addr: any) => (
                      <div key={addr.id} className="flex items-start justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {addr.first_name} {addr.last_name} {addr.label && `(${addr.label})`}
                            {addr.is_default && <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">Default</span>}
                          </p>
                          <p className="text-sm text-gray-500">{addr.address_line1}</p>
                          <p className="text-sm text-gray-500">{addr.city}, {addr.country_code}</p>
                        </div>
                        <button onClick={() => deleteAddress(addr.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Password Tab */}
              {tab === 'password' && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Change Password</h2>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Password</label>
                    <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
                    <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                  </div>
                  <button onClick={changePassword} disabled={saving} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium rounded-lg transition-colors">
                    {saving ? 'Changing...' : 'Change Password'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function AccountPageWrapper() {
  const router = useRouter();
  const { storeSlug } = router.query as { storeSlug: string };
  if (!storeSlug) return null;

  return (
    <StoreLayout storeSlug={storeSlug}>
      <AccountPage />
    </StoreLayout>
  );
}
