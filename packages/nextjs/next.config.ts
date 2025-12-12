import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  typescript: {
    ignoreBuildErrors: process.env.NEXT_PUBLIC_IGNORE_BUILD_ERROR === "true",
  },
  eslint: {
    ignoreDuringBuilds: process.env.NEXT_PUBLIC_IGNORE_BUILD_ERROR === "true",
  },
  webpack: config => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },
  // Add script loading for FHEVM relayer SDK
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.zama.org blob:",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://cdn.zama.org https://*.infura.io https://*.alchemy.com https://*.publicnode.com https://*.walletconnect.com https://*.walletconnect.org wss://*.walletconnect.com wss://*.walletconnect.org https://rpc.sepolia.org https://*.merkle.io https://*.coinbase.com wss://*.coinbase.com",
              "worker-src 'self' blob:",
              "child-src 'self' blob:",
              "frame-src 'self' https://*.walletconnect.com https://*.walletconnect.org",
            ].join('; ')
          }
        ]
      }
    ];
  },
  // Proxy WASM file to bypass CORS issues
  async rewrites() {
    return [
      {
        source: '/relayer-sdk-js/:path*',
        destination: 'https://cdn.zama.org/relayer-sdk-js/:path*',
      },
    ];
  },
};

const isIpfs = process.env.NEXT_PUBLIC_IPFS_BUILD === "true";

if (isIpfs) {
  nextConfig.output = "export";
  nextConfig.trailingSlash = true;
  nextConfig.images = {
    unoptimized: true,
  };
}

module.exports = nextConfig;
