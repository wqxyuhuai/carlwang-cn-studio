import type { NextConfig } from "next";

const staticExport = process.env.NEXT_OUTPUT_MODE === "export";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  devIndicators: false,
  ...(staticExport ? { output: "export" as const } : {}),
  images: {
    unoptimized: true
  }
};

export default nextConfig;
