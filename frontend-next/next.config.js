/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  typescript: {
    // Skip type checking during build (for faster deployment)
    ignoreBuildErrors: true,
  },
  eslint: {
    // Skip linting during build
    ignoreDuringBuilds: true,
  },
  
  // API proxy - rewrites /api/* requests to the backend server
  async rewrites() {
    // Backend URL - use environment variable or default to localhost:4000
    const backendUrl = process.env.INTERNAL_API_URL || 'http://backend:4000';
    
    return [
      {
        // Proxy all /api/* requests to the backend
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      {
        // Proxy /uploads/* requests to the backend (logos, attachments, etc.)
        source: '/uploads/:path*',
        destination: `${backendUrl}/uploads/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
