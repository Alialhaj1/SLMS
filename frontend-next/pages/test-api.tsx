/**
 * API Test Page
 */
import { useEffect, useState } from 'react';
import { apiClient } from '../lib/apiClient';

export default function TestAPI() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testUsersAPI = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Testing /api/users...');
      const response = await apiClient.get('/api/users');
      console.log('Success:', response);
      setResult(response);
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'Unknown error');
      setResult(err);
    } finally {
      setLoading(false);
    }
  };

  const testMeAPI = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Testing /api/me...');
      const response = await apiClient.get('/api/me');
      console.log('Success:', response);
      setResult(response);
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'Unknown error');
      setResult(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">🧪 API Test Page</h1>

      <div className="space-x-4">
        <button
          onClick={testMeAPI}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Test /api/me
        </button>
        <button
          onClick={testUsersAPI}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          Test /api/users
        </button>
      </div>

      {loading && <div className="text-gray-600">Loading...</div>}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Result:</h2>
          <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-auto text-sm">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded">
        <strong>Note:</strong> Open DevTools Console (F12) to see detailed logs
      </div>
    </div>
  );
}
