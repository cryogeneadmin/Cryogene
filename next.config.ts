import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
      },
    ],
  },
  async redirects() {
    return [
      // Common alternative spelling — readers expect /cart, site uses /basket.
      { source: "/cart", destination: "/basket", permanent: true },
    ];
  },
};

export default nextConfig;
