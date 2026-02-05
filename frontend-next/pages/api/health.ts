import type { NextApiRequest, NextApiResponse } from 'next';

interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  service: string;
  version: string;
  timestamp: string;
  uptime: number;
  checks: {
    name: string;
    status: 'pass' | 'fail';
    message?: string;
  }[];
}

// Track server start time
const startTime = Date.now();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthResponse>
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const checks: HealthResponse['checks'] = [];

  // Check 1: Server is responding (always passes if we reach here)
  checks.push({
    name: 'server',
    status: 'pass',
    message: 'Next.js server is running',
  });

  // Check 2: Memory usage
  const memoryUsage = process.memoryUsage();
  const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
  const rssMB = Math.round(memoryUsage.rss / 1024 / 1024);
  // Alert if RSS > 512MB (reasonable for Next.js in production)
  const memoryHealthy = rssMB < 512;

  checks.push({
    name: 'memory',
    status: memoryHealthy ? 'pass' : 'fail',
    message: `RSS: ${rssMB}MB, Heap: ${heapUsedMB}MB / ${heapTotalMB}MB`,
  });

  // Check 3: Backend API reachability (optional, non-blocking)
  try {
    // Use Docker internal hostname for server-side checks
    const backendUrl = process.env.BACKEND_INTERNAL_URL || 'http://backend:4000/api';
    const backendHealth = await fetch(`${backendUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000), // 3 second timeout
    });
    
    checks.push({
      name: 'backend_api',
      status: backendHealth.ok ? 'pass' : 'fail',
      message: backendHealth.ok ? 'Backend API reachable' : `Backend returned ${backendHealth.status}`,
    });
  } catch (error) {
    checks.push({
      name: 'backend_api',
      status: 'fail',
      message: 'Backend API unreachable',
    });
  }

  // Determine overall health
  const allPassed = checks.every((c) => c.status === 'pass');
  const criticalPassed = checks
    .filter((c) => c.name === 'server' || c.name === 'memory')
    .every((c) => c.status === 'pass');

  const response: HealthResponse = {
    status: criticalPassed ? 'healthy' : 'unhealthy',
    service: 'slms-frontend',
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: Math.round((Date.now() - startTime) / 1000),
    checks,
  };

  // Return 200 if healthy, 503 if unhealthy
  const statusCode = criticalPassed ? 200 : 503;
  
  // Set cache headers to prevent caching health checks
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  return res.status(statusCode).json(response);
}
