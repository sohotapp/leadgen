/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@lead-engine/ui', '@lead-engine/db', '@lead-engine/shared'],
  output: 'standalone',
};

module.exports = nextConfig;
