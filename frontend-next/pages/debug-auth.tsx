/**
 * Debug Page - Show User and Permissions
 */
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';
import { useEffect, useState } from 'react';

export default function DebugAuth() {
  const { user, loading } = useAuth();
  const { hasPermission, userPermissions } = usePermissions();
  const [tokenData, setTokenData] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        // Decode JWT (just for debugging - not secure!)
        const parts = token.split('.');
        const payload = JSON.parse(atob(parts[1]));
        setTokenData(payload);
      } catch (e) {
        setTokenData({ error: 'Invalid token format' });
      }
    }
  }, []);

  const testPermissions = [
    'users:view',
    'roles:view',
    'companies:view',
    'branches:view',
  ];

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">🔍 Debug Authentication & Permissions</h1>

      {/* User Info from useAuth */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">1️⃣ User from useAuth():</h2>
        <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-auto text-sm">
          {JSON.stringify(user, null, 2)}
        </pre>
      </div>

      {/* JWT Token Payload */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">2️⃣ JWT Token Payload (Raw):</h2>
        <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-auto text-sm">
          {JSON.stringify(tokenData, null, 2)}
        </pre>
      </div>

      {/* Permissions Array */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">3️⃣ User Permissions Array:</h2>
        <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-auto text-sm">
          {JSON.stringify(userPermissions, null, 2)}
        </pre>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Total: {userPermissions.length} permissions
        </p>
      </div>

      {/* Permission Tests */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">4️⃣ Permission Tests:</h2>
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead>
            <tr>
              <th className="px-4 py-2 text-left text-sm font-medium">Permission</th>
              <th className="px-4 py-2 text-left text-sm font-medium">Has Access?</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {testPermissions.map((perm) => (
              <tr key={perm}>
                <td className="px-4 py-2 text-sm font-mono">{perm}</td>
                <td className="px-4 py-2 text-sm">
                  {hasPermission(perm as any) ? (
                    <span className="text-green-600 font-bold">✅ YES</span>
                  ) : (
                    <span className="text-red-600 font-bold">❌ NO</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* LocalStorage Info */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">5️⃣ LocalStorage Tokens:</h2>
        <div className="space-y-2 text-sm">
          <div>
            <strong>accessToken:</strong>{' '}
            <code className="bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded">
              {localStorage.getItem('accessToken') ? '✅ Present' : '❌ Missing'}
            </code>
          </div>
          <div>
            <strong>refreshToken:</strong>{' '}
            <code className="bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded">
              {localStorage.getItem('refreshToken') ? '✅ Present' : '❌ Missing'}
            </code>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">🔧 Actions:</h2>
        <div className="space-x-4">
          <button
            onClick={() => location.href = '/admin/users'}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go to Users Page
          </button>
          <button
            onClick={() => location.href = '/admin/roles'}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Go to Roles Page
          </button>
          <button
            onClick={() => {
              localStorage.clear();
              location.href = '/';
            }}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Logout & Clear Storage
          </button>
        </div>
      </div>
    </div>
  );
}
