/**
 * Test Page - Debug Users & Roles Access
 */
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';
import MainLayout from '../components/layout/MainLayout';
import Card from '../components/ui/Card';

export default function TestPage() {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();

  const testPermissions = [
    'users:view',
    'users:create',
    'users:edit',
    'users:delete',
    'roles:view',
    'roles:create',
    'roles:edit',
    'roles:delete',
    'companies:view',
    'branches:view',
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        <Card>
          <h1 className="text-2xl font-bold mb-4">Permission Test Page</h1>
          
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold mb-2">User Info:</h2>
              <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded overflow-auto">
                {JSON.stringify(user, null, 2)}
              </pre>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-2">Permission Checks:</h2>
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left">Permission</th>
                    <th className="px-4 py-2 text-left">Has Access</th>
                  </tr>
                </thead>
                <tbody>
                  {testPermissions.map((perm) => (
                    <tr key={perm}>
                      <td className="px-4 py-2">{perm}</td>
                      <td className="px-4 py-2">
                        <span className={hasPermission(perm as any) ? 'text-green-600' : 'text-red-600'}>
                          {hasPermission(perm as any) ? '✓ YES' : '✗ NO'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-2">Quick Links:</h2>
              <div className="space-x-4">
                <a href="/admin/users" className="text-blue-600 underline">Go to Users Page</a>
                <a href="/admin/roles" className="text-blue-600 underline">Go to Roles Page</a>
                <a href="/admin/login-history" className="text-blue-600 underline">Go to Login History</a>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
