import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Restrict sizes so Next.js never generates a 3840px image
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ["image/webp", "image/avif"],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },
  // Compress responses
  compress: true,
};

export default nextConfig;
