/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['three'],
  experimental: {
    optimizePackageImports: ['d3', '@react-three/fiber', '@react-three/drei'],
  },
};

module.exports = nextConfig;
