import { GetServerSideProps } from 'next';
import Head from 'next/head';

interface HealthPageProps {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  backendStatus: 'up' | 'down';
}

export default function HealthPage({ status, timestamp, backendStatus }: HealthPageProps) {
  const isHealthy = status === 'healthy';
  
  return (
    <>
      <Head>
        <title>System Health - SLMS</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        backgroundColor: isHealthy ? '#f0fdf4' : '#fef2f2',
      }}>
        <div style={{
          textAlign: 'center',
          padding: '2rem',
          borderRadius: '1rem',
          backgroundColor: 'white',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          maxWidth: '400px',
          width: '90%',
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: isHealthy ? '#22c55e' : '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
          }}>
            <span style={{ fontSize: '2.5rem' }}>
              {isHealthy ? '✓' : '✗'}
            </span>
          </div>
          
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: isHealthy ? '#166534' : '#991b1b',
            marginBottom: '0.5rem',
          }}>
            {isHealthy ? 'All Systems Operational' : 'System Issues Detected'}
          </h1>
          
          <p style={{
            color: '#6b7280',
            marginBottom: '1.5rem',
          }}>
            Smart Logistics Management System
          </p>
          
          <div style={{
            display: 'grid',
            gap: '0.75rem',
            textAlign: 'left',
            padding: '1rem',
            backgroundColor: '#f9fafb',
            borderRadius: '0.5rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6b7280' }}>Frontend</span>
              <span style={{ 
                color: '#22c55e',
                fontWeight: '600',
              }}>● Online</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6b7280' }}>Backend API</span>
              <span style={{ 
                color: backendStatus === 'up' ? '#22c55e' : '#ef4444',
                fontWeight: '600',
              }}>● {backendStatus === 'up' ? 'Online' : 'Offline'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6b7280' }}>Last Check</span>
              <span style={{ color: '#374151', fontWeight: '500' }}>
                {new Date(timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>
          
          <p style={{
            marginTop: '1.5rem',
            fontSize: '0.875rem',
            color: '#9ca3af',
          }}>
            alhajco.com
          </p>
        </div>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<HealthPageProps> = async () => {
  let backendStatus: 'up' | 'down' = 'down';
  
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
    const response = await fetch(`${backendUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });
    backendStatus = response.ok ? 'up' : 'down';
  } catch {
    backendStatus = 'down';
  }

  return {
    props: {
      status: backendStatus === 'up' ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      backendStatus,
    },
  };
};
