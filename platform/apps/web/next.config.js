/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@travel-platform/types", "@travel-platform/ui"],
};

module.exports = nextConfig;
