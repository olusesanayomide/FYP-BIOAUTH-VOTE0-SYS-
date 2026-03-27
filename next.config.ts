import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@simplewebauthn/browser'],
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        // Proxy to backend
        destination: 'http://localhost:3001/:path*',
      },
    ];
  },
};

export default nextConfig;
