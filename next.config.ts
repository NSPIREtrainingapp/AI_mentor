import type { NextConfig } from "next";

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development'
});

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath: '/AI_mentor',
  assetPrefix: '/AI_mentor/',
  images: {
    unoptimized: true
  },
  eslint: {
    dirs: ['src']
  },
  typescript: {
    ignoreBuildErrors: false
  },
  turbopack: {
    root: __dirname
  }
};

export default withPWA(nextConfig);
