import { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import { withPermission } from '../../utils/withPermission';

type Severity = 'critical' | 'warning' | 'info' | 'passed';

interface ScanResult {
  id: number;
  check: string;
  category: string;
  severity: Severity;
  description: string;
  affected_count: number;
  last_checked: string;
}

const MOCK_RESULTS: ScanResult[] = [
  { id: 1, check: 'Orphaned Records', category: 'Data Integrity', severity: 'warning', description: '12 shipments reference deleted companies', affected_count: 12, last_checked: '2026-02-26T08:00:00Z' },
  { id: 2, check: 'Permission Anomalies', category: 'Security', severity: 'critical', description: '3 users have elevated permissions without proper role assignment', affected_count: 3, last_checked: '2026-02-26T08:00:00Z' },
  { id: 3, check: 'Duplicate Entries', category: 'Data Integrity', severity: 'info', description: 'Potential duplicate supplier records detected', affected_count: 5, last_checked: '2026-02-26T08:00:00Z' },
  { id: 4, check: 'Encryption Status', category: 'Security', severity: 'passed', description: 'All sensitive fields are properly encrypted', affected_count: 0, last_checked: '2026-02-26T08:00:00Z' },
  { id: 5, check: 'Stale Sessions', category: 'Security', severity: 'warning', description: '28 sessions older than 30 days not cleaned up', affected_count: 28, last_checked: '2026-02-26T08:00:00Z' },
  { id: 6, check: 'Missing Audit Trails', category: 'Compliance', severity: 'critical', description: '7 tables missing audit log configuration', affected_count: 7, last_checked: '2026-02-26T08:00:00Z' },
  { id: 7, check: 'Data Classification', category: 'Compliance', severity: 'info', description: '45 fields unclassified in data dictionary', affected_count: 45, last_checked: '2026-02-26T08:00:00Z' },
  { id: 8, check: 'Backup Integrity', category: 'Data Integrity', severity: 'passed', description: 'All recent backups verified successfully', affected_count: 0, last_checked: '2026-02-26T08:00:00Z' },
];

function GovernanceScannerPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');

  useEffect(() => {
    const timer = setTimeout(() => { setResults(MOCK_RESULTS); setLoading(false); }, 600);
    return () => clearTimeout(timer);
  }, []);

  const handleScan = async () => {
    setScanning(true);
    try {
      await new Promise(r => setTimeout(r, 2000));
      setResults(MOCK_RESULTS.map(r => ({ ...r, last_checked: new Date().toISOString() })));
      showToast('success', t('settings.scanComplete') || 'Governance scan completed');
    } catch {
      showToast('error', t('common.error') || 'Scan failed');
    } finally {
      setScanning(false);
    }
  };

  const filtered = results.filter(r => filterSeverity === 'all' || r.severity === filterSeverity);

  const severityBadge = (severity: Severity) => {
    const styles: Record<Severity, string> = {
      critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      passed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[severity]}`}>{severity.charAt(0).toUpperCase() + severity.slice(1)}</span>;
  };

  const counts = {
    critical: results.filter(r => r.severity === 'critical').length,
    warning: results.filter(r => r.severity === 'warning').length,
    info: results.filter(r => r.severity === 'info').length,
    passed: results.filter(r => r.severity === 'passed').length,
  };

  return (
    <MainLayout>
      <Head><title>{t('settings.governanceScanner') || 'Governance Scanner'} - SLMS</title></Head>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('settings.governanceScanner') || 'Governance Scanner'}</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('settings.governanceScannerDesc') || 'Automated checks for data integrity, security gaps, and compliance issues.'}</p>
          </div>
          <button onClick={handleScan} disabled={scanning} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium flex items-center gap-2">
            {scanning && <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />}
            {scanning ? (t('settings.scanning') || 'Scanning...') : (t('settings.runScan') || 'Run Full Scan')}
          </button>
        </div>

        {loading ? (
          <div className="space-y-4">{[1,2,3,4].map(i => <div key={i} className="h-16 bg-gray-200 dark:bg-slate-700 rounded-lg animate-pulse" />)}</div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 text-center cursor-pointer hover:ring-2 ring-red-300" onClick={() => setFilterSeverity(filterSeverity === 'critical' ? 'all' : 'critical')}>
                <p className="text-2xl font-bold text-red-600">{counts.critical}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('settings.critical') || 'Critical'}</p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 text-center cursor-pointer hover:ring-2 ring-yellow-300" onClick={() => setFilterSeverity(filterSeverity === 'warning' ? 'all' : 'warning')}>
                <p className="text-2xl font-bold text-yellow-600">{counts.warning}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('settings.warnings') || 'Warnings'}</p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 text-center cursor-pointer hover:ring-2 ring-blue-300" onClick={() => setFilterSeverity(filterSeverity === 'info' ? 'all' : 'info')}>
                <p className="text-2xl font-bold text-blue-600">{counts.info}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('settings.informational') || 'Info'}</p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 text-center cursor-pointer hover:ring-2 ring-green-300" onClick={() => setFilterSeverity(filterSeverity === 'passed' ? 'all' : 'passed')}>
                <p className="text-2xl font-bold text-green-600">{counts.passed}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('settings.passed') || 'Passed'}</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">{t('settings.check') || 'Check'}</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">{t('settings.category') || 'Category'}</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-600 dark:text-gray-300">{t('settings.severity') || 'Severity'}</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">{t('common.description') || 'Description'}</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-600 dark:text-gray-300">{t('settings.affected') || 'Affected'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filtered.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-slate-750">
                      <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{r.check}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{r.category}</td>
                      <td className="px-4 py-3 text-center">{severityBadge(r.severity)}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-xs">{r.description}</td>
                      <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-300">{r.affected_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}

export default withPermission('system_policies:view', GovernanceScannerPage);
