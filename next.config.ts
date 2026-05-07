import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizeCss: true,
  },
  images: {
    formats: ["image/webp"],
    minimumCacheTTL: 31536000,
  },
  compress: true,
};

export default nextConfig;
