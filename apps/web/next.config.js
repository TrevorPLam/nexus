/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@life-os/ui', '@life-os/contracts', '@life-os/api-client'],
};

module.exports = nextConfig;
