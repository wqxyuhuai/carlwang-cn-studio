import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  devIndicators: false,
  images: {
    contentDispositionType: "inline",
    formats: ["image/webp"],
    minimumCacheTTL: 31_536_000,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "carlwang-cn-studio.oss-cn-shanghai.aliyuncs.com",
        pathname: "/uploads/**"
      }
    ]
  }
};

export default nextConfig;
